/**
 * Centralized File Registry & Format Detection
 * Guarantees correct routing for all supported file formats.
 * Explicitly categorizes CSV as a Spreadsheet (NOT Code).
 */

export const FILE_CATEGORIES = {
  SPREADSHEET: 'spreadsheet',
  DOCUMENT: 'document', // PDF
  WORD: 'word',
  PRESENTATION: 'presentation',
  CODE: 'code',
  IMAGE: 'image',
  ARCHIVE: 'archive',
  AUDIO: 'audio',
  UNSUPPORTED: 'unsupported',
};

const EXTENSION_MAP = {
  // Spreadsheets (CSV MUST BE HERE!)
  csv: FILE_CATEGORIES.SPREADSHEET,
  xlsx: FILE_CATEGORIES.SPREADSHEET,
  xls: FILE_CATEGORIES.SPREADSHEET,
  ods: FILE_CATEGORIES.SPREADSHEET,

  // Documents
  pdf: FILE_CATEGORIES.DOCUMENT,

  // Word Processing
  doc: FILE_CATEGORIES.WORD,
  docx: FILE_CATEGORIES.WORD,
  odt: FILE_CATEGORIES.WORD,
  rtf: FILE_CATEGORIES.WORD,

  // Presentations
  ppt: FILE_CATEGORIES.PRESENTATION,
  pptx: FILE_CATEGORIES.PRESENTATION,
  odp: FILE_CATEGORIES.PRESENTATION,

  // Code & Text
  py: FILE_CATEGORIES.CODE,
  js: FILE_CATEGORIES.CODE,
  jsx: FILE_CATEGORIES.CODE,
  ts: FILE_CATEGORIES.CODE,
  tsx: FILE_CATEGORIES.CODE,
  html: FILE_CATEGORIES.CODE,
  css: FILE_CATEGORIES.CODE,
  json: FILE_CATEGORIES.CODE,
  c: FILE_CATEGORIES.CODE,
  cpp: FILE_CATEGORIES.CODE,
  java: FILE_CATEGORIES.CODE,
  go: FILE_CATEGORIES.CODE,
  rs: FILE_CATEGORIES.CODE,
  txt: FILE_CATEGORIES.CODE,
  md: FILE_CATEGORIES.CODE,
  ipynb: FILE_CATEGORIES.CODE,

  // Images
  png: FILE_CATEGORIES.IMAGE,
  jpg: FILE_CATEGORIES.IMAGE,
  jpeg: FILE_CATEGORIES.IMAGE,
  gif: FILE_CATEGORIES.IMAGE,
  webp: FILE_CATEGORIES.IMAGE,
  svg: FILE_CATEGORIES.IMAGE,

  // Archives
  zip: FILE_CATEGORIES.ARCHIVE,
  rar: FILE_CATEGORIES.ARCHIVE,
  '7z': FILE_CATEGORIES.ARCHIVE,
  tar: FILE_CATEGORIES.ARCHIVE,
  gz: FILE_CATEGORIES.ARCHIVE,

  // Audio
  mp3: FILE_CATEGORIES.AUDIO,
  wav: FILE_CATEGORIES.AUDIO,
  ogg: FILE_CATEGORIES.AUDIO,
  m4a: FILE_CATEGORIES.AUDIO,
};

/**
 * Normalizes and extracts extension from file name or URL.
 */
export function getFileExtension(filename = '', url = '') {
  let ext = '';
  if (filename && typeof filename === 'string') {
    ext = filename.split('?')[0].split('.').pop().toLowerCase();
  }
  if (!ext && url && typeof url === 'string') {
    ext = url.split('?')[0].split('.').pop().toLowerCase();
  }
  return ext;
}

/**
 * Resolves the canonical category for any file.
 */
export function getFileCategory(filename = '', url = '', mimeType = '') {
  const ext = getFileExtension(filename, url);

  if (mimeType) {
    const normMime = mimeType.toLowerCase();
    if (normMime.includes('csv')) return FILE_CATEGORIES.SPREADSHEET;
    if (normMime.includes('spreadsheet') || normMime.includes('excel')) return FILE_CATEGORIES.SPREADSHEET;
    if (normMime.includes('pdf')) return FILE_CATEGORIES.DOCUMENT;
    if (normMime.includes('word') || normMime.includes('officedocument.word')) return FILE_CATEGORIES.WORD;
    if (normMime.includes('presentation') || normMime.includes('powerpoint')) return FILE_CATEGORIES.PRESENTATION;
    if (normMime.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
    if (normMime.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
  }

  return EXTENSION_MAP[ext] || FILE_CATEGORIES.UNSUPPORTED;
}

export function isSpreadsheetFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.SPREADSHEET;
}

export function isCodeFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.CODE;
}

export function isWordFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.WORD;
}

export function isPresentationFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.PRESENTATION;
}

export function isPdfFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.DOCUMENT;
}

export function isImageFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.IMAGE;
}

export function isArchiveFile(filename = '', url = '') {
  return getFileCategory(filename, url) === FILE_CATEGORIES.ARCHIVE;
}
