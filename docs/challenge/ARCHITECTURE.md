# ARCHITECTURE.md

## 1. System Overview

The system is a stateless REST API deployed on AWS using containerized services.

Core components:

- ECS Fargate (API)
- Application Load Balancer (HTTPS)
- RDS PostgreSQL
- S3 (private bucket)
- AWS KMS
- Secrets Manager
- CloudWatch
- CloudTrail

---

## 2. Deployment Architecture

### 2.1 Compute Layer

- Dockerized Node.js application.
- Deployed in ECS Fargate.
- Behind HTTPS Application Load Balancer.
- Auto Scaling enabled.

Why Fargate:
- No server management.
- Task-level IAM roles.
- Horizontal scalability.

---

### 2.2 Database Layer

- Amazon RDS (PostgreSQL).
- Encryption at rest enabled.
- Automated backups.
- Multi-AZ (production scenario).
- No public access.
- Security group restricted to ECS tasks.

---

### 2.3 Storage Layer

- Private S3 bucket.
- Block Public Access enabled.
- Server-side encryption using SSE-KMS.
- Strict bucket policy (ECS IAM role only).

Access Pattern:
- Files uploaded via backend.
- Files accessed via short-lived pre-signed URLs.
- No public URLs.

---

### 2.4 Secrets Management

- AWS Secrets Manager.
- Automatic rotation.
- Injected into container as environment variables.
- No secrets stored in source code.

---

### 2.5 Auditing and Monitoring

- Application-level audit table (PostgreSQL).
- AWS CloudTrail enabled.
- S3 access logging enabled.
- Centralized logs in CloudWatch.
- Retention policy configured.

---

## 3. Security Architecture

### Encryption

- TLS 1.2+ (in transit).
- RDS encryption at rest.
- S3 encryption at rest (SSE-KMS).
- KMS-managed keys.

### Access Control

- IAM roles with least privilege.
- No wildcard permissions.
- No direct DB access from public network.

### Logging Restrictions

Logs must NOT include:

- PHI content.
- File binaries.
- Pre-signed URLs.
- Authentication tokens.
- Secrets.

---

## 4. Scaling Strategy

Horizontal Scaling:
- ECS auto-scaling based on CPU/memory.

Database Scaling:
- Read replicas (if needed).
- Connection pooling.

Storage:
- S3 is inherently scalable.

Bottlenecks:
- Large file uploads.
- Database connection limits.

Mitigation:
- File size limits.
- Proper indexing.
- Connection pool configuration.

---

## 5. Incident Response Strategy

If breach detected:

1. Revoke IAM credentials.
2. Rotate secrets.
3. Isolate compromised services.
4. Review audit logs.
5. Notify stakeholders.
6. Perform forensic analysis.
7. Document remediation steps.

---

## 6. HIPAA Awareness

- Encryption at rest and in transit.
- Strict access control.
- Audit logging.
- No unnecessary PHI storage.
- BAA required with AWS.
- Formal compliance review before production.
