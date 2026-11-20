# VYOMABOARD — DATABASE MIGRATION STRATEGY

## 1. Data Inventory Across Legacy Systems

| Source Store | Entity | Records Detected | Target Table in Supabase | Migration Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **SQLite (`backend/database.sqlite`)** | `users` | Local development accounts | `profiles`, `auth.users`, `school_memberships` | Low: extract usernames, emails, bcrypt hashes, map to default school. |
| **PostgreSQL (Legacy `vyomaboard`)** | `users` | Registered accounts | `profiles`, `auth.users` | Low: direct migration via SQL COPY / INSERT. |
| **PostgreSQL (Legacy `vyomaboard`)** | `rooms` | Active/Saved whiteboards | `boards` | Low: transform column names (`hostName` -> `name`, `hostId` -> `host_id`). |
| **PostgreSQL (Legacy `vyomaboard`)** | `yjs_documents` | Binary CRDT states | `yjs_documents` | Medium: copy `document_state BYTEA` directly; maintain room IDs. |
| **PostgreSQL (Legacy `vyomaboard`)** | `annotations` | Pen strokes JSON | `file_annotations` | Low: map `file_id`, `strokes` JSONB. |
| **Firebase Firestore (`vyoma2board`)** | `users` | Cloud-registered profiles | `profiles`, `school_memberships` | Medium: JSON export of Firestore documents to Supabase `profiles`. |
| **Firebase Firestore (`vyoma2board`)** | `schools` | School auth settings | `schools` | Low: migrate `auth.methods`, `domain`, `name`. |
| **Firebase Firestore (`vyoma2board`)** | `rooms` | Classrooms, exams, metadata | `boards`, `exams` | High: parse nested `classMeta`, `exam` settings into relational tables. |
| **Firebase Firestore (`vyoma2board`)** | `rooms/{id}/submissions` | Student exam answers | `exam_submissions` | High: map JSON answers, parse auto/manual marks into numeric columns. |
| **Firebase Firestore (`vyoma2board`)** | `rooms/{id}/attendance` | Student roll call logs | `attendance_records` | Medium: extract student attendance documents per room. |

---

## 2. Migration Execution Phases

### Phase 1: Pre-Migration Backup & Freeze
1. Create a point-in-time snapshot of the legacy PostgreSQL database:
   ```bash
   pg_dump -h localhost -U postgres -d vyomaboard -F c -b -v -f vyomaboard_pre_migration.dump
   ```
2. Archive `database.sqlite` and all backups in `backend/backups/`.
3. Export Firestore collections (`users`, `schools`, `rooms`) using Firebase CLI or Google Cloud Console:
   ```bash
   gcloud firestore export gs://vyoma2board-migration-backups
   ```

### Phase 2: Schema Provisioning on Supabase
1. Run `docs/DATABASE_SCHEMA.md` on the Supabase SQL editor or via Supabase CLI migrations:
   ```bash
   supabase db push
   ```
2. Verify all 13 tables, indexes, and RLS policies are created and active.

### Phase 3: Data ETL (Extract, Transform, Load) Script
We provide an automated migration script `backend/scripts/migrate_to_supabase.js`:
* Maps legacy plain IDs to UUIDs where necessary.
* Preserves original room ID strings (e.g. `room-f92ka0`) to guarantee that all existing room bookmarks and shared links continue working without broken URLs.
* Deduplicates users by unique email.
* Automatically creates a default school (`slug: 'default-school'`) for orphaned boards.

### Phase 4: Verification & Integrity Testing
* Count verification: Verify `COUNT(*)` matches between source and target tables.
* Sample inspection: Validate binary integrity of Yjs CRDT states by decoding a sample `document_state` using `Y.applyUpdate`.
* Check constraint validation: Ensure no foreign keys are broken.

### Phase 5: Rollback Strategy
If any anomaly is detected during migration:
1. The legacy PostgreSQL database and Firestore instances remain completely untouched in read-only mode during the migration window.
2. The application configuration switch is governed by environment variables (`VITE_DATA_BACKEND=supabase` vs `firebase`).
3. Reverting to the previous state takes $< 30$ seconds by switching the feature flag back.
