import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, (e) => (e ? rej(e) : res())));
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (e, rows) => (e ? rej(e) : res(rows))));

const migrate = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  const cols = await all(`PRAGMA table_info(users)`);
  const names = cols.map(c => c.name);
  if (!names.includes('username')) await run(`ALTER TABLE users ADD COLUMN username TEXT`);
  if (!names.includes('role')) await run(`ALTER TABLE users ADD COLUMN role TEXT`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`);
};

const upsert = async (acc) => {
  const hash = bcrypt.hashSync(acc.password, 10);
  const email = acc.email || `${acc.username}@school.local`;
  const existing = await all(`SELECT id FROM users WHERE username = ? OR email = ?`, [acc.username, email]);
  if (existing.length > 0) {
    await run(`UPDATE users SET name=?, email=?, password_hash=?, role=? WHERE id=?`,
      [acc.name || acc.username, email, hash, acc.role || 'Casual', existing[0].id]);
    console.log(`Updated account: ${acc.username} (role: ${acc.role || 'Casual'})`);
  } else {
    await run(`INSERT INTO users (name, email, password_hash, username, role) VALUES (?,?,?,?,?)`,
      [acc.name || acc.username, email, hash, acc.username, acc.role || 'Casual']);
    console.log(`Created account: ${acc.username} (role: ${acc.role || 'Casual'})`);
  }
};

const main = async () => {
  await migrate();
  const args = process.argv.slice(2);
  const jsonPath = path.join(__dirname, 'seed-accounts.json');

  if (args[0] === '--add') {
    const [username, password, name, email, role] = args.slice(1);
    if (!username || !password) {
      console.log('Usage: node backend/seed-accounts.js --add <username> <password> <name> <email> <role>');
      console.log('Or create a seed-accounts.json file with an array of accounts.');
      db.close();
      return;
    }
    await upsert({ username, password, name, email, role });
  } else if (fs.existsSync(jsonPath)) {
    const accounts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    for (const acc of accounts) await upsert(acc);
  } else {
    console.log('No accounts to seed. Use either:');
    console.log('  node backend/seed-accounts.js --add <username> <password> <name> <email> <role>');
    console.log('  or create backend/seed-accounts.json with [{username,password,name,email,role}, ...]');
  }
  db.close();
};

main().catch((e) => { console.error(e); db.close(); process.exit(1); });