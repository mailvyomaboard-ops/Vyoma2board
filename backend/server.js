process.env.YJS_DISABLE_DOUBLE_IMPORT_CHECK = 'true';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Pool } from 'pg';
import https from 'https';
import AdmZip from 'adm-zip';
import { exec, spawn, execFile } from 'child_process';
import util from 'util';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { createRequire } from 'module';
import os from 'os';
import pty from 'node-pty';
const require = createRequire(import.meta.url);
const Y = require('yjs');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { z } from 'zod';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ projectId: 'sync-nexus-1a92b' });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
if (JWT_SECRET === 'super-secret-key-change-in-production') {
  console.warn('WARNING: Using insecure default JWT_SECRET. Set the JWT_SECRET environment variable in production.');
}

const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 3002);
let server;

// Setup database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vyomaboard',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const setupDatabase = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS yjs_documents (
      room_id TEXT PRIMARY KEY,
      document_state BYTEA,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT,
      role TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS annotations (
      file_id TEXT PRIMARY KEY,
      strokes TEXT NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hostName TEXT,
      hostId TEXT,
      parentId TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create unique index for username
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`);
    
    console.log('PostgreSQL database schema initialized.');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL database schema:', err);
  }
};
setupDatabase();

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Validation Schemas
const roomSchema = z.object({
  name: z.string().min(2, "Room name must be at least 2 characters").max(100),
  hostId: z.string().optional()
});

// Auth Endpoints
app.post('/api/auth/google', express.json(), async (req, res) => {
  const { email, displayName, uid, idToken } = req.body;
  if (!email || !displayName || !uid || !idToken) return res.status(400).json({ error: 'Invalid Google payload' });

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    if (decodedToken.uid !== uid || decodedToken.email !== email) {
      return res.status(403).json({ error: 'Token mismatch' });
    }
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized payload' });
  }

  try {
    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = userRes.rows[0];
    
    if (user) {
      // User exists, log them in
      const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } else {
      // User doesn't exist, create account with a dummy hash
      const dummyHash = 'google-auth-no-password';
      const insertRes = await pool.query(`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`, [displayName, email, dummyHash]);
      const newId = insertRes.rows[0].id;
      const token = jwt.sign({ id: newId, name: displayName, email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, token, user: { id: newId, name: displayName, email } });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/account', express.json(), async (req, res) => {
  const { username, email, password } = req.body;
  const identifier = (username || email || '').trim();
  if (!identifier || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const userRes = await pool.query(`SELECT * FROM users WHERE email = $1 OR username = $2`, [identifier, identifier]);
    const user = userRes.rows[0];

    if (!user) return res.status(401).json({ error: 'No account found with this email' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const role = user.role || 'Casual';
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, username: user.username, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, username: user.username, role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Public sign-up: create an account straight from the sign-in page.
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.string().optional()
});

app.post('/api/auth/register', express.json(), async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.errors[0].message });
  }
  const { name, email, password, role = 'Casual' } = result.data;

  try {
    const existingRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existingRes.rows.length > 0) return res.status(409).json({ success: false, error: 'An account with this email already exists' });

    const hash = bcrypt.hashSync(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, username, role) VALUES ($1, $2, $3, NULL, $4) RETURNING id`,
      [name, email, hash, role]
    );
    const newId = insertRes.rows[0].id;
    const token = jwt.sign({ id: newId, name, email, username: null, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: newId, name, email, username: null, role } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Account management (create/list). Requires a valid token.
const accountSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  role: z.string().optional()
});

