# VYOMABOARD — SUPABASE SETUP & CONFIGURATION GUIDE

## 1. Supabase Project Initialization
Supabase serves as the authoritative multi-tenant application data store, identity provider, and real-time event broker.

### Step 1: Create Project
1. Log in to [Supabase Management Console](https://supabase.com/dashboard).
2. Create a new organization and project:
   * **Project Name**: `vyomaboard-production`
   * **Database Password**: Generate a 32-character high-entropy cryptographic password.
   * **Region**: Select the closest geographic region to your primary institutional users (e.g. `ap-south-1` Mumbai or `us-east-1` N. Virginia).

---

## 2. API Keys & Privilege Boundaries

| Key Name | Environment | Location | Security Rule |
| :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | All Environments | Client & Server | Public URL (`https://<project-ref>.supabase.co`). |
| **`SUPABASE_ANON_KEY`** | All Environments | Client & Server | Safe for public frontend exposure. Governed strictly by PostgreSQL Row Level Security (RLS). |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Backend Only | **Backend `.env` Only** | **NEVER EXPOSE TO FRONTEND**. Bypasses RLS for privileged administrative tasks, automated migrations, and system background workers. |
| **`SUPABASE_JWT_SECRET`** | Backend Only | Backend `.env` Only | Used by Node.js backend to verify Bearer JWT tokens received from client WebSocket and HTTP requests. |

---

## 3. Database Migration Deployment
1. Navigate to the **SQL Editor** in the Supabase Dashboard.
2. Execute the complete DDL script from [docs/DATABASE_SCHEMA.md](file:///c:/Users/Krrish/Downloads/Vyoma2board-main/Vyoma2board-main/docs/DATABASE_SCHEMA.md).
3. Verify that all 13 tables are present and confirm that **RLS is enabled on all tables**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   -- Every row must output: rowsecurity = true
   ```

---

## 4. Authentication Providers Configuration
In **Authentication -> Providers**:
1. **Email**:
   * Enable Email provider.
   * Configure minimum password length to at least 8 characters.
   * Enable email confirmation for production environments.
2. **Google**:
   * Enable Google OAuth.
   * Enter your Google Cloud OAuth Client ID & Secret.
   * Set authorized redirect URL to `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Enterprise SSO (SAML 2.0)**:
   * Accessible in **Authentication -> SSO** for institutional SAML/OIDC federations.

---

## 5. Supabase Realtime Channels
Enable PostgreSQL replication for real-time tables in **Database -> Publications -> supabase_realtime**:
* Add tables:
  * `chat_messages` (for instant delivery of group chat and DMs)
  * `attendance_records` (for live teacher attendance updates)
  * `boards` (for live room setting updates)
