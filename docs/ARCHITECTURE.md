# VYOMABOARD — PRODUCTION ARCHITECTURE SPECIFICATION

## 1. System Overview
VyomaBoard is a cloud-based, multi-tenant collaborative educational whiteboard, classroom management, and examination platform. It enables educators and educational institutions to conduct live classes with real-time vector canvas manipulation, persistent document annotations, rich media sharing (PDF, PPT, Word, Excel), real-time audio/video/screen broadcasting, proctored coding assessments, and student performance analytics.

---

## 2. Current Architecture vs. Target Production Architecture

### 2.1 Current Architecture (Legacy & Vulnerable)
```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + Vite)"]
        UI["UI / Pages"]
        FAuth["Firebase Auth SDK"]
        FStore["Firestore SDK (Direct DB Access)"]
        FStorage["Firebase Storage SDK"]
        PublicYjs["y-websocket ('wss://demos.yjs.dev')"]
        MeshRTC["RTCPeerConnection (Mesh P2P + OpenRelay)"]
    end

    subgraph Legacy_Backend ["Legacy Node.js Server (Port 3002)"]
        Monolith["server.js (Monolithic 1005 lines)"]
        JWT["Custom JWT ({ ignoreExpiration: true })"]
        HostShell["node-pty (Spawns host cmd.exe/bash)"]
        HostExec["child_process.spawn ('gcc', 'python')"]
        LocalDisk["Local FS (/uploads, /workspaces)"]
        PgLegacy["Postgres (Partial tables: rooms, users)"]
        SqliteLegacy["database.sqlite (Unused/Divergent)"]
    end

    UI --> FAuth
    UI --> FStore
    UI --> FStorage
    UI --> PublicYjs
    UI --> MeshRTC
    UI --> Monolith

    Monolith --> JWT
    Monolith --> HostShell
    Monolith --> HostExec
    Monolith --> LocalDisk
    Monolith --> PgLegacy
```

### Critical Flaws in Current Architecture:
1. **Direct Untrusted Client-to-Database Coupling**: The frontend directly manipulates Firestore without server-side validation or Row Level Security (RLS).
2. **Competing & Split Data Stores**: Users are stored simultaneously in SQLite (`seed-accounts.js`), PostgreSQL (`server.js`), and Firestore (`Auth.jsx`).
3. **Public Unencrypted Demonstration Synchronization**: Collaborative whiteboard updates flow through `demos.yjs.dev/ws`, exposing student and school canvas data to the public internet.
4. **Host Command & Shell Execution**: Students can run arbitrary system commands via `/api/terminal` (raw `cmd.exe`/`bash` PTY) and `/api/run-code` (regex-bypassed host subprocesses).
5. **Full Mesh WebRTC with Hardcoded Public Credentials**: Every student connects to every other student ($O(N^2)$ connections) with public metered credentials (`openrelayproject`).
6. **In-Memory Volatile Communication**: Live chat messages and direct messages are lost upon server restart (`const commsRooms = {}; const chatHistory = {};`).
7. **Broken Backup Cron**: Attempts to copy an undefined variable `dbPath` to SQLite backup files nightly.

---

