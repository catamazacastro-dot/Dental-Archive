import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AvisoCategoria, AvisoGlobal, SharedResourceItem } from '../types/dental';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function signInWithGoogleForSharing(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function signOutSharing(): Promise<void> {
  await signOut(auth);
}

const COLLECTION_NAME = 'shared_resources';

function timestampToMs(val: unknown): number {
  if (val && typeof val === 'object' && 'toMillis' in val) {
    return (val as Timestamp).toMillis();
  }
  return Date.now();
}

export function subscribeSharedResources(
  onData: (items: SharedResourceItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('isPublic', '==', true),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SharedResourceItem[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          authorUid: String(raw.authorUid || ''),
          authorAlias: String(raw.authorAlias || 'Estudiante'),
          isPublic: Boolean(raw.isPublic),
          tipoRecurso:
            raw.tipoRecurso === 'flashcard' || raw.tipoRecurso === 'pregunta'
              ? raw.tipoRecurso
              : 'documento',
          categoria: (raw.categoria as SharedResourceItem['categoria']) || 'apuntes',
          anio: Number(raw.anio) || 1,
          materia: String(raw.materia || ''),
          titulo: String(raw.titulo || ''),
          contenido: String(raw.contenido || ''),
          etiquetas: Array.isArray(raw.etiquetas)
            ? raw.etiquetas.map((t) => String(t))
            : [],
          autorFuente: String(raw.autorFuente || ''),
          isbnDoi: String(raw.isbnDoi || ''),
          enlaceUrl: String(raw.enlaceUrl || ''),
          flashcardFrente: String(raw.flashcardFrente || ''),
          preguntaOpciones: Array.isArray(raw.preguntaOpciones)
            ? raw.preguntaOpciones.map((o) => String(o))
            : [],
          preguntaCorrecta: Number(raw.preguntaCorrecta) || 0,
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        };
      });

      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface PublishSharedPayload {
  authorAlias: string;
  tipoRecurso: 'documento' | 'flashcard' | 'pregunta';
  categoria: SharedResourceItem['categoria'];
  anio: number;
  materia: string;
  titulo: string;
  contenido: string;
  etiquetas: string[];
  autorFuente?: string;
  isbnDoi?: string;
  enlaceUrl?: string;
  flashcardFrente?: string;
  preguntaOpciones?: string[];
  preguntaCorrecta?: number;
}

function sanitizeHttpUrl(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean.slice(0, 500);
  return '';
}

export async function publishSharedResource(
  payload: PublishSharedPayload
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Iniciá sesión con Google para publicar en la Biblioteca Compartida.');
  }

  const docId = `sr_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const path = `${COLLECTION_NAME}/${docId}`;

  const cleanEtiquetas = payload.etiquetas
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);

  const cleanOpciones = (payload.preguntaOpciones || [])
    .map((o) => o.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 6);

  const safeAnio = Math.min(5, Math.max(1, Math.round(payload.anio || 1)));
  const safeCorrecta = Math.min(5, Math.max(0, Math.round(payload.preguntaCorrecta || 0)));

  const docData = {
    authorUid: user.uid,
    authorAlias: (payload.authorAlias.trim() || 'Estudiante').slice(0, 60),
    isPublic: true,
    tipoRecurso: payload.tipoRecurso,
    categoria: payload.categoria,
    anio: safeAnio,
    materia: (payload.materia.trim() || 'Odontología General').slice(0, 140),
    titulo: (payload.titulo.trim() || 'Recurso compartido').slice(0, 200),
    contenido: payload.contenido.trim().slice(0, 15000),
    etiquetas: cleanEtiquetas,
    autorFuente: (payload.autorFuente || '').trim().slice(0, 200),
    isbnDoi: (payload.isbnDoi || '').trim().slice(0, 100),
    enlaceUrl: sanitizeHttpUrl(payload.enlaceUrl),
    flashcardFrente: (payload.flashcardFrente || '').trim().slice(0, 1000),
    preguntaOpciones: cleanOpciones,
    preguntaCorrecta: safeCorrecta,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, docId), docData);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSharedResource(resourceId: string): Promise<void> {
  const path = `${COLLECTION_NAME}/${resourceId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, resourceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Avisos Globales & Notificaciones (Administración + Lectura en tiempo real)
// ============================================================================

export const ADMIN_EMAIL = 'catamazacastro@gmail.com';
const AVISOS_COLLECTION = 'avisos';

export function isAdminUser(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email &&
      user.email.toLowerCase() === ADMIN_EMAIL
  );
}

export function subscribeAvisos(
  onData: (items: AvisoGlobal[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, AVISOS_COLLECTION),
    where('isPublic', '==', true),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AvisoGlobal[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cat = raw.categoria;
        const safeCat: AvisoCategoria =
          cat === 'importante' || cat === 'examen' || cat === 'recordatorio'
            ? cat
            : 'aviso';
        return {
          id: d.id,
          authorUid: String(raw.authorUid || ''),
          isPublic: Boolean(raw.isPublic),
          activo: Boolean(raw.activo),
          titulo: String(raw.titulo || ''),
          mensaje: String(raw.mensaje || ''),
          categoria: safeCat,
          revision: Number(raw.revision) || 1,
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        };
      });

      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, AVISOS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface AvisoPayload {
  titulo: string;
  mensaje: string;
  categoria: AvisoCategoria;
  activo?: boolean;
}

export async function createGlobalAviso(payload: AvisoPayload): Promise<string> {
  const user = auth.currentUser;
  if (!isAdminUser(user)) {
    throw new Error('Iniciá sesión con la cuenta administradora para publicar avisos globales.');
  }

  const docId = `av_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const path = `${AVISOS_COLLECTION}/${docId}`;

  const docData = {
    authorUid: user!.uid,
    isPublic: true,
    activo: payload.activo ?? true,
    titulo: (payload.titulo.trim() || 'Aviso académico').slice(0, 140),
    mensaje: (payload.mensaje.trim() || 'Revisá las novedades de la cátedra.').slice(0, 2000),
    categoria: payload.categoria,
    revision: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, AVISOS_COLLECTION, docId), docData);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGlobalAviso(
  avisoId: string,
  payload: AvisoPayload & { nextRevision: number }
): Promise<void> {
  const user = auth.currentUser;
  if (!isAdminUser(user)) {
    throw new Error('Iniciá sesión con la cuenta administradora para modificar avisos.');
  }

  const path = `${AVISOS_COLLECTION}/${avisoId}`;
  try {
    await updateDoc(doc(db, AVISOS_COLLECTION, avisoId), {
      activo: payload.activo ?? true,
      titulo: (payload.titulo.trim() || 'Aviso académico').slice(0, 140),
      mensaje: (payload.mensaje.trim() || 'Aviso actualizado.').slice(0, 2000),
      categoria: payload.categoria,
      revision: Math.max(1, Math.min(100000, Math.round(payload.nextRevision))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGlobalAviso(avisoId: string): Promise<void> {
  const user = auth.currentUser;
  if (!isAdminUser(user)) {
    throw new Error('Iniciá sesión con la cuenta administradora para eliminar avisos.');
  }

  const path = `${AVISOS_COLLECTION}/${avisoId}`;
  try {
    await deleteDoc(doc(db, AVISOS_COLLECTION, avisoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
