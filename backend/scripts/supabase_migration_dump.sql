-- VyomaBoard Supabase Data Migration Batch
BEGIN;

INSERT INTO schools (id, name, slug, domain)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Academy', 'default-academy', 'school.local')
ON CONFLICT (id) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('krish kalantri', 'mail.krishkalantri@gmail.com', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Krish Kalantri', 'kalantrikrish7@gmail.com', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Nikunj Bhutada', 'nikunjbhutada184@gmail.com', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Google User', 'googleuser@example.com', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Krish', 'krish@dev.local', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Teacher 1', 'teacher1@school.local', 'teacher', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Interviewer 1', 'interviewer1@school.local', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Student 1', 'student1@school.local', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Student 2', 'student2@school.local', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('Vyoma Board', 'mail.vyomaboard@gmail.com', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO users (name, email, role, school_id)
VALUES ('KRISH KALANTRI', 'krish.kalantri24@vit.edu', 'teacher', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Workspace a1vy2dl', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Workspace lngo3co', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled 1', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Test Room', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Test RoomTest Room', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Test Room', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Test', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Debug Room', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('krish', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('krish', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('Untitled', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('New Board', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;


INSERT INTO boards (name, school_id, is_locked)
VALUES ('New Board', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;

COMMIT;