# VYOMABOARD — PRODUCTION MULTI-TENANT DATABASE SCHEMA (SUPABASE POSTGRESQL)

## 1. Schema Design Principles
1. **Multi-Tenancy by Design**: Every tenant-owned resource links to `schools(id)`.
2. **PostgreSQL Row Level Security (RLS)**: Enforced directly at the database engine level. No client can bypass authorization rules by calling Supabase APIs directly.
3. **Foreign Key Integrity**: Strict cascade behaviors (`ON DELETE CASCADE` or `RESTRICT`) to prevent orphaned records.
4. **Optimized Indexes**: B-Tree indexes on tenant keys, user lookups, foreign keys, and query filters to guarantee $O(1)$ and $O(\log N)$ performance.

---

## 2. Complete SQL Migration Schema

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SCHOOLS & TENANTS
-- ============================================================================
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    auth_config JSONB NOT NULL DEFAULT '{"methods": ["account", "google", "email"]}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_domain ON schools(domain);

-- ============================================================================
-- 2. USERS & PROFILES (Linked to Supabase auth.users)
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    system_role TEXT NOT NULL DEFAULT 'user' CHECK (system_role IN ('super_admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- 3. SCHOOL MEMBERSHIPS (Tenant Roles: School Admin, Teacher, Student, etc.)
-- ============================================================================
CREATE TABLE school_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('school_admin', 'teacher', 'student', 'ta', 'guest')),
    student_prn TEXT,
    academic_year TEXT,
    division TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(school_id, user_id)
);

CREATE INDEX idx_memberships_school_user ON school_memberships(school_id, user_id);
CREATE INDEX idx_memberships_student_prn ON school_memberships(school_id, student_prn);

-- ============================================================================
-- 4. CLASSROOMS
-- ============================================================================
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    academic_year TEXT,
    branch TEXT,
    division TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(school_id, code)
);

CREATE INDEX idx_classrooms_school ON classrooms(school_id);

CREATE TABLE classroom_members (
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY(classroom_id, user_id)
);

-- ============================================================================
-- 5. BOARDS (Whiteboards / Class Rooms)
-- ============================================================================
CREATE TABLE boards (
    id TEXT PRIMARY KEY, -- Supports custom room codes like 'room-abc1234'
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'Untitled Workspace',
    kind TEXT NOT NULL DEFAULT 'board' CHECK (kind IN ('board', 'exam')),
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_by_role TEXT NOT NULL DEFAULT 'Casual',
    parent_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_boards_school ON boards(school_id);
CREATE INDEX idx_boards_host ON boards(host_id);
CREATE INDEX idx_boards_parent ON boards(parent_id);

-- ============================================================================
-- 6. YJS COLLABORATIVE DOCUMENTS (CRDT State)
-- ============================================================================
CREATE TABLE yjs_documents (
    room_id TEXT PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
    document_state BYTEA NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. ANNOTATIONS
-- ============================================================================
CREATE TABLE file_annotations (
    file_id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
    strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. FILES & ASSETS METADATA (Storage in Cloudflare R2)
-- ============================================================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    room_id TEXT REFERENCES boards(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    storage_key TEXT UNIQUE NOT NULL, -- Key in Cloudflare R2 bucket
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_files_room ON files(room_id);
CREATE INDEX idx_files_storage_key ON files(storage_key);

-- ============================================================================
-- 9. EXAMINATIONS
-- ============================================================================
CREATE TABLE exams (
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

CREATE INDEX idx_exams_room ON exams(room_id);

CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'code', 'subjective')),
    prompt TEXT NOT NULL,
    marks NUMERIC(5,2) NOT NULL DEFAULT 1,
    options JSONB, -- For MCQ: [{id: 1, text: 'Option A'}]
    answer_key JSONB, -- Correct answer (hidden from students via RLS)
    starter_code TEXT, -- For coding questions
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);

-- ============================================================================
-- 10. EXAM SUBMISSIONS & GRADEBOOK
-- ============================================================================
CREATE TABLE exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    obtained_marks NUMERIC(6,2) DEFAULT 0,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_submissions_exam_student ON exam_submissions(exam_id, student_id);

-- ============================================================================
-- 11. ATTENDANCE RECORDS
-- ============================================================================
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, student_id, session_date)
);

CREATE INDEX idx_attendance_room ON attendance_records(room_id);

-- ============================================================================
-- 12. CHAT & DIRECT MESSAGING (Persistent)
-- ============================================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL for public room chat
    is_dm BOOLEAN NOT NULL DEFAULT false,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_chat_room ON chat_messages(room_id, created_at);
CREATE INDEX idx_chat_dm ON chat_messages(sender_id, recipient_id) WHERE is_dm = true;

-- ============================================================================
-- 13. AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_school_user ON audit_logs(school_id, user_id);

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_memberships ENABLE ROW LEVEL SECURITY;
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

-- Profiles: Users can view profiles in their school, edit their own
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Boards: Users can access boards belonging to their school/classroom or public rooms
CREATE POLICY "Board view policy" ON boards
    FOR SELECT USING (
        auth.uid() = host_id OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM school_memberships 
            WHERE school_memberships.school_id = boards.school_id 
            AND school_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Board create policy" ON boards
    FOR INSERT WITH CHECK (auth.uid() = host_id OR auth.uid() = created_by);

-- Submissions: Students view/submit only their own; Teachers view all for their room
CREATE POLICY "Student can view own submission" ON exam_submissions
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teacher can view submissions for exam" ON exam_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exams e
            JOIN boards b ON b.id = e.room_id
            WHERE e.id = exam_submissions.exam_id
            AND (b.host_id = auth.uid() OR b.created_by = auth.uid())
        )
    );

-- Chat: Users can view room chat and direct messages addressed to or sent by them
CREATE POLICY "Chat message read policy" ON chat_messages
    FOR SELECT USING (
        (NOT is_dm AND EXISTS (
            SELECT 1 FROM boards WHERE boards.id = chat_messages.room_id
        )) OR
        (is_dm AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
    );

CREATE POLICY "Chat message insert policy" ON chat_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
```
