# 🎙️ Secure Patient Document Service — Presentation Speech

This document is a structured script to guide your presentation or interview about this project. It connects the requirements from `TEST.md` with the senior-level expectations in `EVALUATION_REAL_TECHNICAL_TEST.md`.

---

## 1. Introduction: The "Why" behind the design

"When I approached this challenge, I didn't just want to build a CRUD API for files. I treated it as a **critical component of a Healthcare System**. Specifically, I focused on three pillars mandated by HIPAA and GDPR: **Confidentiality, Integrity, and Availability**.

My goal was to design an architecture that defaults to secure mechanisms, minimizes the blast radius of any potential breach, and provides a clear, immutable audit trail."

---

## 2. The Implementation Strategy (Spec-First)

"I started with a **Spec-First approach**. Before writing a single line of code, I defined the `SPEC.md` and `ARCHITECTURE.md`.

Why? Because in a security-sensitive environment, ambiguity is a vulnerability.
I defined the API contracts, the exact JSON shapes, and most importantly, the **Authorization Model**. I realized early on that simple RBAC (Role-Based Access Control) wasn't enough. An Admin role is easy to check, but preventing a Doctor from accessing *another* Doctor's patients requires **Resource-Level Ownership checks**.

So, I implemented a 'Defense in Depth' strategy:
1.  **Guards:** Block invalid roles at the door.
2.  **Services:** Validate ownership (`doctorId == user.id`) before returning any data.
3.  **Database:** Apply filtering logic (`WHERE doctorId = ...`) directly in the SQL queries to prevent accidental data leakage."

---

## 3. Architecture & Infrastructure Choices

"For the architecture, I chose a cloud-native approach designed for AWS ECS Fargate.

*   **Compute:** Stateless NestJS API containers. This allows horizontal scaling based on CPU load.
*   **Storage:** I utilized **AWS S3** for file storage instead of the database. Storing binaries in PostgreSQL adds latency, bloats backups, and hurts cache performance. S3 offers lifecycle policies and native encryption (SSE-KMS) out of the box.
*   **Database:** PostgreSQL 16. I used it strictly for metadata (who uploaded what, when, and where it is in S3).
*   **Infrastructure as Code (Terraform):** Although not explicitly required, I included a full Terraform module (`infra/terraform`). I believe 'Security by Design' means infrastructure should be code/versioned, creating private subnets, encrypted databases, and least-privilege IAM roles automatically."

---

## 4. Addressing the 5 Hard Requirements (The "Must Haves")

1.  **Document Upload:** "I enforce strict file validation (PDF/Images only, max 10MB) to prevent DoS attacks. The `doctorId` is never trusted from the request body; it's always inferred from the authenticated token to guarantee non-repudiation."
2.  **Listing:** "Lists are filtered at the database level. Admin sees all, Doctors see theirs, Patients see theirs. Crucially, list responses **exclude** the S3 key to prevent enumeration attacks."
3.  **Download:** "I used **Pre-signed URLs** with a 60-second expiration. This keeps the API stateless and avoids piping heavy traffic through our Node.js server, delegating the heavy lifting to S3's massive bandwidth."
4.  **Audit Logs:** "I implemented an **Append-Only** audit log. There are no Update or Delete methods in the `AuditService`. It records 'Who, What, When' for every Upload, View, and Download, but strictly excludes PHI (Protected Health Information) from the logs themselves."
5.  **Security:** "We simulate Authentication via headers, but the Authorization logic is real. In production, this would sit behind an API Gateway/ALB with WAF."

---

## 5. Senior-Level Decisions (The "Bonus" Points)

"I wanted to demonstrate operational maturity, so I went beyond the functional requirements:

*   **Migrations vs Synchronize:** I set up the project to use `synchronize: true` for dev speed, but strictly configured **TypeORM Migrations** for production. I wrote the initial migration script manually to ensure proper indexing.
*   **Data Leakage Prevention:** I used `ClassSerializerInterceptor` and `@Exclude` to ensure the internal S3 `fileKey` is **never** returned in API responses, eliminating enumeration vectors.
*   **Protection:** I implemented global **Rate Limiting** (Throttler) to prevent scraping and DoS attacks against PHI endpoints.
*   **Performance:** I created composite indexes on `(doctorId, createdAt)` because querying a doctor's history is the #1 access pattern.
*   **Mocking:** I built a local S3 mock using LocalStack, so the entire stack runs offline with `docker-compose up`, creating a smooth developer experience without needing real AWS credentials."

---

## 6. Closing Statement

"This project represents a **production-ready foundation**. It's not just checking boxes; it's a system designed to be audited, scaled, and deployed securely. The documentation in the root folder (`SPEC.md`, `ARCHITECTURE.md`) reflects exactly how I would deliver this to a client or internal stakeholder."

---

## 🧠 Q&A Preparation (Anticipating `EVALUATION.md`)

*   **Q: Why no Users table?**
    *   **A:** "Identity is external (Auth0/Cognito). Duplicating user state creates sync issues. I store UUID references only."
*   **Q: Why Terraform?**
    *   **A:** "Because manual infrastructure is risky and undocumented. IaC proves we care about reproducibility and security constraints."
*   **Q: How do you handle secrets?**
    *   **A:** "In dev, `.env`. In production, the Terraform module provisions **AWS Secrets Manager**, and the ECS Task pulls them at runtime. No secrets ever reach the git repo."
