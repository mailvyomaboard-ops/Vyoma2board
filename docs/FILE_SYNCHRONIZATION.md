# VYOMABOARD — FILE SYNCHRONIZATION, VERSIONING & DOWNLOAD INTEGRITY

## 1. The Collaborative Save Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Editor as User A (Desktop Editor)
    participant UI as SpreadsheetIDE / WordIDE
    participant Sync as fileSyncService.js
    participant API as Node.js Backend API
    participant R2 as Cloudflare R2 Storage
    participant DB as Supabase PostgreSQL
    actor Viewer as User B (Desktop/Mobile Viewer)

    Editor->>UI: Makes edits in cells / document
    UI->>Sync: Mark status: "unsaved_changes"
    Editor->>UI: Clicks "Save & Commit" (or auto-save debounce)
    UI->>Sync: initiateCommit({ file_id, base_version, newContent })
    Sync->>API: POST /api/files/:fileId/commit
    
    API->>DB: Check optimistic lock: SELECT version FROM files WHERE file_id = $1
    alt Version Conflict Detected (base_version != current_version)
        API-->>Sync: Return HTTP 409 Conflict { serverVersion, lastEditor }
        Sync-->>UI: Display Conflict Modal ("Another user committed a newer version")
    else Commit Allowed
        API->>R2: Upload new binary to {file_id}/v{new_version}/{filename}
        API->>DB: UPDATE files SET version = new_version, content_hash = ..., updated_at = now()
        API->>DB: INSERT INTO file_versions (...)
        API-->>Sync: Return HTTP 200 { success: true, new_version, download_url }
        Sync->>UI: Update status: "saved"
        Sync->>Viewer: Broadcast WebSocket notification: 'file-version-updated' { file_id, version }
        Viewer->>Viewer: Invalidate local cache & refresh open document
    end
```

---

## 2. Concurrency Control & Conflict Resolution
Binary document formats (DOCX, XLSX, PPTX) cannot be blindly merged like plain text. VyomaBoard implements:
1. **Optimistic Version Checking**:
   * Every edit session records the `base_version` loaded into memory.
   * On commit, the backend checks if `base_version === current_version`.
   * If another user committed in the interim, the commit is rejected with HTTP 409 Conflict rather than silently destroying the other user's changes.
2. **Explicit Conflict Resolution**:
   * User can choose:
     * *Overwrite with my version* (creates new version, increments version number).
     * *Save as new file copy* (creates `{filename} (Copy).xlsx`).
     * *Discard my changes & reload latest*.

---

## 3. Guaranteed Download of Latest Edited Version
* In the legacy code, `handleDownload` executed `link.href = fileData.url`, downloading the stale upload URL from when the file was first added.
* In the overhauled architecture, `handleDownload`:
  1. Calls `fileSyncService.getDownloadUrl(fileId)` to retrieve a fresh presigned URL for the **current committed canonical version**.
  2. If the user has unsaved edits in their active session, the editor prompts: *"You have unsaved changes. Would you like to commit before downloading?"*
  3. The resulting downloaded binary matches the active screen content with 100% cryptographic SHA-256 hash fidelity.