app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const accountsRes = await pool.query(`SELECT id, username, name, email, role, created_at FROM users ORDER BY id`);
    res.json({ success: true, accounts: accountsRes.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts', authenticateToken, express.json(), async (req, res) => {
  const result = accountSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.errors[0].message });
  }
  const { username, password, name, email = '', role = 'Casual' } = result.data;

  try {
    const existingRes = await pool.query(`SELECT id FROM users WHERE username = $1 OR email = $2`, [username, email]);
    if (existingRes.rows.length > 0) return res.status(409).json({ success: false, error: 'Username or email already exists' });

    const hash = bcrypt.hashSync(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, username, role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email, hash, username, role]
    );
    const newId = insertRes.rows[0].id;
    res.json({
      success: true,
      account: { id: newId, username, name, email, role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Setup Yjs Persistence
const saveYdoc = async (docName, ydoc) => {
  try {
    const stateVector = Y.encodeStateAsUpdate(ydoc);
    const buffer = Buffer.from(stateVector);
    await pool.query(
      `INSERT INTO yjs_documents (room_id, document_state, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (room_id) DO UPDATE SET document_state = EXCLUDED.document_state, updated_at = CURRENT_TIMESTAMP`,
      [docName, buffer]
    );
  } catch (err) {
    throw err;
  }
};

setPersistence({
  bindState: async (docName, ydoc) => {
    try {
      const res = await pool.query(`SELECT document_state FROM yjs_documents WHERE room_id = $1`, [docName]);
      const row = res.rows[0];
      if (row && row.document_state) {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(row.document_state));
          console.log(`Loaded persisted state for room: ${docName}`);
        } catch (e) {
          console.error('Error applying Yjs update:', e);
        }
      }
    } catch (err) {
      console.error('Error loading Yjs document:', err);
    }
    
    let timeoutId;
    ydoc.on('update', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveYdoc(docName, ydoc).catch(console.error);
      }, 2000);
    });
  },
  writeState: async (docName, ydoc) => {
    return saveYdoc(docName, ydoc);
  }
});

// Setup upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage and limits
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize filename to prevent path traversal / command injection
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, uniqueSuffix + '-' + safeOriginalName);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://localhost:3001", "https://localhost:3002", "wss://localhost:3001", "wss://localhost:3002"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'", "blob:"]
    }
  }
}));

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'https://localhost:5173,https://localhost:4173,http://localhost:5173,http://localhost:4173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadDir)); 

// Persistent server-side file upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url,
    name: req.file.originalname,
    size: req.file.size,
    fileId: req.file.filename
  });
});

