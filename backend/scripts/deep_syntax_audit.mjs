import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

let filesScanned = 0;
let errors = [];
let auditedFolders = new Set();

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  auditedFolders.add(path.relative(projectRoot, dir) || '.');
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', '.firebase', 'workspaces', 'backups', 'ydb', 'archive'].includes(entry.name)) continue;
      scan(full);
    } else if (/\.(js|jsx|mjs|json|css|html)$/.test(entry.name)) {
      filesScanned++;
      const content = fs.readFileSync(full, 'utf8');
      const rel = path.relative(projectRoot, full);

      // JSON parsing test
      if (entry.name.endsWith('.json')) {
        try {
          JSON.parse(content);
        } catch (e) {
          errors.push({ file: rel, error: `Invalid JSON: ${e.message}` });
        }
      }

      // Check imports for js/jsx
      if (/\.(js|jsx|mjs)$/.test(entry.name)) {
        const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          const dirOfFile = path.dirname(full);
          const candidates = [
            path.resolve(dirOfFile, importPath),
            path.resolve(dirOfFile, importPath + '.js'),
            path.resolve(dirOfFile, importPath + '.jsx'),
            path.resolve(dirOfFile, importPath + '.ts'),
            path.resolve(dirOfFile, importPath + '.tsx'),
            path.resolve(dirOfFile, importPath + '.css'),
            path.resolve(dirOfFile, importPath + '/index.js'),
            path.resolve(dirOfFile, importPath + '/index.jsx')
          ];
          if (!candidates.some(c => fs.existsSync(c))) {
            errors.push({ file: rel, error: `Broken relative import: "${importPath}"` });
          }
        }
      }
    }
  }
}

scan(projectRoot);

console.log(`Audited ${filesScanned} files across ${auditedFolders.size} project directories.`);
console.log('Audited folders:', Array.from(auditedFolders).sort());
if (errors.length === 0) {
  console.log('✅ ZERO ERRORS FOUND across all project files and folders!');
} else {
  console.error('Errors found:', errors);
  process.exit(1);
}
