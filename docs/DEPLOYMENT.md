# VYOMABOARD — PRODUCTION DEPLOYMENT & DEVOPS SPECIFICATION

## 1. Deployment Topology
VyomaBoard separates frontend static delivery, backend API/WebSocket gateways, and relational database hosting for maximum scalability and fault tolerance.

```mermaid
flowchart TD
    Internet["Internet Users (Students & Teachers)"] --> CF["Cloudflare Edge (WAF, DNS, CDN, Turnstile)"]
    
    CF -->|Static Assets (HTML/JS/CSS)| Host_SPA["Frontend CDN Hosting (Cloudflare Pages / Vercel)"]
    CF -->|API & WebSocket Traffic| Container_Host["Dockerized Backend Service (Render / AWS ECS / Fly.io)"]
    
    Container_Host -->|Pooled Queries (PgBouncer: 6543)| Supa_DB["Supabase Managed PostgreSQL"]
    Container_Host -->|Presigned S3 Operations| R2["Cloudflare R2 Private Bucket"]
    Container_Host -->|Media Signaling & SFU| SFU_Server["LiveKit Cloud / SFU Cluster"]
```

---

## 2. Docker Architecture

### 2.1 Production Dockerfile (`backend/Dockerfile`)
The backend is packaged into a secure, minimal container running as a non-privileged user:
```dockerfile
# Multi-stage production build
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install security updates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS release
ENV NODE_ENV=production
ENV PORT=3002

# Run as non-root user for security
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "src/server.js"]
```

---

## 3. CI/CD Pipeline (GitHub Actions)
The automated workflow enforces zero-regression deployments:
1. **Lint & Type-Check**: Validates code formatting and syntax.
2. **Automated Unit & Integration Tests**: Runs tests against an ephemeral PostgreSQL service.
3. **Container Vulnerability Scan (Trivy)**: Scans container image for CVEs.
4. **Zero-Downtime Rolling Deployment**:
   * Pushes container image to registry.
   * Performs rolling container update with health check validation (`/health`).
   * Rolls back automatically if health check fails within 60 seconds.
