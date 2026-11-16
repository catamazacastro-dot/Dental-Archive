# Security Spec — Biblioteca Compartida (`shared_resources`)

## 1. Data Invariants
1. **Privacidad estricta (Zero PII & Local-Only Personal Data)**:
   - Todos los datos personales (progreso de correlativas, calendario, tareas, Pomodoro, apuntes privados, historias clínicas, seguimiento clínico, historial de repaso y playlists guardadas) permanecen exclusivamente en el navegador local (`localStorage`).
   - En Firestore únicamente existe `/shared_resources/{resourceId}` para publicaciones voluntarias. Nunca se almacenan correos electrónicos, teléfonos, DNIs ni identificadores personales de pacientes.
2. **Integridad de Autoría**:
   - Todo recurso publicado debe tener `authorUid == request.auth.uid`, correo verificado (`request.auth.token.email_verified == true`) y `isPublic == true`.
   - Solo el autor (`existing().authorUid == request.auth.uid`) puede editar o eliminar su publicación.
3. **Integridad Temporal y Estructural**:
   - `createdAt` y `updatedAt` deben ser validados contra `request.time`. `createdAt` y `authorUid` son inmutables tras la creación.
   - Claves estrictas con `hasAll` y `hasOnly` para bloquear campos fantasma y límites `.size()` en cada string y lista.

## 2. The "Dirty Dozen" Payloads (Rejected with PERMISSION_DENIED)
1. **Unauthenticated Create**: Usuario sin sesión intenta crear en `/shared_resources/res_01`.
2. **Unverified Email Create**: Usuario con `email_verified: false` intenta crear un recurso.
3. **Identity Spoofing (authorUid ajeno)**: Usuario A intenta crear con `authorUid: "user_B"`.
4. **Shadow / Ghost Field Injection**: Payload válido con campo extra `isAdmin: true` o `email: "leak@test.com"`.
5. **Poisoned Document ID**: Creación en `/shared_resources/invalid$id!` o ID mayor a 128 chars.
6. **Non-Public / Private Flag Bypass**: Intentar crear con `isPublic: false` para ocultar registros privados.
7. **Client Timestamp Tampering**: Enviar `createdAt` con fecha falsa en lugar de `serverTimestamp()`.
8. **XSS / Invalid URL Scheme**: Enviar `enlaceUrl: "javascript:alert(1)"`.
9. **Oversized Payload (Denial of Wallet)**: Enviar `contenido` > 15000 caracteres o `etiquetas` > 10 elementos.
10. **Cross-User Update**: Usuario B intenta modificar un recurso cuyo `authorUid` pertenece a Usuario A.
11. **Immutable Field Mutation**: Autor intenta cambiar `authorUid` o `createdAt` en un `update`.
12. **Cross-User Delete**: Usuario B intenta borrar un recurso publicado por Usuario A.