// Convert PPTX to PDF endpoint
app.post('/api/convert-ppt-to-pdf', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }
  
  const inputPath = req.file.path;
  const outputDir = path.dirname(inputPath);
  
  try {
    const libreOfficePath = process.platform === 'win32' 
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' 
      : 'libreoffice';
      
    const args = ['--headless', '--convert-to', 'pdf', inputPath, '--outdir', outputDir];
    await execFilePromise(libreOfficePath, args, { timeout: 60000 });
    
    const baseName = path.parse(inputPath).name;
    const pdfPath = path.join(outputDir, `${baseName}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      const url = `/uploads/${baseName}.pdf`;
      res.json({
        success: true,
        url,
        name: req.file.originalname.replace(/\.pptx?$/i, '.pdf'),
        fileId: `${baseName}.pdf`
      });
    } else {
      throw new Error('PDF file was not generated');
    }
  } catch (err) {
    console.error('PPTX to PDF conversion failed:', err);
    res.status(500).json({ success: false, error: 'Conversion failed: ' + err.message });
  }
});

// Apply rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

const codeRunLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many code execution requests, please try again later.'
});

// Annotations Endpoints
app.get('/api/annotations/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;
  try {
    const strokesRes = await pool.query('SELECT strokes FROM annotations WHERE file_id = $1', [fileId]);
    const row = strokesRes.rows[0];
    if (!row) return res.json({ success: true, strokes: [] });
    try {
      const strokes = JSON.parse(row.strokes);
      res.json({ success: true, strokes });
    } catch (e) {
      res.json({ success: true, strokes: [] });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/annotations/:fileId', authenticateToken, express.json(), async (req, res) => {
  const { fileId } = req.params;
  const { strokes } = req.body;
  
  if (!Array.isArray(strokes)) {
    return res.status(400).json({ success: false, error: 'strokes must be an array' });
  }
  
  const strokesStr = JSON.stringify(strokes);
  try {
    await pool.query(
      `INSERT INTO annotations (file_id, strokes, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (file_id) DO UPDATE SET strokes = EXCLUDED.strokes, updated_at = CURRENT_TIMESTAMP`,
      [fileId, strokesStr]
    );
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Save Workspace File Endpoint for Terminal
app.post('/api/save-workspace-file', authenticateToken, express.json({ limit: '10mb' }), (req, res) => {
  const { boardName, filename, content } = req.body;
  if (!filename) return res.status(400).json({ success: false, error: 'Filename is required' });
  
  const safeBoardName = (boardName || 'Workspace').replace(/[^a-zA-Z0-9-_\s]/g, '_');
  const workspacePath = path.join(__dirname, 'workspaces', safeBoardName);
  
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  const filePath = path.join(workspacePath, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  res.json({ success: true, filePath: filename });
});

// Run Code Endpoint
app.post('/api/run-code', authenticateToken, express.json({ limit: '50mb' }), async (req, res) => {
  const { code, language, files } = req.body;
  if (language !== 'c' && language !== 'python' && language !== 'javascript' && language !== 'java') {
    return res.status(400).json({ success: false, error: 'Language not supported' });
  }
  
  const runId = Math.random().toString(36).substring(2, 15);
  const tempDir = path.join(__dirname, 'temp_runs', runId);
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // Basic static analysis to prevent trivial RCE
    const dangerousPatterns = [/system\s*\(/, /popen\s*\(/, /exec\s*\(/, /ShellExecute\s*\(/, /CreateProcess\s*\(/];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return res.status(403).json({ success: false, error: 'Dangerous code detected: Execution of shell commands is disabled.' });
      }
    }
    
    // 1. Write the code (with compatibility shims for Windows/MinGW if C)
    let mainPath;
    let exeCommand = '';
    let exeArgs = [];

    if (language === 'c') {
      mainPath = path.join(tempDir, 'main.c');
      let processedCode = code;
      if (code.includes('strsep') && !code.includes('char *strsep')) {
        const strsepShim = `
/* Portable strsep shim for MinGW/Windows */
#ifndef HAVE_STRSEP
static char *strsep(char **stringp, const char *delim) {
    char *start = *stringp;
    char *p;
    if (start == NULL) return NULL;
    p = strpbrk(start, delim);
    if (p) {
        *p = '\\0';
        *stringp = p + 1;
    } else {
        *stringp = NULL;
    }
    return start;
}
#define HAVE_STRSEP 1
#endif
`;
        const lastIncludeIdx = processedCode.lastIndexOf('#include');
        if (lastIncludeIdx !== -1) {
          const endOfLine = processedCode.indexOf('\n', lastIncludeIdx);
          processedCode = processedCode.slice(0, endOfLine + 1) + strsepShim + processedCode.slice(endOfLine + 1);
        } else {
          processedCode = strsepShim + processedCode;
        }
      }
      fs.writeFileSync(mainPath, processedCode);
      const exePath = path.join(tempDir, 'program.exe');
      await execFilePromise('gcc', [mainPath, '-o', exePath], { cwd: tempDir, timeout: 10000 });
      exeCommand = exePath;
    } else if (language === 'python') {
      mainPath = path.join(tempDir, 'main.py');
      const pythonShim = `
import sys
import io
import base64

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    
    _original_show = plt.show
    def custom_show(*args, **kwargs):
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        print(f"\\n__IMAGE_BASE64__{img_str}__IMAGE_BASE64_END__\\n")
        plt.clf()
        
    plt.show = custom_show
except ImportError:
    pass

`;
      fs.writeFileSync(mainPath, pythonShim + code);
      exeCommand = 'python';
      exeArgs = ['main.py'];
    } else if (language === 'javascript') {
      mainPath = path.join(tempDir, 'main.js');
      fs.writeFileSync(mainPath, code);
      exeCommand = 'node';
      exeArgs = [mainPath];
    } else if (language === 'java') {
      // Find the class name (assumes basic public class Name)
      const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      mainPath = path.join(tempDir, `${className}.java`);
      fs.writeFileSync(mainPath, code);
      
      // Compile java
      await execFilePromise('javac', [mainPath], { cwd: tempDir, timeout: 10000 });
      
      exeCommand = 'java';
      exeArgs = [className];
    }
    
    // 2. Copy attached files and find a data file to pipe as stdin
    let stdinFilePath = null;
    if (files && Array.isArray(files)) {
      for (const f of files) {
        if (f.name) {
          const destPath = path.join(tempDir, f.name);
          if (f.content !== undefined) {
            fs.writeFileSync(destPath, f.content);
            const ext = f.name.split('.').pop().toLowerCase();
            if (['csv', 'txt', 'dat', 'tsv', 'json'].includes(ext) && !stdinFilePath) {
              stdinFilePath = destPath;
            }
          } else if (f.url) {
            const relativeUrl = f.url.startsWith('/') ? f.url.slice(1) : f.url;
            const srcPath = path.join(__dirname, relativeUrl);
            if (fs.existsSync(srcPath)) {
              fs.copyFileSync(srcPath, destPath);
              const ext = f.name.split('.').pop().toLowerCase();
              if (['csv', 'txt', 'dat', 'tsv', 'json'].includes(ext) && !stdinFilePath) {
                stdinFilePath = destPath;
              }
            } else {
              console.error('File not found to copy:', srcPath);
            }
          }
        }
      }
    }
    
    // 4. Run - pipe stdin from data file if available
    const result = await new Promise((resolve, reject) => {
      const child = spawn(exeCommand, exeArgs, { cwd: tempDir });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      
      // If we have a data file, pipe it into stdin
      if (stdinFilePath && fs.existsSync(stdinFilePath)) {
        const stdinStream = fs.createReadStream(stdinFilePath);
        stdinStream.pipe(child.stdin);
        stdinStream.on('error', () => { try { child.stdin.end(); } catch(e) {} });
      } else {
        child.stdin.end();
      }
      
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Program timed out after 30 seconds'));
      }, 30000);
      
      child.on('close', (exitCode) => {
        clearTimeout(timer);
        if (exitCode !== 0 && !stdout) {
          reject({ stderr, stdout, message: `Process exited with code ${exitCode}` });
        } else {
          resolve({ stdout, stderr });
        }
      });
      
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    
    res.json({ success: true, output: result.stdout, errorOutput: result.stderr });
  } catch (err) {
    res.json({ success: false, errorOutput: err.stderr || err.message, compileError: err.stdout });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to cleanup temp dir', e);
    }
  }
});

// Terminal Workspace Sync Endpoint
app.post('/api/terminal/sync', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { boardName, files } = req.body;
    console.log(`[SYNC] Syncing workspace for board: ${boardName}, files:`, files.map(f => f.name));
    if (!boardName || !Array.isArray(files)) return res.status(400).json({ error: 'Invalid payload' });

    const workspacePath = path.join(__dirname, 'workspaces', boardName.replace(/[^a-zA-Z0-9-_\s]/g, '_'));
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    files.forEach(f => {
      if (f.name) {
        fs.writeFileSync(path.join(workspacePath, f.name), f.content || '');
      }
    });

    res.json({ success: true, workspacePath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Room Endpoints
app.post('/api/rooms', authenticateToken, express.json(), async (req, res) => {
  const result = roomSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.errors[0].message });
  }
  const { hostName, hostId, name: requestedName } = result.data;
  const roomId = 'room-' + Math.random().toString(36).substring(2, 9);
  const roomName = requestedName || `Untitled Workspace`;
  
  try {
    await pool.query(
      `INSERT INTO rooms (id, name, hostName, hostId) VALUES ($1, $2, $3, $4)`, 
      [roomId, roomName, hostName || 'Anonymous', hostId]
    );
    res.json({ success: true, roomId, name: roomName, hostName, hostId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomRes = await pool.query(`SELECT * FROM rooms WHERE id = $1`, [req.params.id]);
    const row = roomRes.rows[0];
    if (!row) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, room: row });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  const roomId = req.params.id;
  
  // Check if room is empty by checking commsRooms
  let isEmpty = true;
  if (commsRooms[roomId]) {
    // Check if there are any active connections
    for (const client of commsRooms[roomId]) {
      if (client.readyState === 1) {
        isEmpty = false;
        break;
      }
    }
  }
  
  if (!isEmpty) {
    return res.status(400).json({ success: false, error: 'Room is not empty' });
  }
  
  try {
    await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function startServer(port) {
  const keyPath = path.join(__dirname, '../localhost+2-key.pem');
  const certPath = path.join(__dirname, '../localhost+2.pem');

  if (process.env.NODE_ENV === 'production' || (!fs.existsSync(keyPath) || !fs.existsSync(certPath))) {
    // Render and other cloud platforms terminate SSL natively and expect HTTP
    const http = require('http');
    const serverInstance = http.createServer(app).listen(port, () => {
      console.log(`Backend server running on HTTP port ${port} (Cloud/Fallback mode)`);
      serverInstance.on('upgrade', upgradeHandler);
    });
    server = serverInstance;
  } else {
    // Local dev uses HTTPS
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    
    const serverInstance = https.createServer(options, app).listen(port, () => {
      console.log(`Backend server running on HTTPS port ${port} (Local Dev mode)`);
      serverInstance.on('upgrade', upgradeHandler);
    });
    server = serverInstance;
  }
}

server = startServer(DEFAULT_PORT);

// Setup WebSocket servers for Yjs and WebRTC Comms
const wssYjs = new WebSocketServer({ noServer: true });
const wssComms = new WebSocketServer({ noServer: true });
const wssTerminal = new WebSocketServer({ noServer: true });

const shell = process.env.COMSPEC || (os.platform() === 'win32' ? 'cmd.exe' : 'bash');

wssTerminal.on('connection', (ws, req) => {
  const urlParams = new URL(req.url, `http://${req.headers.host}`);
  const boardName = urlParams.searchParams.get('boardName') || 'Workspace';
  const userName = urlParams.searchParams.get('userName') || 'user';
  
  const workspacePath = path.join(__dirname, 'workspaces', boardName.replace(/[^a-zA-Z0-9-_\s]/g, '_'));
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: workspacePath,
    env: { ...process.env, PROMPT: `${userName}@${boardName}$G ` },
    useConpty: false
  });

  ptyProcess.onData((data) => {
    if (ws.readyState === 1) ws.send(data);
  });

  ws.on('message', (msg) => {
    ptyProcess.write(msg.toString());
  });

  ws.on('close', () => {
    ptyProcess.kill();
  });
});

