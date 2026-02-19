# SPEC.md — Secure Patient Document Service

## 1. Purpose

This service provides secure storage and controlled access to patient medical documents.

The system handles Protected Health Information (PHI) and must enforce strict access control, encryption, auditing, and data protection.

---

## 2. Assumptions

- Authentication is handled externally (e.g., JWT issued by an identity provider).
- A decoded user object is injected per request via middleware:

```ts
type User = {
  id: string          // UUID
  role: 'admin' | 'doctor' | 'patient'
}
```

- Files are stored in AWS S3 (private bucket, SSE-KMS encryption).
- Metadata is stored in PostgreSQL.
- All traffic is HTTPS in production (TLS terminated at ALB).
- The API is stateless — no server-side sessions.
- `doctorId` is always inferred from the authenticated user, never from the request body.
- There is no users table — the system trusts the identity provided by the auth layer.
- Documents are immutable once uploaded (no update or delete in current scope).

---

## 3. Entities

### 3.1 Document

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Primary identifier | PK, auto-generated |
| patientId | UUID (varchar 36) | Patient this document belongs to | NOT NULL, indexed |
| doctorId | UUID (varchar 36) | Doctor who uploaded | NOT NULL, indexed |
| fileKey | string (varchar 512) | S3 object key | NOT NULL, unique |
| fileName | string (varchar 255) | Original file name | nullable |
| mimeType | string (varchar 100) | File MIME type | nullable |
| createdAt | timestamp | Creation timestamp | auto-generated |

Indexes:

- `idx_patientId` on `patientId` — for patient document lookups
- `idx_doctorId` on `doctorId` — for doctor document lookups
- Composite `idx_doctorId_createdAt` on `(doctorId, createdAt)` — for sorted doctor queries

Design decisions:

- `patientId` and `doctorId` are stored as `varchar(36)` not FK references because the users table is external (auth is handled by a separate service). In a monolithic system, these would be foreign keys.
- `fileKey` is unique to prevent duplicate S3 object writes.
- `fileName` and `mimeType` are stored for display and validation purposes.

---

### 3.2 AuditLog

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Primary key | PK, auto-generated |
| userId | UUID (varchar 36) | Who performed the action | NOT NULL, indexed |
| documentId | UUID (varchar 36) | Affected document | NOT NULL, indexed |
| action | enum | UPLOAD / VIEW / DOWNLOAD | NOT NULL |
| createdAt | timestamp | Event timestamp | auto-generated |

Constraints:

- **Append-only table**: The application service exposes no update or delete methods. This is enforced architecturally, not just by policy.
- No PHI is stored in audit entries — only opaque UUIDs and action types.

---

## 4. API Endpoints

### 4.1 POST /documents

Upload a document for a patient.

**Request:**
- Content-Type: `multipart/form-data`
- Body fields:
  - `file` (required): Document file (binary)
  - `patientId` (required): UUID of the patient

**Authorization:**
- ✅ admin → allowed
- ✅ doctor → allowed (becomes the `doctorId`)
- ❌ patient → 403 Forbidden

**Validation rules:**
- `patientId` must be a valid UUID
- `file` must be present
- File MIME type must be one of: `application/pdf`, `image/jpeg`, `image/png`
- File size must not exceed 10MB
- `doctorId` is always `user.id` — never accepted from request body

**Response — 201 Created:**
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "doctorId": "uuid",
  "fileName": "medical-report.pdf",
  "mimeType": "application/pdf",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 Bad Request | Missing file, invalid MIME type, file too large, missing patientId |
| 401 Unauthorized | Missing `x-user-id` or `x-user-role` headers |
| 403 Forbidden | User role is `patient` (cannot upload) |

**Side effects:**
- File uploaded to S3 with SSE-KMS encryption
- Audit log entry created (action: UPLOAD)

---

### 4.2 GET /documents

List accessible documents for the authenticated user.

**Authorization (query-level filtering):**
- admin → returns all documents (no filter)
- doctor → returns documents where `doctorId = user.id`
- patient → returns documents where `patientId = user.id`

