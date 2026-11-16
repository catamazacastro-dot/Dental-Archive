import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  BiblioMateriaNode,
  BiblioRecurso,
  RecursoTipo,
} from '../types/dental.ts';

export interface PersistentLibraryDB {
  tree: BiblioMateriaNode[];
  resources: BiblioRecurso[];
  fileMap: Record<string, string>; // resourceId -> relative filename inside uploads dir
  updatedAt: string;
}

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
const DB_FILE = path.join(STORAGE_ROOT, 'biblio-db.json');

function ensureStorageDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readDBSync(): PersistentLibraryDB {
  ensureStorageDirs();
  if (!fs.existsSync(DB_FILE)) {
    const empty: PersistentLibraryDB = {
      tree: [],
      resources: [],
      fileMap: {},
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistentLibraryDB>;
    return {
      tree: Array.isArray(parsed.tree) ? parsed.tree : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      fileMap:
        parsed.fileMap && typeof parsed.fileMap === 'object' ? parsed.fileMap : {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      tree: [],
      resources: [],
      fileMap: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

function writeDBAtomicSync(db: PersistentLibraryDB): void {
  ensureStorageDirs();
  const payload: PersistentLibraryDB = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 7)}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Serialized write lock so concurrent bulk uploads never race on DB writes
let writeQueue: Promise<unknown> = Promise.resolve();

export function withLibraryDbLock<T>(
  task: (db: PersistentLibraryDB) => T | Promise<T>
): Promise<T> {
  const run = writeQueue.then(async () => {
    const current = readDBSync();
    return task(current);
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export function getLibraryPublicState(): {
  tree: BiblioMateriaNode[];
  resources: BiblioRecurso[];
  updatedAt: string;
} {
  const db = readDBSync();
  return {
    tree: db.tree,
    resources: db.resources,
    updatedAt: db.updatedAt,
  };
}

export function saveLibraryState(input: {
  tree?: BiblioMateriaNode[];
  resources?: BiblioRecurso[];
}): Promise<{ tree: BiblioMateriaNode[]; resources: BiblioRecurso[] }> {
  return withLibraryDbLock((db) => {
    if (Array.isArray(input.tree)) {
      db.tree = input.tree;
    }
    if (Array.isArray(input.resources)) {
      db.resources = input.resources;
    }
    writeDBAtomicSync(db);
    return { tree: db.tree, resources: db.resources };
  });
}

export function findDuplicatesByHashes(hashes: string[]): Array<{
  sha256: string;
  existingId: string;
  existingTitle: string;
  materiaId: string;
}> {
  const db = readDBSync();
  const byHash = new Map<string, BiblioRecurso>();
  for (const res of db.resources) {
    if (res.sha256 && !byHash.has(res.sha256)) {
      byHash.set(res.sha256, res);
    }
  }
  const results: Array<{
    sha256: string;
    existingId: string;
    existingTitle: string;
    materiaId: string;
  }> = [];

  for (const h of hashes) {
    const clean = (h || '').trim().toLowerCase();
    const match = byHash.get(clean);
    if (match) {
      results.push({
        sha256: clean,
        existingId: match.id,
        existingTitle: match.titulo,
        materiaId: match.materiaId,
      });
    }
  }
  return results;
}

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveOrCreateHierarchy(
  db: PersistentLibraryDB,
  opts: {
    materiaId?: string;
    materiaNombre?: string;
    anio?: number;
    unidadId?: string;
    unidadTitulo?: string;
    temaId?: string;
    temaTitulo?: string;
  }
): { materiaId: string; unidadId: string; temaId: string } {
  const safeAnio = ([1, 2, 3, 4, 5].includes(Number(opts.anio))
    ? Number(opts.anio)
    : 1) as 1 | 2 | 3 | 4 | 5;

  // 1. Materia
  let materia = opts.materiaId
    ? db.tree.find((m) => m.id === opts.materiaId)
    : undefined;

  if (!materia && opts.materiaNombre) {
    const targetNorm = normalizeName(opts.materiaNombre);
    materia = db.tree.find((m) => normalizeName(m.nombre) === targetNorm);
  }

  if (!materia) {
    const accCycle: Array<'bordo' | 'salvia' | 'rosa'> = ['bordo', 'salvia', 'rosa'];
    const baseId = `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    materia = {
      id:
        opts.materiaId && /^[a-zA-Z0-9_-]{3,80}$/.test(opts.materiaId)
          ? opts.materiaId
          : `bm-${baseId}`,
      nombre: (opts.materiaNombre || 'General').trim().slice(0, 140),
      anio: safeAnio,
      orden: db.tree.length + 1,
      descripcion: `${safeAnio}° Año`,
      acento: accCycle[db.tree.length % accCycle.length],
      unidades: [],
    };
    db.tree.push(materia);
  }

  // 2. Unidad
  let unidad = opts.unidadId
    ? materia.unidades.find((u) => u.id === opts.unidadId)
    : undefined;

  if (!unidad && opts.unidadTitulo) {
    const targetNorm = normalizeName(opts.unidadTitulo);
    unidad = materia.unidades.find((u) => normalizeName(u.titulo) === targetNorm);
  }

  if (!unidad) {
    const baseId = `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    unidad = {
      id:
        opts.unidadId && /^[a-zA-Z0-9_-]{3,80}$/.test(opts.unidadId)
          ? opts.unidadId
          : `bu-${baseId}`,
      titulo: (
        opts.unidadTitulo || `Unidad ${materia.unidades.length + 1} · Materiales`
      )
        .trim()
        .slice(0, 160),
      orden: materia.unidades.length + 1,
      temas: [],
    };
    materia.unidades.push(unidad);
  }

  // 3. Tema
  let tema = opts.temaId
    ? unidad.temas.find((t) => t.id === opts.temaId)
    : undefined;

  if (!tema && opts.temaTitulo) {
    const targetNorm = normalizeName(opts.temaTitulo);
    tema = unidad.temas.find((t) => normalizeName(t.titulo) === targetNorm);
  }

  if (!tema) {
    const baseId = `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    tema = {
      id:
        opts.temaId && /^[a-zA-Z0-9_-]{3,80}$/.test(opts.temaId)
          ? opts.temaId
          : `bt-${baseId}`,
      titulo: (opts.temaTitulo || 'Documentos importados').trim().slice(0, 160),
      orden: unidad.temas.length + 1,
    };
    unidad.temas.push(tema);
  }

  return {
    materiaId: materia.id,
    unidadId: unidad.id,
    temaId: tema.id,
  };
}

export async function persistUploadedFile(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  titulo: string;
  tipo: RecursoTipo;
  materiaId?: string;
  materiaNombre?: string;
  anio?: number;
  unidadId?: string;
  unidadTitulo?: string;
  temaId?: string;
  temaTitulo?: string;
  relativePath?: string;
  descripcion?: string;
  etiquetas?: string[];
  allowDuplicate?: boolean;
}): Promise<
  | {
      status: 'created';
      resource: BiblioRecurso;
      tree: BiblioMateriaNode[];
    }
  | {
      status: 'duplicate';
      existingId: string;
      existingTitle: string;
      sha256: string;
    }
> {
  const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');

  return withLibraryDbLock((db) => {
    if (!params.allowDuplicate) {
      const dup = db.resources.find((r) => r.sha256 === sha256);
      if (dup) {
        return {
          status: 'duplicate' as const,
          existingId: dup.id,
          existingTitle: dup.titulo,
          sha256,
        };
      }
    }

    const ids = resolveOrCreateHierarchy(db, {
      materiaId: params.materiaId,
      materiaNombre: params.materiaNombre,
      anio: params.anio,
      unidadId: params.unidadId,
      unidadTitulo: params.unidadTitulo,
      temaId: params.temaId,
      temaTitulo: params.temaTitulo,
    });

    const resourceId = `br-${Date.now().toString(36)}_${crypto
      .randomBytes(4)
      .toString('hex')}`;
    const ext = path
      .extname(params.originalName || '')
      .replace(/[^a-zA-Z0-9.]/g, '')
      .slice(0, 12);
    const storedFileName = `${resourceId}${ext || '.bin'}`;
    const diskPath = path.join(UPLOADS_DIR, storedFileName);

    fs.writeFileSync(diskPath, params.buffer);

    let extractedText: string | undefined;
    if (
      params.mimeType.startsWith('text/') ||
      /\.(txt|md)$/i.test(params.originalName)
    ) {
      extractedText = params.buffer.toString('utf-8').slice(0, 100000);
    }

    const today = new Date().toISOString().slice(0, 10);
    const sameTemaCount = db.resources.filter(
      (r) => r.temaId === ids.temaId
    ).length;

    const resource: BiblioRecurso = {
      id: resourceId,
      materiaId: ids.materiaId,
      unidadId: ids.unidadId,
      temaId: ids.temaId,
      tipo: params.tipo,
      titulo: (params.titulo || params.originalName || 'Documento')
        .trim()
        .slice(0, 220),
      descripcion: params.descripcion?.trim() || undefined,
      contenido: extractedText,
      etiquetas: (params.etiquetas || []).slice(0, 10),
      favorito: false,
      orden: sameTemaCount + 1,
      archivoNombre: params.originalName,
      archivoMime: params.mimeType || 'application/octet-stream',
      archivoSize: params.buffer.byteLength,
      serverFileUrl: `/api/library/files/${resourceId}`,
      storageBackend: 'server',
      sha256,
      relativePath: params.relativePath || undefined,
      createdAt: today,
      updatedAt: today,
    };

    db.resources.unshift(resource);
    db.fileMap[resourceId] = storedFileName;
    writeDBAtomicSync(db);

    return {
      status: 'created' as const,
      resource,
      tree: db.tree,
    };
  });
}

export function updatePersistedResource(
  resourceId: string,
  patch: Partial<BiblioRecurso>
): Promise<BiblioRecurso | null> {
  return withLibraryDbLock((db) => {
    const idx = db.resources.findIndex((r) => r.id === resourceId);
    if (idx < 0) return null;
    const updated: BiblioRecurso = {
      ...db.resources[idx],
      ...patch,
      id: db.resources[idx].id,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    db.resources[idx] = updated;
    writeDBAtomicSync(db);
    return updated;
  });
}

export function deletePersistedResource(resourceId: string): Promise<boolean> {
  return withLibraryDbLock((db) => {
    const existed = db.resources.some((r) => r.id === resourceId);
    db.resources = db.resources.filter((r) => r.id !== resourceId);
    const storedName = db.fileMap[resourceId];
    if (storedName) {
      const targetPath = path.resolve(UPLOADS_DIR, storedName);
      if (targetPath.startsWith(UPLOADS_DIR) && fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // Ignore file removal error
        }
      }
      delete db.fileMap[resourceId];
    }
    writeDBAtomicSync(db);
    return existed;
  });
}

export function resolvePersistedFile(resourceId: string): {
  diskPath: string;
  fileName: string;
  mimeType: string;
} | null {
  const db = readDBSync();
  const storedName = db.fileMap[resourceId];
  if (!storedName) return null;
  const resolved = path.resolve(UPLOADS_DIR, storedName);
  if (!resolved.startsWith(UPLOADS_DIR) || !fs.existsSync(resolved)) {
    return null;
  }
  const res = db.resources.find((r) => r.id === resourceId);
  return {
    diskPath: resolved,
    fileName: res?.archivoNombre || storedName,
    mimeType: res?.archivoMime || 'application/octet-stream',
  };
}