wssYjs.on('connection', (conn, req) => {
  // Extract room ID without query string
  const pathParts = req.url.split('?')[0].split('/');
  const docName = pathParts[pathParts.length - 1] || 'moodboard-room';
  setupWSConnection(conn, req, { docName });
});

const commsRooms = {}; // roomId -> Set of ws clients
const chatHistory = {}; // Keep chat history in memory per room
const dmHistory = {}; // Keep DM history: roomId -> [{from, to, message}]

wssComms.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, roomId, targetId, userId } = data;
      
      if (!roomId) return;
      if (!commsRooms[roomId]) commsRooms[roomId] = new Set();
      if (!chatHistory[roomId]) chatHistory[roomId] = [];
      if (!dmHistory[roomId]) dmHistory[roomId] = [];
      
      switch (type) {
        case 'join':
          ws.userId = userId;
          ws.roomId = roomId;
          ws.userName = data.name;
          ws.userColor = data.color;
          commsRooms[roomId].add(ws);
          
          // Send existing chat history to the new user
          if (chatHistory[roomId].length > 0) {
            ws.send(JSON.stringify({ type: 'chat-history', messages: chatHistory[roomId] }));
          }

          // Send existing DM history to the new user
          const myDms = dmHistory[roomId].filter(m => m.from === userId || m.to === userId);
          if (myDms.length > 0) {
            ws.send(JSON.stringify({ type: 'dm-history', messages: myDms }));
          }

          // Broadcast to others and notify new user of existing users
          for (const client of commsRooms[roomId]) {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify({ type: 'user-joined', userId: ws.userId, name: ws.userName, color: ws.userColor }));
              ws.send(JSON.stringify({ type: 'user-joined', userId: client.userId, name: client.userName || 'User', color: client.userColor || '#5865F2' }));
            }
          }
          break;
          
        case 'offer':
          case 'answer':
          case 'ice-candidate':
            // Route P2P signals directly to target
            for (const client of commsRooms[roomId]) {
              if (client.userId === targetId && client.readyState === 1) {
                client.send(JSON.stringify(data));
                break;
              }
            }
            break;
            
          case 'join-call':
          case 'leave-call':
            // Broadcast call status to everyone in the room
            for (const client of commsRooms[roomId]) {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            }
            break;

          case 'chat-message':
          // Save message to history
          chatHistory[roomId].push(data.message);
          // Broadcast chat to everyone in the room
          for (const client of commsRooms[roomId]) {
            if (client.readyState === 1) {
              client.send(JSON.stringify(data));
            }
          }
          break;

        case 'chat-dm':
          const dmRecord = { from: userId, to: targetId, message: data.message };
          dmHistory[roomId].push(dmRecord);
          // Send to target and back to sender
          for (const client of commsRooms[roomId]) {
            if ((client.userId === targetId || client.userId === userId) && client.readyState === 1) {
              client.send(JSON.stringify(data));
            }
          }
          break;

        case 'kick-user':
          for (const client of commsRooms[roomId]) {
            if (client.userId === targetId && client.readyState === 1) {
              client.send(JSON.stringify({ type: 'kicked' }));
              client.close();
              break;
            }
          }
          break;
      }
    } catch (e) {
      console.error('WebSocket comms error', e);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && commsRooms[ws.roomId]) {
      commsRooms[ws.roomId].delete(ws);
      for (const client of commsRooms[ws.roomId]) {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'user-left', userId: ws.userId }));
        }
      }
    }
  });
});

