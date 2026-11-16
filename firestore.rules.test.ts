/**
 * Verification specification for firestore.rules ("Dirty Dozen" security payloads).
 * Intended to be executed against the Firebase Emulator Suite when running rule unit tests.
 */
export interface DirtyDozenCase {
  id: string;
  description: string;
  operation: 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  docId: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    description: 'Unauthenticated create is denied',
    operation: 'create',
    authUid: null,
    emailVerified: false,
    docId: 'res_001',
    payload: { titulo: 'Apunte', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Unverified email create is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: false,
    docId: 'res_002',
    payload: { authorUid: 'user_a', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Identity spoofing (authorUid mismatch) is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_003',
    payload: { authorUid: 'user_b', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'Shadow field injection (isAdmin / email) is denied by hasOnly',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_004',
    payload: { authorUid: 'user_a', isPublic: true, isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Poisoned document ID with invalid characters is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'invalid$id!',
    payload: { authorUid: 'user_a', isPublic: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Private flag bypass (isPublic: false) is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_006',
    payload: { authorUid: 'user_a', isPublic: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Client-spoofed timestamp (not request.time) is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_007',
    payload: { authorUid: 'user_a', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'JavaScript URI scheme in enlaceUrl is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_008',
    payload: { authorUid: 'user_a', enlaceUrl: 'javascript:alert(1)' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Oversized contenido (> 15000 chars) is denied',
    operation: 'create',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_009',
    payload: { authorUid: 'user_a', contenido: 'x'.repeat(15001) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'Cross-user update is denied',
    operation: 'update',
    authUid: 'user_b',
    emailVerified: true,
    docId: 'res_owned_by_a',
    payload: { titulo: 'Hijacked' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Immutable authorUid mutation on update is denied',
    operation: 'update',
    authUid: 'user_a',
    emailVerified: true,
    docId: 'res_owned_by_a',
    payload: { authorUid: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Cross-user delete is denied',
    operation: 'delete',
    authUid: 'user_b',
    emailVerified: true,
    docId: 'res_owned_by_a',
    expected: 'PERMISSION_DENIED',
  },
];
