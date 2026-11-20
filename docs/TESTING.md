# VYOMABOARD — COMPREHENSIVE TESTING & VALIDATION SPECIFICATION

## 1. Testing Strategy Overview
A mission-critical educational platform handling examinations, student submissions, and real-time collaboration requires comprehensive testing across multiple layers:
1. **Unit & Logic Tests**: Fast, in-memory validation of token generators, validators, and data transformers.
2. **Integration Tests**: Verification of database queries, RLS policies, and API endpoints.
3. **Cross-Tenant Negative Security Tests**: Verification that User from School A cannot access or manipulate resources of School B under any condition.
4. **WebSocket & Concurrency Tests**: Verification of Yjs conflict-free merging and room membership enforcement under multi-client load.

---

## 2. Cross-Tenant Negative Security Test Matrix

| Test ID | Description | Actor | Target Resource | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-TEST-01** | Cross-school exam inspection | Student in School A | Exam in School B | **HTTP 403 Forbidden / Empty Rows via RLS** |
| **SEC-TEST-02** | Cross-student answer tampering | Student X | Student Y's submission in same exam | **HTTP 403 Forbidden / RLS rejects update** |
| **SEC-TEST-03** | Expired JWT token API request | User with expired token | Any protected endpoint | **HTTP 401 Unauthorized** |
| **SEC-TEST-04** | Forged JWT token signature | User with modified token payload | Any protected endpoint | **HTTP 403 Forbidden** |
| **SEC-TEST-05** | Unauthorized student room deletion | Student participant | Teacher's whiteboard | **HTTP 403 Forbidden** |
| **SEC-TEST-06** | Unauthorized user kick via WebSocket | Student participant | Teacher in same room | **Ignored / Error response emitted** |
| **SEC-TEST-07** | Hardcoded dev token in production | Anonymous attacker | `/yjs` or `/comms` WS upgrade | **HTTP 401 Unauthorized** |
| **SEC-TEST-08** | Arbitrary file download without token | Anonymous attacker | Private document in R2 | **HTTP 401 / 403 Access Denied** |

---

## 3. Concurrency & Load Testing
* **Yjs Canvas Stress Test**: 50 simulated WebSocket clients concurrently inserting and mutating Excalidraw elements into a single room. Verify that no updates are dropped, no memory leaks occur, and the debounced snapshot flushes to PostgreSQL cleanly.
* **Exam Submission Rush**: 200 concurrent student submissions submitted in the final 60 seconds of an exam window. Verify that all 200 submissions are recorded with zero deadlock errors in PostgreSQL.
