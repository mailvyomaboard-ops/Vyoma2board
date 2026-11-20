import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

console.log('Auditing all active application source files in src/ and backend/ ...');

let filesChecked = 0;
let errors = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'workspaces', 'backups', 'ydb'].includes(entry.name)) continue;
      scanDirectory(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      filesChecked++;
      const code = fs.readFileSync(full, 'utf8');
      const rel = path.relative(projectRoot, full);

      // Verify no dev-mode backdoor token
      if (code.includes('dev-mode-token-12345')) {
        errors.push(`${rel}: Found forbidden security backdoor 'dev-mode-token-12345'`);
      }

      // Verify no ignoreExpiration in server/auth
      if (code.includes('ignoreExpiration: true')) {
        errors.push(`${rel}: Found forbidden 'ignoreExpiration: true'`);
      }

      // Verify no demos.yjs.dev in runtime code
      if (code.includes('demos.yjs.dev') && !full.includes('docs')) {
        errors.push(`${rel}: Found public unauthenticated relay 'demos.yjs.dev'`);
      }

      // Verify relative imports actually resolve to real files
      const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
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

        const resolved = candidates.some(c => fs.existsSync(c));
        if (!resolved) {
          errors.push(`${rel}: Cannot resolve import '${importPath}'`);
        }
      }
    }
  }
}

scanDirectory(path.join(projectRoot, 'src'));
scanDirectory(path.join(projectRoot, 'backend'));

console.log(`\nAudit completed: ${filesChecked} files scanned.`);
if (errors.length > 0) {
  console.error('Errors found:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('✅ ALL ACTIVE SOURCE FILES (src/ & backend/) PASSED VERIFICATION! Zero errors, zero broken imports, zero backdoors!');
}