**Response — 200 OK:**
```json
[
  {
    "id": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "fileName": "medical-report.pdf",
    "mimeType": "application/pdf",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**Important:** Internal S3 keys (fileKey) are excluded from all responses.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 Unauthorized | Missing authentication headers |

**Edge cases:**
- Returns empty array `[]` if no documents match — not 404.
- Results are ordered by `createdAt DESC`.

---

### 4.3 GET /documents/:id

Get metadata for a specific document.

**Authorization (ownership validation):**
- admin → always allowed
- doctor → only if `document.doctorId === user.id`
- patient → only if `document.patientId === user.id`

**Response — 200 OK:**
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "doctorId": "uuid",
  "fileName": "medical-report.pdf",
  "mimeType": "application/pdf",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Note:** `fileKey` is strictly internal. Use `GET /documents/:id/download` to access file content.
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 Unauthorized | Missing authentication headers |
| 403 Forbidden | User does not own this document |
| 404 Not Found | Document ID does not exist |

**Side effects:**
- Audit log entry created (action: VIEW)

---

### 4.4 GET /documents/:id/download (Bonus)

Generate a short-lived pre-signed S3 URL for downloading the document.

**Authorization:** Same as GET /documents/:id (ownership validated).

**Response — 200 OK:**
```json
{
  "url": "https://bucket.s3.amazonaws.com/documents/...?X-Amz-Signature=...",
  "expiresIn": 60
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401 Unauthorized | Missing authentication headers |
| 403 Forbidden | User does not own this document |
| 404 Not Found | Document ID does not exist |

**Side effects:**
- Audit log entry created (action: DOWNLOAD)

**Security note:** The pre-signed URL expires in 60 seconds. After expiration, the URL returns 403 from S3 itself. The URL grants read-only access to a single object.

---

## 5. Authorization Model

### Strategy: RBAC + Resource-Level Ownership

Role-based access control (RBAC) is the **first** layer. It controls *what actions* a user can perform:

| Role | Upload | List | View | Download |
|------|--------|------|------|----------|
| admin | ✅ | ✅ (all) | ✅ (any) | ✅ (any) |
| doctor | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| patient | ❌ | ✅ (own) | ✅ (own) | ✅ (own) |

Resource-level ownership is the **second** layer. It controls *which specific resources* a user can access:

- Enforced via `validateOwnership()` for single-resource operations
- Enforced via `queryBuilder.where()` for list operations — filtering happens at SQL level

### Why two layers?

RBAC alone does not prevent horizontal privilege escalation. A doctor with valid role could access another doctor's documents (IDOR attack). The ownership check prevents this by validating the specific resource against the requesting user.

### Critical invariant:

`doctorId` is **always** derived from `user.id` during upload. It is never accepted from the request body. This prevents a doctor from impersonating another doctor.

---

## 6. Security Constraints

- No public S3 bucket access — `Block Public Access` enabled.
- Only S3 object keys stored in database — no full URLs.
- No direct file URLs exposed — only pre-signed URLs with short expiration.
- TLS enforced in production (ALB → ECS).
- Input validation required on all endpoints (UUIDs, file types, file size).
- Sensitive data must not appear in application logs (PHI, tokens, URLs, secrets).
- Default database passwords are for development only — production uses Secrets Manager with no fallback.

---

## 7. Audit Requirements

Every sensitive operation must generate an immutable audit entry.

Tracked operations:

| Action | When |
|--------|------|
| UPLOAD | Document created and file uploaded to S3 |
| VIEW | Document metadata retrieved via GET /documents/:id |
| DOWNLOAD | Pre-signed URL generated via GET /documents/:id/download |

Note: `GET /documents` (list) does **not** generate individual audit entries — it returns filtered results without accessing specific documents.

Audit logs are:
- Append-only (no update/delete methods exist)
- PHI-free (only UUIDs and action types)
- Timestamped automatically
- Indexed by userId and documentId for efficient querying

---

## 8. Non-Functional Requirements

- Stateless API — no server-side sessions
- Horizontally scalable — ECS auto-scaling, stateless design
- Least privilege IAM — task-level roles, no wildcard permissions
- Encryption at rest — RDS (AES-256), S3 (SSE-KMS)
- Encryption in transit — TLS 1.2+
- No PHI in application logs
- Audit trail for all sensitive operations
- 10MB file size limit
- Rate limiting (Throttling) enabled to prevent scraping
- Response times < 500ms for metadata operations
