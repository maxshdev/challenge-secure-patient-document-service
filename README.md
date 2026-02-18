# Secure Patient Document Service

Minimal secure backend service for managing patient medical documents.

This project focuses on:

- Clean backend architecture
- Strong RBAC enforcement
- HIPAA-aware design
- AWS production readiness
- Spec-driven development

---

## 📌 Overview

The system allows:

- Doctors to upload documents for patients
- Patients to view their own documents
- Admins to access all documents

Files are stored in AWS S3 (private).
Metadata is stored in PostgreSQL.
All access is strictly controlled.

---

## 🧱 Tech Stack

- Node.js + TypeScript
- NestJS 11
- PostgreSQL 16
- AWS S3 (LocalStack for local development)
- ECS Fargate (deployment target)
- RDS (PostgreSQL)
- AWS KMS
- Secrets Manager

---

## 📂 Project Structure

```
/apps/api/src
  /modules
    /documents      # Document CRUD + RBAC + ownership validation
    /auth           # Simulated auth middleware (headers)
  /common           # Guards, decorators, filters
  /infrastructure   # S3 service, Audit service (global modules)

SPEC.md
ARCHITECTURE.md
README.md
Dockerfile
docker-compose.yml
```

---

## 🚀 How to Run

### With Docker (Recommended)

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL 16** on port 5432
- **LocalStack (S3 mock)** on port 4566
- **NestJS API** on port 4000

Swagger UI: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Local Development

```bash
cd apps/api
pnpm install
cp .env.example .env    # Edit with your credentials
pnpm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASS` | `root` | Database password |
| `DB_NAME` | `patient_documents` | Database name |
| `S3_MOCK` | `true` | Use mock S3 (dev mode) |
| `S3_BUCKET_NAME` | `patient-documents-dev` | S3 bucket name |
| `AWS_REGION` | `us-east-1` | AWS region |
| `PORT` | `4000` | Server port |

In production, all secrets are managed via AWS Secrets Manager — no fallback defaults.

---

## 🔐 Security Design

### Encryption

- **In transit**: TLS (HTTPS) enforced via ALB in production. Locally, all communication is within Docker network.
- **At rest**: RDS encryption enabled (AES-256). S3 uses SSE-KMS (`aws:kms` key).
- **Secrets**: Managed via AWS Secrets Manager with automatic rotation. Never stored in source code — development defaults are only for local Docker environment.

### Access Control

RBAC + resource-level ownership validation.

Role alone is **never sufficient**. Every resource access is validated at two levels:

1. **Role check** (via `RolesGuard`): Does this role have permission for this action?
2. **Ownership check** (via `validateOwnership()`): Does this user own this specific resource?

