# VYOMABOARD — SHARED FILE PERMISSIONS & ROLE MATRIX

## 1. Permission Matrix by Role & Device

| Operation | File Owner | Classroom Teacher | Classroom Student | Guest Participant | Mobile User (Any Role) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **View Shared File** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Download Canonical File** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **View Annotations** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Draw / Add Annotations** | ✅ Allowed | ✅ Allowed | ✅ Allowed (if enabled) | ❌ Denied | ❌ Denied |
| **Edit File Contents** | ✅ Allowed | ✅ Allowed | ✅ Allowed (if collaborative) | ❌ Denied | ❌ **DENIED (Read-Only Policy)** |
| **Delete / Replace File** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Export Annotated PDF** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 2. Server-Side Validation Rules
1. Every file modification request (`POST /api/files/:fileId/commit`) validates:
   * Is the user authenticated?
   * Does the user belong to the school and room owning this file?
   * If the user is a student, does the board configuration allow student edits?
2. If the user-agent or client claims a mobile device context during a mutation attempt, the backend rejects the request with `HTTP 403 Forbidden` (`error: 'Mobile devices are restricted to read-only access'`).
