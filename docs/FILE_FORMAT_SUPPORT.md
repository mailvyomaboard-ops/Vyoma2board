# VYOMABOARD — FILE FORMAT DETECTION & VIEWER ROUTING REGISTRY

## 1. Centralized File Type Registry
Rather than relying on sprawling, uncoordinated boolean checks (`isCode`, `isExcel`, `isWord`) scattered across components, VyomaBoard implements a centralized file classification registry (`src/lib/fileRegistry.js`).

### Classification Pipeline:
1. Extract file extension (normalized to lowercase).
2. Inspect MIME type (from HTTP response headers or file metadata).
3. Query `FILE_REGISTRY` to determine:
   * Target Viewer / Editor Component.
   * Editing capabilities (read-only vs editable).
   * Format Category.
   * Multi-sheet or multi-page support.

---

## 2. Supported Format Matrix & Viewer Routing

| Category | Extensions | MIME Types | Target Viewer Component | Desktop Capabilities | Mobile Capabilities (Phone Policy) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Spreadsheets** | `.csv`, `.xlsx`, `.xls`, `.ods` | `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | **`SpreadsheetIDE`** | **Full Grid Editing**, formulas, multi-sheet, row/col resize, CSV export | **Read-Only Virtual Grid**, cell selection, touch scroll, download latest |
| **Documents (PDF)** | `.pdf` | `application/pdf` | **`PDFViewer`** | Multi-page canvas rendering, text selection, zoom, document annotations | **Read-Only Viewer**, pinch zoom, page scrubber, download latest |
| **Word Processing** | `.docx`, `.doc`, `.odt`, `.rtf` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword` | **`WordIDE`** | Rich text editing, mammoth HTML preview, annotation overlay | **Read-Only Rendered Document**, vertical scroll, download latest |
| **Presentations** | `.pptx`, `.ppt`, `.odp` | `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint` | **`PPTViewer`** | Slide navigation, fullscreen presentation mode, slide annotations | **Read-Only Slide Viewer**, landscape swipe, download latest |
| **Code & Scripting** | `.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.c`, `.cpp`, `.java`, `.go`, `.rs`, `.html`, `.css`, `.json`, `.md`, `.txt` | `text/plain`, `text/javascript`, `application/json`, etc. | **`NotebookIDE`** / Monaco Editor | Syntax highlighting, zero-token Wandbox execution, cell management | **Read-Only Syntax Viewer**, horizontal scroll, download latest |
| **Raster & Vector Images** | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` | `image/png`, `image/jpeg`, `image/svg+xml`, etc. | **`ImageViewer`** | Fit-to-screen, zoom, crop/rotate, image annotations | **Read-Only Viewer**, pinch zoom, download latest |
| **Archives** | `.zip`, `.rar`, `.7z`, `.tar`, `.gz` | `application/zip`, `application/x-zip-compressed` | **`ArchiveViewer`** | Internal directory tree navigation, inner file preview | **Read-Only Directory Tree**, inner file preview, download latest |
| **Unsupported Formats**| All other extensions | `application/octet-stream` | **`UnsupportedFallback`** | File metadata card, hex/text preview if safe, download button | **Metadata Card**, download button |

---

## 3. Mandatory CSV Resolution
### Why CSV Broke in Legacy Code:
In `src/FileViewerModal.jsx:170`, `.csv` was included in `isCode`:
```javascript
const isCode = [..., 'csv'].includes(ext); // WRONG: Routed CSV to Monaco text editor!
const isExcel = ['xls', 'xlsx'].includes(ext); // Missing 'csv'!
```

### The Architectural Fix:
1. `.csv` is classified under category `'spreadsheet'` and routed strictly to `SpreadsheetIDE`.
2. A robust, RFC 4180-compliant CSV parser handles:
   * Quoted fields with embedded commas (`"New York, NY"`).
   * Embedded linebreaks inside quotes.
   * Escaped quotes (`""`).
   * UTF-8 Unicode characters.
3. When saving a CSV file, it is committed as a clean CSV text file without accidental conversion into a binary `.xlsx` workbook.