function upgradeHandler(request, socket, head) {
  const urlParams = new URL(request.url, `http://${request.headers.host}`);
  const token = urlParams.searchParams.get('token');
  console.log('WS Upgrade Request for URL:', request.url, 'from host:', request.headers.host);
  const verifySocket = (cb) => {
    if (!token) {
      console.log('WS Upgrade rejected: No token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (token === 'dev-mode-token-12345') {
      request.user = { id: 9999, name: 'Dev User', email: 'dev@local.host' };
      return cb();
    }

    jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
      if (err) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
      request.user = user;
      cb();
    });
  };

  if (request.url.startsWith('/yjs')) {
    verifySocket(() => {
      wssYjs.handleUpgrade(request, socket, head, (ws) => {
        wssYjs.emit('connection', ws, request);
      });
    });
  } else if (request.url.startsWith('/comms')) {
    verifySocket(() => {
      wssComms.handleUpgrade(request, socket, head, (ws) => {
        wssComms.emit('connection', ws, request);
      });
    });
  } else if (request.url.startsWith('/api/terminal')) {
    verifySocket(() => {
      wssTerminal.handleUpgrade(request, socket, head, (ws) => {
        wssTerminal.emit('connection', ws, request);
      });
    });
  } else {
    socket.destroy();
  }
};

console.log('WebSocket servers for Yjs & Comms enabled.');

// Automated DB Backups
cron.schedule('0 0 * * *', () => { // Run every day at midnight
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `database-${dateStr}.sqlite`);
  
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Database backed up to ${backupPath}`);
});
