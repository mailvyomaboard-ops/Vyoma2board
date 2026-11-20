# VYOMABOARD — BACKUP, RESTORATION & DISASTER RECOVERY SPECIFICATION

## 1. Relational Database Backup Strategy (Supabase PostgreSQL)
Supabase provides automated, enterprise-grade daily physical backups and Continuous Point-In-Time Recovery (PITR) for PostgreSQL.

### 1.1 Automated PITR & Snapshots
* **Continuous WAL Archiving**: Allows rolling back the database to any millisecond within the retention window (7 to 30 days depending on tier).
* **Daily Full Logical Backups**: Automated snapshots taken at 00:00 UTC.

### 1.2 Independent Off-Site S3/R2 Backup Pipeline
In addition to Supabase's managed backups, an automated nightly worker dumps a logical backup directly to a private Cloudflare R2 backup bucket (`vyomaboard-backups`):
```bash
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="vyomaboard_backup_$(date +%Y%m%d_%H%M%S).dump"

# Upload to Cloudflare R2 private archive
aws s3 cp "vyomaboard_backup_*.dump" "s3://vyomaboard-backups/postgres/" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

---

## 2. Object Storage Replication & Retention (Cloudflare R2)
* **Durability**: 99.999999999% (11 9's) annual durability.
* **Bucket Versioning**: Enabled on `vyomaboard-assets` to protect against accidental file deletions or malicious student overwrites.
* **Lifecycle Rules**:
  * Deleted files remain in version history for 30 days before permanent purging.
  * Temporary export archives (ZIPs, converted PDFs) are purged automatically after 7 days.

---

## 3. Disaster Recovery & Restoration Procedures

### 3.1 Scenario A: Accidental Table Deletion or Data Corruption
1. Identify the timestamp $T_{\text{corrupt}}$ of the incident.
2. In the Supabase Dashboard, navigate to **Database -> Backups -> Point in Time Recovery**.
3. Select recovery point $T_{\text{corrupt}} - 1 \text{ minute}$.
4. Trigger restore. Supabase spins up the restored replica and repoints the connection pooler automatically.

### 3.2 Scenario B: Full Infrastructure Rebuilding from Dump
1. Provision a clean PostgreSQL 15+ database instance.
2. Download the latest backup dump from Cloudflare R2.
3. Restore schema, tables, and data:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET_DATABASE_URL" latest_backup.dump
   ```
4. Verify table row counts and run migration integrity tests (`npm run test:db-verify`).