This prevents both vertical privilege escalation (patient trying to upload) and horizontal privilege escalation (doctor A accessing doctor B's documents).

All authorization queries are executed **at the database level** — never post-fetch in memory. This ensures that even if the application layer has a bug, the database query itself will never return unauthorized records.

### Input Validation

- All UUIDs validated with `ParseUUIDPipe` — prevents injection and invalid lookups.
- File types whitelisted: only `application/pdf`, `image/jpeg`, `image/png`.
- File size limited to 10MB at both Multer and validation layers.
- DTOs validated with `class-validator` — `whitelist: true` strips unknown fields, `forbidNonWhitelisted: true` rejects them.

---

## 🗂 File Storage Strategy

- **Private S3 bucket** — `Block Public Access` enabled, no public ACL.
- Only S3 object keys (`fileKey`) stored in database — never full URLs.
- Files served exclusively via **short-lived pre-signed URLs** (60s expiration).
- `fileKey` is deliberately **excluded** from `GET /documents` list responses to prevent key enumeration.
- Upload key structure: `documents/{patientId}/{uuid}.{ext}` — namespaced by patient for organizational clarity.

Why pre-signed URLs instead of proxying through the API:
- Reduces API server load (S3 serves the file directly).
- S3 handles bandwidth and concurrent downloads.
- URL expiration limits the window of exposure if a URL is leaked.
- In production, CloudFront signed URLs would add CDN caching and edge delivery.

---

## 🧾 Auditing

All sensitive operations generate **immutable, append-only** audit entries:

| Action | Trigger | What is recorded |
|--------|---------|-----------------|
| `UPLOAD` | Document uploaded to S3 | userId, documentId, action, timestamp |
| `VIEW` | Document metadata accessed | userId, documentId, action, timestamp |
| `DOWNLOAD` | Pre-signed URL generated | userId, documentId, action, timestamp |

### Design decisions:

- **Append-only**: The `AuditService` exposes **no update or delete methods**. This is a deliberate architectural decision — even if a developer tries to add one, the interface doesn't support it.
- **No PHI in logs**: Audit entries reference only UUIDs and action types. Patient names, file contents, medical data, and pre-signed URLs are never logged.
- **Infrastructure-level auditing**: In production, AWS CloudTrail captures all API calls to S3 and RDS. S3 access logging records every object-level operation. These complement the application-level audit table.
- **Retention**: In production, audit logs would have a configured retention policy (e.g., 7 years for HIPAA) and would be shipped to CloudWatch Logs with alarm triggers for anomalous access patterns.

---

## 🏥 HIPAA Awareness

This system handles Protected Health Information (PHI). While not a full HIPAA implementation, it incorporates key principles:

- ✅ **Minimum Necessary Rule**: Users only see documents they own or are authorized for. Queries are filtered at the database level — no over-fetching.
- ✅ **Audit Trail**: Every access to PHI generates an immutable audit entry. No sensitive data is stored in log entries.
- ✅ **Encryption**: SSE-KMS at rest (S3), RDS encryption at rest, TLS in transit.
- ✅ **Access Controls**: RBAC + resource-level ownership validation. Defense in depth — role check + ownership check.
- ✅ **Data Separation**: File content stored in S3 (encrypted), metadata in PostgreSQL (encrypted). A breach of one doesn't expose the other.
- ✅ **Short-lived Access**: Pre-signed download URLs expire in 60 seconds, limiting exposure window.
- ✅ **Secrets Hygiene**: In production, all credentials managed via Secrets Manager with automatic rotation. No secrets in source code.

---

## ⚖️ Trade-offs

| Decision | Rationale | Production alternative |
|----------|-----------|----------------------|
| Simulated auth (headers) | Challenge requirement — isolates auth concern from scope | JWT with refresh tokens, verified by middleware |
| `synchronize: true` | Development convenience — instant schema updates | TypeORM migrations with explicit version control |
| In-memory file buffer | Simplicity — file buffered before S3 upload | Stream directly to S3 using multipart upload |
| Single S3 bucket | Simplicity for challenge scope | Per-tenant buckets or prefix-based isolation with IAM policies |
| No FK to users table | Auth is external — no local user table exists | FK to users table if auth is internalized |
| Default passwords in code | Local development convenience | No defaults — fail fast if env vars are missing in production |

---

## ✨ Implemented Enhancements (Bonus)
 
- ✅ **Database Migrations**: Managed via TypeORM CLI (`src/database/migrations`). Production deployments run migrations automatically on startup (`migrationsRun: true`), ensuring schema consistency without manual intervention.
- ✅ **Infrastructure as Code (Terraform)**: Complete AWS environment (VPC, ECS, RDS, S3, KMS) defined in `infra/terraform`. Enforces security best practices like encryption at rest and least privilege IAM roles.
- ✅ **Pre-signed URLs**: Secure file downloads via short-lived (60s) S3 URLs.
- ✅ **Input Validation**: Strict typing with DTOs and `class-validator`.
- ✅ **Audit Logging**: Immutable, append-only audit trail for compliance.

---

## 🔮 Improvements With More Time

- **Streaming uploads** to S3 via multipart upload (avoid memory buffering)
- **Read replicas** for scaling read-heavy document listing
- **Rate limiting** on download endpoints to prevent abuse
- **File virus scanning** with ClamAV before S3 upload
- **SIEM integration** for real-time security monitoring
- **Document versioning** with soft deletes for audit compliance
- **E2E tests** with Testcontainers for full integration coverage
- **CI/CD pipeline** with GitHub Actions (lint → test → build → deploy)

---

## 🧠 Short Questions

### 1. Data Protection — Where would you apply encryption in this system and why?

Encryption is applied at **three layers**, each protecting against a different threat vector:

**In transit (TLS)**: All communication between client and API is encrypted via HTTPS. In the AWS deployment, TLS terminates at the Application Load Balancer with a certificate managed by ACM. This prevents man-in-the-middle attacks and eavesdropping on medical data as it travels over the network. Internally, communication between ECS tasks and RDS/S3 also uses TLS-encrypted connections.

**At rest (S3 — SSE-KMS)**: Files stored in S3 are encrypted using Server-Side Encryption with AWS KMS managed keys. This means that even if someone gains direct access to the S3 storage backend, the files are unreadable without the KMS key. I chose SSE-KMS over SSE-S3 because KMS provides audit trails of key usage via CloudTrail, key rotation policies, and fine-grained IAM control over which services can decrypt.

**At rest (RDS)**: The PostgreSQL database is encrypted with AES-256 at the storage level. This protects database snapshots, automated backups, and the underlying EBS volumes. A leaked snapshot is encrypted and useless without the KMS key.

The rationale is **defense in depth** — even if one layer is compromised, the others still protect the data. This is a core HIPAA requirement: PHI must be encrypted both in transit and at rest.

---

### 2. Access Control — How do you ensure a doctor cannot access another doctor's documents?

Access control is enforced at **two levels** to prevent both vertical and horizontal privilege escalation:

**Level 1 — Role-based (RBAC)**: The `RolesGuard` checks whether the user's role is permitted for the requested action. For example, patients cannot call `POST /documents` because the guard enforces `@Roles('admin', 'doctor')`. This prevents vertical escalation.

**Level 2 — Resource-level ownership**: Every `findOne()` and `getDownloadUrl()` call passes through `validateOwnership()`, which checks:
- If the user is a doctor: `document.doctorId === user.id`
- If the user is a patient: `document.patientId === user.id`
- If the user is an admin: no restriction

For `findAll()`, the filtering happens **at the database query level** using `queryBuilder.where('doc.doctorId = :userId')`. This means the SQL query itself never returns unauthorized records — even if there's a bug in the application layer, the database will not leak data from other doctors.

Additionally, `doctorId` is **always inferred from the authenticated user** (`user.id`), never accepted from the request body. This prevents a doctor from spoofing another doctor's identity during upload.

This two-layer approach is a **defense in depth** strategy — RBAC catches broad violations, ownership catches specific IDOR (Insecure Direct Object Reference) attacks.

---

### 3. File Storage — How would you securely store and serve files in S3?

The file storage strategy follows the principle of **never exposing direct access**:

**Storage**: Files are uploaded to a **private S3 bucket** with `Block Public Access` enabled. The bucket policy restricts access to only the ECS task's IAM role — no other AWS principal can read or write objects. Files are encrypted with SSE-KMS on upload (`ServerSideEncryption: 'aws:kms'`).

**Serving**: Files are never served directly. Instead, the API generates a **pre-signed URL** with a 60-second expiration. This URL grants temporary, read-only access to a specific S3 object. After 60 seconds, the URL becomes invalid. The user must re-authenticate and re-request to get a new URL.

**Key isolation**: The `fileKey` (S3 object key) is stored in the database but is **excluded from list responses**. Only `findOne()` and `getDownloadUrl()` have access to it, both behind ownership validation. This prevents key enumeration attacks.

In production, I would add **CloudFront signed URLs** for edge caching and global distribution, and **S3 Object Lock** for compliance mode to prevent deletion of medical records during retention periods.

---

### 4. Auditing — How would you audit access to patient data?

Auditing operates at **two complementary levels**:

**Application level**: Every sensitive operation (UPLOAD, VIEW, DOWNLOAD) generates an immutable audit entry in the `audit_logs` PostgreSQL table. Each entry records: `userId` (who), `documentId` (what), `action` (how), and `createdAt` (when). The `AuditService` deliberately exposes **no update or delete methods** — this is an architectural guarantee of immutability, not just a policy.

**Infrastructure level**: AWS CloudTrail captures all API calls to S3 and RDS, providing a second, independent audit trail. S3 server access logging records every object-level operation (GetObject, PutObject). These logs are shipped to a separate S3 bucket that the application IAM role cannot modify — ensuring that even a compromised application cannot tamper with its own audit trail.

**What is NOT logged**: File contents, patient names, medical data, pre-signed URLs, authentication tokens, and secrets are **never** included in audit entries. Only opaque UUIDs and action types are stored. This ensures that the audit trail itself does not become a PHI exposure vector.

**Retention and alerting**: In production, audit logs would have a 7-year retention policy (HIPAA requirement) and would be integrated with CloudWatch Alarms to detect anomalous access patterns — for example, a single user accessing an unusually high number of documents in a short period.

---

### 5. Incident Scenario — If a database snapshot is leaked, what limits the damage?

Multiple layers of protection limit the blast radius:

1. **Encryption at rest**: RDS snapshots are encrypted with KMS. Without the KMS decryption key, the snapshot data is unreadable binary. The attacker would need both the snapshot AND the KMS key, which requires separate IAM permissions.

2. **No files in database**: The database stores only metadata and S3 object keys — not the actual medical files. Even if the snapshot is decrypted, the attacker gets UUIDs and file paths, not patient records.

3. **Short-lived keys are useless**: S3 pre-signed URLs are never stored in the database. The `fileKey` alone is insufficient to access S3 without valid AWS credentials.

4. **No secrets in database**: Database credentials, AWS keys, and application secrets are managed via Secrets Manager — they are never stored in application tables.

5. **Immediate response**: Credentials are rotated immediately. The compromised snapshot's encryption key is disabled. All active sessions are invalidated. CloudTrail logs are reviewed to determine the scope of the breach.

6. **Data minimization**: The database intentionally stores the minimum necessary data. There are no patient names, addresses, or medical record contents in any table — only opaque UUIDs that reference external systems.

---

### 6. Spec-Driven Development — Why is writing a spec before coding useful?

A spec serves three critical functions:

**Reduces ambiguity**: The challenge requirements leave several things undefined — What HTTP status codes should each endpoint return? What happens if the file type is invalid? Can a doctor upload for any patient? Writing the spec forces you to confront these questions *before* writing code, when changes are cheap. Each assumption is documented explicitly, creating a contract that can be reviewed.

**Enables parallel work**: With a clear spec, multiple developers can work simultaneously — one on the controller, one on the service, one on tests — because the contracts (input/output shapes, error codes, access rules) are defined upfront. Without a spec, developers make inconsistent assumptions and integration breaks.

**Creates a testable contract**: The spec becomes the source of truth for test cases. Each endpoint's access rules translate directly into unit tests. Each error case in the spec becomes a negative test. This is how I derived the 29 test cases — systematically from the spec's access rules and validation constraints.

In practice, writing the `SPEC.md` took ~20 minutes but saved significantly more by eliminating rework and providing clarity throughout implementation.

---

### 7. Working with AI — How would you use a spec to guide an AI coding assistant?

A spec constrains AI output in three ways:

**Defined contracts prevent hallucination**: Without a spec, an AI assistant will invent API shapes, database schemas, and authorization rules based on training data. These inventions may be plausible but wrong for your specific requirements. A spec provides exact field names, types, access rules, and constraints that the AI must follow — reducing the surface area for incorrect assumptions.

**Incremental implementation**: Instead of asking "build a document management system," you can ask "implement POST /documents as specified in SPEC.md section 4.1." This scopes the AI's work to a single, verifiable unit. You can review each piece against the spec before moving to the next.

**Test generation**: The spec's access rules translate directly into test assertions. You can ask the AI to generate tests for "doctor can only see documents where doctorId = user.id" — a specific, verifiable requirement from the spec. The AI has clear success criteria rather than guessing what "works correctly" means.

The key principle: **the spec is the shared context between human and AI**. It replaces the implicit knowledge that a human developer would accumulate over time, giving the AI the same constraints and expectations.

---

### 8. Ambiguity — If a requirement is unclear, how do you proceed?

My approach follows three steps:

1. **Document the ambiguity explicitly**: In `SPEC.md`, unclear requirements are listed as assumptions with their chosen resolution. For example: "The challenge says 'Upload document' but doesn't specify who sets `doctorId`. Assumption: `doctorId` is always inferred from the authenticated user, never from the request body." This makes the decision visible and reviewable.

2. **Choose the conservative path**: When in doubt, I default to the more restrictive option. For access control ambiguities, I deny by default. For input validation, I reject by default. It's safer to relax a restriction later than to discover a security hole in production.

3. **Design for changeability**: If I'm unsure whether a requirement will evolve, I isolate the decision behind an abstraction. For example, the `validateOwnership()` method centralizes all ownership logic — if the rules change, there's exactly one place to update.

The worst outcome is making an assumption silently and implementing it without documentation. Even if my assumption is wrong, documenting it explicitly allows the evaluator (or future developer) to identify and correct it.

---

### 9. PHI Handling — What is considered sensitive data in this system, and how would you protect it?

In this system, the following data is considered PHI (Protected Health Information):

- **Medical documents** (PDFs, images) — the actual files uploaded to S3
- **Patient identifiers** (`patientId`) — links documents to specific patients
- **Doctor-patient relationships** (the association between `doctorId` and `patientId`) — reveals which doctors treat which patients
- **Document metadata** (file names, timestamps) — file names may contain diagnostic information
- **Access patterns** (who accessed what, when) — reveals treatment timelines

Protection measures:

- **Files**: Encrypted at rest in S3 (SSE-KMS). Never served directly — only via 60-second pre-signed URLs behind ownership validation.
- **Metadata**: Encrypted at rest in RDS. Access filtered at database query level per user role and ownership. `fileKey` excluded from list responses.
- **Relationships**: Only visible to the involved doctor, the patient, and admins. No cross-doctor or cross-patient visibility.
- **Access patterns**: Audit logs store only UUIDs. Application logs reference only IDs, never names or file contents.
- **In transit**: All data encrypted via TLS. CORS restricted to localhost in development; specific domains in production.

Key principle: **data minimization**. The system stores the minimum necessary information. No patient names, no medical record contents, no diagnostic codes in the database. Only opaque UUIDs that reference external identity systems.

---

### 10. Logging — What data should NOT be logged, and why?

The following must **never** appear in application or infrastructure logs:

| Data | Why not |
|------|---------|
| **File contents** | Medical documents are PHI — logging them creates an uncontrolled copy of protected data |
| **Pre-signed S3 URLs** | A logged URL can be used by anyone within its expiration window. Log files are often less protected than the application itself |
| **Authentication tokens/headers** | Logged tokens can be replayed. `x-user-id` and `x-user-role` headers should be used but not logged verbatim |
| **Patient identifiers with context** | Logging "patient John Smith accessed document X" creates PHI in logs. Instead, log "user uuid-abc accessed document uuid-xyz" |
| **AWS credentials and secrets** | Even temporary credentials in logs are an attack vector. Secrets Manager rotation doesn't help if the secret was already logged |
| **Stack traces with request data** | Error stack traces often include request bodies, which may contain `patientId` and file data |
| **S3 object keys** | The key contains the patient ID in its path (`documents/{patientId}/...`). Logging it exposes the relationship |

The implementation enforces this: `AuditService` logs only `user={uuid} action={type} document={uuid}` — three opaque identifiers and an action enum. No PHI leaks through the logging layer.

In production, I would additionally configure log scrubbing rules in CloudWatch to automatically redact patterns that match UUIDs, emails, or file paths before they reach long-term storage.

---

### 11. Compliance — What additional steps would be required to make this system production-ready for healthcare use?

Moving from this challenge implementation to a production healthcare system requires:

1. **Business Associate Agreement (BAA)** with AWS — legally required before storing PHI on AWS infrastructure. AWS offers HIPAA-eligible services, but a BAA must be in place.

2. **Formal HIPAA security risk assessment** — a structured analysis of all systems that handle PHI, identifying vulnerabilities and documenting mitigation strategies. This is a regulatory requirement, not optional.

3. **Real authentication** — replace simulated headers with JWT-based authentication using an identity provider (Cognito, Auth0, or internal IdP). Implement token refresh, session management, and MFA for clinical staff.

4. **Database migrations** — replace `synchronize: true` with version-controlled migration files. Every schema change must be reviewable, reversible, and auditable.

5. **Penetration testing** — professional security assessment covering OWASP Top 10, IDOR, broken access control, and injection attacks. Should be performed annually and after significant changes.

6. **Key rotation policies** — KMS keys, database credentials, and API keys must be rotated automatically on a defined schedule. AWS Secrets Manager supports automatic rotation with Lambda functions.

7. **Incident response plan** — documented procedures for breach detection, containment, notification (HIPAA requires notification within 60 days), and remediation. The plan must be tested regularly.

8. **Disaster recovery** — RDS Multi-AZ deployment, automated backups with cross-region replication, S3 cross-region replication, and documented RTO/RPO targets.

9. **Data retention policies** — HIPAA requires medical records to be retained for specific periods (varies by state, typically 6-10 years). S3 Object Lock in compliance mode can enforce this.

10. **Monitoring and alerting** — CloudWatch dashboards for API latency, error rates, and database load. CloudTrail alarms for unauthorized access attempts. GuardDuty for threat detection.

11. **Infrastructure as Code** — Terraform or CDK to define all infrastructure declaratively. Enables reproducible deployments, peer review of infrastructure changes, and drift detection.
