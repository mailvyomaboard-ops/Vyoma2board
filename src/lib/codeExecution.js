/**
 * Zero-Token Peer-to-Peer Code Execution Service
 * Uses Wandbox Open API (Sakura Internet / open-source community since 2012)
 *
 * Characteristics:
 * - 100% Free, Zero API Keys, Zero Expiring Tokens
 * - Open CORS (Access-Control-Allow-Origin: *)
 * - Native multi-file compilation support
 * - Client-side AbortController timeout protection
 */

const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';

// Best and most stable compiler versions on Wandbox
const COMPILER_MAP = {
  python: 'cpython-3.14.0',
  py: 'cpython-3.14.0',
  javascript: 'nodejs-20.17.0',
  js: 'nodejs-20.17.0',
  node: 'nodejs-20.17.0',
  c: 'gcc-13.2.0-c',
  cpp: 'gcc-13.2.0',
  'c++': 'gcc-13.2.0',
  java: 'openjdk-jdk-22+36',
  csharp: 'mono-6.12.0.199',
  cs: 'mono-6.12.0.199',
  go: 'go-1.23.2',
  golang: 'go-1.23.2',
  rust: 'rust-1.82.0',
  rs: 'rust-1.82.0',
  php: 'php-8.3.6',
  ruby: 'ruby-3.3.0',
};

const MAX_OUTPUT_LENGTH = 100000;

/**
 * Execute code via Wandbox without requiring an API key or backend proxy.
 *
 * @param {Object} options
 * @param {string} options.code - Source code string
 * @param {string} options.language - Language identifier (python, c, cpp, javascript, java, go, etc.)
 * @param {Array<{name: string, content: string}>} [options.files] - Optional auxiliary files for multi-file projects
 * @param {string} [options.stdin] - Optional standard input string
 * @param {number} [options.timeoutMs] - Timeout in milliseconds (default 20,000)
 * @returns {Promise<{success: boolean, output: string, stdout: string, stderr: string, compileError: string, status: number|null}>}
 */
export async function runCode({
  code = '',
  language = 'python',
  files = [],
  stdin = '',
  timeoutMs = 20000,
}) {
  const normLang = String(language || 'python').toLowerCase().trim();
  const compiler = COMPILER_MAP[normLang] || COMPILER_MAP.python;

  // Format secondary files for Wandbox multi-file support
  const codes = (files || [])
    .filter(f => f && f.name && f.name !== 'main')
    .map(f => ({
      file: f.name,
      code: f.content || '',
    }));

  const payload = {
    compiler,
    code,
    stdin: stdin || '',
  };

  if (codes.length > 0) {
    payload.codes = codes;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(WANDBOX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Execution service responded with HTTP ${res.status}`);
    }

    const data = await res.json();

    const stdout = data.program_output || data.program_message || '';
    const stderr = data.program_error || '';
    const compileError = data.compiler_error || data.compiler_message || '';
    const status = data.status !== undefined ? data.status : 0;

    let finalOutput = '';
    if (compileError) {
      finalOutput += `[COMPILATION ERROR]\n${compileError}\n`;
    }
    if (stdout) {
      finalOutput += stdout;
    }
    if (stderr) {
      finalOutput += (finalOutput ? '\n[STDERR]\n' : '') + stderr;
    }

    if (!finalOutput.trim()) {
      finalOutput = `Process completed with exit code ${status} (No output)`;
    }

    // Guard against massive output flooding UI memory
    if (finalOutput.length > MAX_OUTPUT_LENGTH) {
      finalOutput = finalOutput.slice(0, MAX_OUTPUT_LENGTH) + '\n\n[... Output truncated due to size limit ...]';
    }

    const isSuccess = status === 0 && !compileError;

    return {
      success: isSuccess,
      output: finalOutput.trimEnd(),
      stdout,
      stderr,
      compileError,
      status,
      raw: data,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    let errorMsg = err.message || 'Execution failed';
    if (err.name === 'AbortError') {
      errorMsg = `Execution timed out after ${Math.round(timeoutMs / 1000)}s (Possible infinite loop or slow network).`;
    } else if (err.message && err.message.includes('Failed to fetch')) {
      errorMsg = 'Network error: Unable to reach the execution service. Check your internet connection.';
    }

    return {
      success: false,
      output: `[ERROR] ${errorMsg}`,
      stdout: '',
      stderr: errorMsg,
      compileError: '',
      status: -1,
      raw: null,
    };
  }
}
