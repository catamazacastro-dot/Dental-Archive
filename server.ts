import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import multer from 'multer';
import {
  deletePersistedResource,
  findDuplicatesByHashes,
  getLibraryPublicState,
  persistUploadedFile,
  resolvePersistedFile,
  saveLibraryState,
  updatePersistedResource,
} from './src/server/libraryStore.ts';
import type { RecursoTipo } from './src/types/dental.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface NotebookSourcePayload {
  titulo: string;
  contenido: string;
}

interface ChatRequestBody {
  messages?: ChatTurn[];
  materia?: string;
  notebookTitle?: string;
  fuentes?: NotebookSourcePayload[];
  contextoResumen?: string;
}

const SYSTEM_INSTRUCTION = `Sos Notebook IA, un tutor y cuaderno de estudio académico especializado en Odontología y Ciencias de la Salud (plan de estudios universitario, como UNLP FOLP).
Respondés siempre en español claro, preciso y estructurado, adaptado a estudiantes de Odontología.
Ayudás a:
- Analizar y sintetizar las fuentes que el estudiante cargó en su cuaderno (resúmenes, apuntes, guías).
- Explicar anatomía, fisiología, histología, microbiología, farmacología, patología bucal, periodoncia, endodoncia, operatoria, odontología preventiva y social, y bioseguridad.
- Redactar guías de estudio, cuadros comparativos, glosarios de conceptos clave, reglas mnemotécnicas y preguntas de práctica tipo parcial/final.
- Orientar dudas sobre índices odontológicos (como O'Leary o CPOD).

Reglas importantes:
- Cuando el cuaderno tenga fuentes cargadas, usalas como base principal y citá entre corchetes la fuente correspondiente cuando sea útil (por ejemplo: [Fuente: Título]).
- Si el estudiante pregunta algo que no aparece en las fuentes cargadas, aclaralo brevemente y luego respondé con rigor académico odontológico.
- Cuando se trate de manejo de pacientes reales, recordá brevemente que tu respuesta es de apoyo educativo y no reemplaza la indicación o supervisión docente/clínica.
- Mantené respuestas bien estructuradas, usando subtítulos, tablas o viñetas cuando faciliten el estudio.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB por archivo
    },
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // =========================================================================
  // Biblioteca de Apuntes — Almacenamiento Persistente y Carga Masiva
  // =========================================================================
  app.get('/api/library/state', (_req: Request, res: Response) => {
    try {
      res.json(getLibraryPublicState());
    } catch {
      res.status(500).json({ error: 'No se pudo leer la base de datos de la biblioteca.' });
    }
  });

  app.put('/api/library/state', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as {
        tree?: unknown;
        resources?: unknown;
      };
      const saved = await saveLibraryState({
        tree: Array.isArray(body.tree) ? body.tree : undefined,
        resources: Array.isArray(body.resources) ? body.resources : undefined,
      });
      res.json(saved);
    } catch {
      res.status(500).json({ error: 'No se pudo guardar el estado de la biblioteca.' });
    }
  });

  app.post('/api/library/check-duplicates', (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as { hashes?: unknown };
      const hashes = Array.isArray(body.hashes)
        ? body.hashes.filter((h): h is string => typeof h === 'string')
        : [];
      const duplicates = findDuplicatesByHashes(hashes);
      res.json({ duplicates });
    } catch {
      res.status(500).json({ error: 'Error verificando duplicados.' });
    }
  });

  app.post('/api/library/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        res.status(400).json({ error: 'No se recibió ningún archivo para guardar.' });
        return;
      }

      const body = (req.body || {}) as Record<string, string | undefined>;
      const rawTipo = body.tipo;
      const validTipo: RecursoTipo =
        rawTipo === 'pdf' ||
        rawTipo === 'apunte' ||
        rawTipo === 'resumen' ||
        rawTipo === 'ficha' ||
        rawTipo === 'imagen'
          ? rawTipo
          : 'pdf';

      let etiquetas: string[] = [];
      if (body.etiquetas) {
        try {
          const parsed = JSON.parse(body.etiquetas);
          if (Array.isArray(parsed)) {
            etiquetas = parsed.filter((x): x is string => typeof x === 'string');
          }
        } catch {
          etiquetas = body.etiquetas
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      const originalName = Buffer.from(file.originalname || 'documento', 'latin1').toString('utf8');
      const result = await persistUploadedFile({
        buffer: file.buffer,
        originalName: body.originalName?.trim() || originalName,
        mimeType: file.mimetype || 'application/octet-stream',
        titulo: (body.titulo || originalName).trim(),
        tipo: validTipo,
        materiaId: body.materiaId || undefined,
        materiaNombre: body.materiaNombre || undefined,
        anio: body.anio ? Number(body.anio) : undefined,
        unidadId: body.unidadId || undefined,
        unidadTitulo: body.unidadTitulo || undefined,
        temaId: body.temaId || undefined,
        temaTitulo: body.temaTitulo || undefined,
        relativePath: body.relativePath || undefined,
        descripcion: body.descripcion || undefined,
        etiquetas,
        allowDuplicate: body.allowDuplicate === 'true',
      });

      if (result.status === 'duplicate') {
        res.status(409).json({
          duplicate: true,
          existingId: result.existingId,
          existingTitle: result.existingTitle,
          sha256: result.sha256,
          error: `Archivo duplicado: ya existe como "${result.existingTitle}".`,
        });
        return;
      }

      res.status(201).json({
        resource: result.resource,
        tree: result.tree,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Error al guardar el archivo en el almacenamiento persistente.',
      });
    }
  });

  app.patch('/api/library/resources/:id', async (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
      res.status(400).json({ error: 'ID de recurso inválido.' });
      return;
    }
    try {
      const patch = (req.body || {}) as Record<string, unknown>;
      const updated = await updatePersistedResource(id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Recurso no encontrado en la base de datos.' });
        return;
      }
      res.json({ resource: updated });
    } catch {
      res.status(500).json({ error: 'No se pudo actualizar el recurso.' });
    }
  });

  app.delete('/api/library/resources/:id', async (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
      res.status(400).json({ error: 'ID de recurso inválido.' });
      return;
    }
    try {
      const deleted = await deletePersistedResource(id);
      res.json({ ok: true, deleted });
    } catch {
      res.status(500).json({ error: 'No se pudo eliminar el archivo del almacenamiento.' });
    }
  });

  app.get('/api/library/files/:id', (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(id)) {
      res.status(400).send('ID inválido.');
      return;
    }
    const resolved = resolvePersistedFile(id);
    if (!resolved) {
      res.status(404).send('Archivo no encontrado.');
      return;
    }
    const forceDownload = req.query.download === '1';
    const safeName = resolved.fileName.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', resolved.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${forceDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.sendFile(resolved.diskPath);
  });

  const decodeHtml = (raw: string): string =>
    raw
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

  app.get('/api/drive/folder/:folderId', async (req: Request, res: Response) => {
    const rawId = req.params.folderId;
    const folderId = typeof rawId === 'string' ? rawId.trim() : '';
    if (!/^[a-zA-Z0-9_-]{10,80}$/.test(folderId)) {
      res.status(400).json({ error: 'ID de carpeta de Google Drive inválido.' });
      return;
    }

    try {
      const targetUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
      const driveRes = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DentalArchive/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!driveRes.ok) {
        res.status(502).json({
          error: `No se pudo leer la carpeta de Drive (estado ${driveRes.status}).`,
        });
        return;
      }

      const html = await driveRes.text();
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const folderTitle = titleMatch ? decodeHtml(titleMatch[1]) : 'Carpeta de Drive';

      const items: Array<{
        id: string;
        title: string;
        isFolder: boolean;
        url: string;
        previewUrl: string;
        downloadUrl?: string;
      }> = [];
      const seen = new Set<string>();

      const entryRegex =
        /<div[^>]*class="flip-entry"[^>]*id="entry-([^"]+)"[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="flip-entry-title"[^>]*>([\s\S]*?)<\/div>/g;

      let match: RegExpExecArray | null = entryRegex.exec(html);
      while (match !== null) {
        const id = match[1].trim();
        const href = decodeHtml(match[2]);
        const title = decodeHtml(match[3].replace(/<[^>]+>/g, ''));

        if (id && title && !seen.has(id)) {
          seen.add(id);
          const isFolder = href.includes('/drive/folders/') || href.includes('/folders/');
          items.push({
            id,
            title,
            isFolder,
            url: isFolder
              ? `https://drive.google.com/drive/folders/${id}`
              : `https://drive.google.com/file/d/${id}/view`,
            previewUrl: isFolder
              ? `https://drive.google.com/embeddedfolderview?id=${id}#list`
              : `https://drive.google.com/file/d/${id}/preview`,
            downloadUrl: isFolder
              ? undefined
              : `https://drive.google.com/uc?export=download&id=${id}`,
          });
        }
        match = entryRegex.exec(html);
      }

      items.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.title.localeCompare(b.title, 'es');
      });

      res.json({
        folderId,
        title: folderTitle,
        items,
      });
    } catch {
      res.status(502).json({
        error: 'No se pudo conectar con Google Drive. Podés abrir la carpeta directamente en Drive.',
      });
    }
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error:
          'Falta la clave GEMINI_API_KEY en el servidor. Configurala en Settings > Secrets.',
      });
      return;
    }

    const body = (req.body || {}) as ChatRequestBody;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const cleanMessages = rawMessages
      .filter(
        (m): m is ChatTurn =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'model') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .slice(-24);

    if (cleanMessages.length === 0) {
      res.status(400).json({ error: 'Escribí una consulta para iniciar el chat.' });
      return;
    }

    let extraSystem = SYSTEM_INSTRUCTION;
    if (body.notebookTitle && typeof body.notebookTitle === 'string' && body.notebookTitle.trim()) {
      extraSystem += `\n\nCuaderno actual: "${body.notebookTitle.trim().slice(0, 140)}".`;
    }
    if (body.materia && typeof body.materia === 'string' && body.materia.trim()) {
      extraSystem += `\nAsignatura vinculada: ${body.materia.trim().slice(0, 140)}.`;
    }

    const cleanSources = Array.isArray(body.fuentes)
      ? body.fuentes
          .filter(
            (f): f is NotebookSourcePayload =>
              Boolean(f) &&
              typeof f.titulo === 'string' &&
              typeof f.contenido === 'string' &&
              f.contenido.trim().length > 0
          )
          .slice(0, 12)
      : [];

    if (cleanSources.length > 0) {
      let budget = 24000;
      const formattedSources: string[] = [];
      for (let i = 0; i < cleanSources.length && budget > 200; i += 1) {
        const src = cleanSources[i];
        const sliceLen = Math.min(src.contenido.trim().length, budget);
        const snippet = src.contenido.trim().slice(0, sliceLen);
        budget -= sliceLen;
        formattedSources.push(
          `[Fuente ${i + 1}: ${src.titulo.trim().slice(0, 140)}]\n"""\n${snippet}\n"""`
        );
      }
      extraSystem += `\n\nFUENTES ACTIVAS DEL CUADERNO:\n${formattedSources.join('\n\n')}`;
    } else if (
      body.contextoResumen &&
      typeof body.contextoResumen === 'string' &&
      body.contextoResumen.trim()
    ) {
      extraSystem += `\n\nMaterial/resumen adjunto por el estudiante como referencia:\n"""\n${body.contextoResumen
        .trim()
        .slice(0, 8000)}\n"""`;
    }

    const contents = cleanMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text.trim().slice(0, 8000) }],
    }));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: extraSystem,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          sendEvent({ text: chunk.text });
        }
      }

      sendEvent({ done: true });
      res.end();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let userMessage = 'No se pudo obtener respuesta de la IA en este momento.';
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY')) {
        userMessage =
          'Clave de API inválida o sin permisos. Verificá GEMINI_API_KEY en Settings > Secrets.';
      } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        userMessage =
          'Se alcanzó el límite temporal de consultas. Esperá unos segundos e intentá nuevamente.';
      } else if (msg.includes('404') || msg.includes('NOT_FOUND')) {
        userMessage = 'El modelo de IA configurado no está disponible actualmente.';
      }
      sendEvent({ error: userMessage });
      res.end();
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dental Archive server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