### 2.2 Target Production Architecture
```mermaid
flowchart TD
    subgraph Edge ["Cloudflare Edge & Security Layer"]
        CF_DNS["Cloudflare DNS & DDoS Protection"]
        CF_WAF["Cloudflare WAF & Rate Limiting"]
        CF_Turnstile["Turnstile Bot Protection"]
        CF_CDN["CDN for Static Frontend Assets"]
        R2["Cloudflare R2 Private Object Storage (Presigned URLs)"]
    end

    subgraph Identity_Data ["Supabase Platform (Core Authority)"]
        Supa_Auth["Supabase Auth (JWT, RBAC, SSO)"]
        Supa_PG["Supabase PostgreSQL (Multi-tenant)"]
        Supa_RLS["PostgreSQL Row Level Security (RLS)"]
        Supa_RT["Supabase Realtime (Chat, Presence, Events)"]
    end

    subgraph App_Backend ["Modular Node.js Backend Service"]
        API_Gateway["Express API Gateway (Strict CORS, Helmet)"]
        Auth_Middleware["Supabase JWT Auth & Permission Guards"]
        Controllers["Modular Controllers (Schools, Rooms, Exams, Files)"]
        Yjs_Service["Authoritative Yjs WebSocket Service (/yjs)"]
        Job_Queue["Asynchronous Worker (BullMQ / Cloudflare Queues)"]
    end

    subgraph Media_Layer ["Real-Time Media Layer"]
        SFU["SFU (LiveKit / Cloudflare Calls)"]
        TURN["Dedicated Authenticated TURN/STUN Infrastructure"]
    end

    subgraph Sandbox ["Isolated Code Execution"]
        Isolated_Runner["Isolated Docker / gVisor Sandboxes (No Host Access)"]
    end

    ClientApp["VyomaBoard React Client"] --> CF_DNS
    CF_DNS --> CF_WAF
    CF_WAF --> CF_CDN
    ClientApp --> Supa_Auth
    ClientApp --> Supa_RT
    ClientApp --> API_Gateway
    ClientApp --> Yjs_Service
    ClientApp --> SFU

    API_Gateway --> Auth_Middleware
    Auth_Middleware --> Controllers
    Controllers --> Supa_PG
    Controllers --> R2
    Controllers --> Job_Queue
    Controllers --> Isolated_Runner
    Yjs_Service --> Supa_PG
```

---

## 3. Technology Stack Allocation & Responsibilities

| Responsibility | Service / Technology | Justification |
| :--- | :--- | :--- |
| **Edge Security & Routing** | Cloudflare (WAF, DNS, Turnstile, CDN) | World-class DDoS mitigation, sub-millisecond edge TLS termination, bot filtering. |
| **Object Storage** | Cloudflare R2 | Zero egress fees, private buckets, short-lived HMAC signed upload/download URLs. |
| **Primary Identity & Auth** | Supabase Auth | Native support for email/password, Google OAuth, SAML SSO, and secure JWTs. |
| **Relational Multi-tenant DB**| Supabase PostgreSQL | Strong ACID guarantees, native JSONB, connection pooling (PgBouncer), Point-In-Time Recovery. |
| **Authorization & Tenant Isolation** | PostgreSQL Row Level Security (RLS) | Database-level policy enforcement preventing tenant data leaks regardless of application layer bugs. |
| **Realtime Chat & Notifications** | Supabase Realtime | Native PostgreSQL replication stream for instant group chat, direct messages, and roster events. |
| **Collaborative Canvas Engine** | Yjs + Authoritative Server (/yjs) | Conflict-free replicated data types (CRDTs), debounced snapshot persistence into PostgreSQL. |
| **Voice, Video & Screen Share** | LiveKit / Cloudflare Calls SFU | Selective Forwarding Unit eliminating client bandwidth bottlenecks ($O(N)$ vs $O(N^2)$ mesh). |
| **Business Logic & API** | Node.js (Express Modular Architecture) | Type-safe validation (Zod), structured error handling, tokenized media provisioning. |
| **Isolated Code Execution** | Dedicated Worker Containers / Wandbox | Zero host execution risk, memory/CPU quotas, non-root disposable runtime. |

---

## 4. Key Security Boundaries
1. **Zero-Trust Client Access**: No frontend client may write directly to any table without a valid authenticated session evaluated by PostgreSQL RLS.
2. **Private File Enclave**: No uploaded document or exam attachment is publicly downloadable via static endpoints. All downloads require server-signed URLs valid for $\le 15$ minutes.
3. **No Host Access for Execution**: Student programming assignments and terminal sessions execute in sandboxed, network-restricted containers with zero access to filesystem roots, database credentials, or host sockets.
4. **Tenant Isolation**: Every database entity includes a `school_id` foreign key. RLS enforces that a member of School A cannot view, query, or mutate resources belonging to School B.
