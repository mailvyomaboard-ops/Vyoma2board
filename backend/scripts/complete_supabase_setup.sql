-- ============================================================================
-- VYOMABOARD — COMPLETE SUPABASE POSTGRESQL PRODUCTION SETUP
-- Run this script once in your Supabase SQL Editor (supabase.com/dashboard)
-- It safely creates all tables, indexes, RLS policies, and seeds initial data.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SCHOOLS & TENANTS
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    auth_config JSONB NOT NULL DEFAULT '{"methods": ["account", "google", "email", "no-account"]}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_schools_domain ON schools(domain);

-- 2. USERS (Application User Accounts)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);

-- 3. PROFILES (Linked optionally to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 4. CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    academic_year TEXT,
    branch TEXT,
    division TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);

CREATE TABLE IF NOT EXISTS classroom_members (
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY(classroom_id, user_id)
);

-- 5. BOARDS (Whiteboard Workspaces)
CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Untitled Workspace',
    kind TEXT NOT NULL DEFAULT 'board',
    host_id TEXT,
    created_by TEXT,
    parent_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_boards_school ON boards(school_id);

-- 6. YJS COLLABORATIVE DOCUMENTS (Whiteboard CRDT State)
CREATE TABLE IF NOT EXISTS yjs_documents (
    room_id TEXT PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
    document_state BYTEA NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. ANNOTATIONS
CREATE TABLE IF NOT EXISTS file_annotations (
    file_id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
    strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. FILES & ASSETS
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    room_id TEXT REFERENCES boards(id) ON DELETE SET NULL,
    uploaded_by TEXT,
    name TEXT NOT NULL,
    storage_key TEXT UNIQUE NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id);

-- 9. EXAMINATIONS
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT UNIQUE NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
    open_at TIMESTAMPTZ,
    close_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_proctored BOOLEAN NOT NULL DEFAULT false,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    marks NUMERIC(5,2) NOT NULL DEFAULT 1,
    options JSONB,
    answer_key JSONB,
    starter_code TEXT,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. EXAM SUBMISSIONS
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    obtained_marks NUMERIC(6,2) DEFAULT 0,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    graded_by TEXT,
    graded_at TIMESTAMPTZ,
    UNIQUE(exam_id, student_id)
);

-- 11. ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, student_id, session_date)
);

-- 12. CHAT & MESSAGING
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    recipient_id TEXT,
    is_dm BOOLEAN NOT NULL DEFAULT false,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 14. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE yjs_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to schools, boards, and public data
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public schools read policy" ON schools;
    CREATE POLICY "Public schools read policy" ON schools FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public boards read policy" ON boards;
    CREATE POLICY "Public boards read policy" ON boards FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public boards write policy" ON boards;
    CREATE POLICY "Public boards write policy" ON boards FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public users access policy" ON users;
    CREATE POLICY "Public users access policy" ON users FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public files access policy" ON files;
    CREATE POLICY "Public files access policy" ON files FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public chat access policy" ON chat_messages;
    CREATE POLICY "Public chat access policy" ON chat_messages FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Grant schema and table access to PostgREST roles (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 15. SEED INITIAL TENANTS & LEGACY DATA
-- ============================================================================
INSERT INTO schools (id, name, slug, domain)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Academy', 'default-academy', 'school.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (name, email, role, school_id) VALUES
('krish kalantri', 'mail.krishkalantri@gmail.com', 'student', '00000000-0000-0000-0000-000000000001'),
('Krish Kalantri', 'kalantrikrish7@gmail.com', 'student', '00000000-0000-0000-0000-000000000001'),
('Nikunj Bhutada', 'nikunjbhutada184@gmail.com', 'student', '00000000-0000-0000-0000-000000000001'),
('Google User', 'googleuser@example.com', 'student', '00000000-0000-0000-0000-000000000001'),
('Krish', 'krish@dev.local', 'student', '00000000-0000-0000-0000-000000000001'),
('Teacher 1', 'teacher1@school.local', 'teacher', '00000000-0000-0000-0000-000000000001'),
('Interviewer 1', 'interviewer1@school.local', 'student', '00000000-0000-0000-0000-000000000001'),
('Interviewee 1', 'interviewee1@school.local', 'student', '00000000-0000-0000-0000-000000000001'),
('Employee 1', 'employee1@school.local', 'student', '00000000-0000-0000-0000-000000000001'),
('Manager 1', 'manager1@school.local', 'teacher', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

INSERT INTO boards (id, name, school_id, is_locked) VALUES
('room-default-1', 'Main Classroom', '00000000-0000-0000-0000-000000000001', false),
('room-exam-1', 'Physics Midterm Room', '00000000-0000-0000-0000-000000000001', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 16. STORAGE BUCKET & RLS POLICIES (Ultra-Fast 50MB Cloud File & Image Uploads)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('board-assets', 'board-assets', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public board-assets uploads" ON storage.objects;
    CREATE POLICY "Public board-assets uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'board-assets');

    DROP POLICY IF EXISTS "Public board-assets select" ON storage.objects;
    CREATE POLICY "Public board-assets select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'board-assets');

    DROP POLICY IF EXISTS "Public board-assets update" ON storage.objects;
    CREATE POLICY "Public board-assets update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'board-assets');

    DROP POLICY IF EXISTS "Public board-assets delete" ON storage.objects;
    CREATE POLICY "Public board-assets delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'board-assets');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
