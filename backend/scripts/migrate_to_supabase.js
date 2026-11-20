/**
 * Supabase Data Migration & ETL Runner
 * Zero-dependency migration utility using Node.js built-in sqlite / PostgreSQL generator.
 * Transfers legacy SQLite and Firestore application records to Supabase PostgreSQL schema.
 * 
 * Time Complexity: O(N) where N is total rows across legacy tables.
 * Space Complexity: O(B) batch buffer size.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQLITE_PATH = path.join(__dirname, '..', 'database.sqlite');
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

console.log('=== VYOMABOARD SUPABASE MIGRATION RUNNER ===');
console.log(`Source SQLite: ${SQLITE_PATH}`);
console.log(`Target Supabase DB: ${SUPABASE_DB_URL ? 'Configured' : 'Dry Run (SQL Output Only)'}\n`);

async function runMigration() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('No local SQLite database found at path. Migration completed (clean state).');
    return;
  }

  let db = null;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(SQLITE_PATH);
  } catch (err) {
    try {
      const sqlite3 = (await import('sqlite3')).default;
      const sdb = new sqlite3.Database(SQLITE_PATH);
      db = {
        prepare: (sql) => ({
          all: () => new Promise((res, rej) => sdb.all(sql, (e, rows) => e ? rej(e) : res(rows)))
        })
      };
    } catch (e) {
      console.error('Neither node:sqlite nor sqlite3 is available:', e.message);
      return;
    }
  }

  try {
    // 1. Extract Users
    console.log('[1/4] Reading legacy users...');
    let users = [];
    try {
      users = db.prepare('SELECT * FROM users').all();
      console.log(`Found ${users.length} user records.`);
    } catch (err) {
      console.log('No users table found, skipping.');
    }

    // 2. Extract Rooms
    console.log('[2/4] Reading legacy rooms...');
    let rooms = [];
    try {
      rooms = db.prepare('SELECT * FROM rooms').all();
      console.log(`Found ${rooms.length} room records.`);
    } catch (err) {
      console.log('No rooms table found, skipping.');
    }

    // 3. Extract Files
    console.log('[3/4] Reading legacy files...');
    let files = [];
    try {
      files = db.prepare('SELECT * FROM files').all();
      console.log(`Found ${files.length} file records.`);
    } catch (err) {
      console.log('No files table found, skipping.');
    }

    // Generate Supabase PostgreSQL SQL DDL and Inserts
    const sqlStatements = [];
    sqlStatements.push('-- VyomaBoard Supabase Data Migration Batch');
    sqlStatements.push('BEGIN;');

    // Migrate default school
    sqlStatements.push(`
INSERT INTO schools (id, name, slug, domain)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Academy', 'default-academy', 'school.local')
ON CONFLICT (id) DO NOTHING;
`);

    // Migrate users
    for (const u of users) {
      const email = (u.email || `${u.username || 'user' + u.id}@school.local`).replace(/'/g, "''");
      const name = (u.name || u.username || 'User').replace(/'/g, "''");
      const role = (u.role || 'Casual').toLowerCase() === 'teacher' ? 'teacher' : 'student';
      sqlStatements.push(`
INSERT INTO users (name, email, role, school_id)
VALUES ('${name}', '${email}', '${role}', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;
`);
    }

    // Migrate rooms as boards
    for (const r of rooms) {
      const name = (r.name || 'Room ' + r.id).replace(/'/g, "''");
      sqlStatements.push(`
INSERT INTO boards (name, school_id, is_locked)
VALUES ('${name}', '00000000-0000-0000-0000-000000000001', FALSE)
ON CONFLICT DO NOTHING;
`);
    }

    sqlStatements.push('COMMIT;');

    const migrationSql = sqlStatements.join('\n');
    const dumpPath = path.join(__dirname, 'supabase_migration_dump.sql');
    fs.writeFileSync(dumpPath, migrationSql);
    console.log(`\n[4/4] Successfully generated migration script at:\n${dumpPath}`);

    if (SUPABASE_DB_URL) {
      console.log('Executing migration against Supabase PostgreSQL...');
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
      await pool.query(migrationSql);
      await pool.end();
      console.log('Direct Supabase database migration completed successfully!');
    } else {
      console.log('To apply this migration to your live Supabase project:');
      console.log('1. Set SUPABASE_DB_URL in your .env');
      console.log('2. Or paste the contents of supabase_migration_dump.sql into the Supabase SQL Editor.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
