# TECHNICAL_INTERVIEW_SIMULATION.md

# 🎤 Technical Interview Simulation

This document prepares you for a **Senior Backend / Architect** level interview.
It anticipates probing questions about your design, security choices, and infrastructure decisions.

---

## 🏗 Architecture & Infrastructure

### Q: Why did you include Terraform code? The challenge didn't explicitly ask for it.
**Strong Answer:** "Infrastructure as Code is not optional in a production environment, especially for healthcare. I wanted to demonstrate how to securely provision the AWS resources (ECS, RDS, S3, KMS) with the correct security configurations (private subnets, encryption at rest, least privilege IAM) rather than clicking around in the console. It ensures the environment is reproducible and auditable."

### Q: Why ECS Fargate instead of Lambda or EC2?
**Strong Answer:**
- **Vs Lambda:** "Lambda has cold starts which can affect latency for critical medical applications. Fargate provides consistent performance for a long-running API service while still being serverless (no OS patching)."
- **Vs EC2:** "Fargate reduces operational overhead. We don't need to manage AMI patching or scaling groups manually. It integrates natively with AWS IAM for Task Roles, which is crucial for the least-privilege security model I implemented."

### Q: You have `synchronize: true` in development but migrations in production. Why?
**Strong Answer:** "In development, speed of iteration is key, so `synchronize: true` allows rapid prototyping. However, in production, schema changes must be deterministic, versioned, and reversible. That's why I implemented TypeORM migrations (`src/database/migrations`) and configured the production entry point to run them automatically on startup. This prevents accidental data loss and ensures the code matches the database schema."

---

## 🔐 Security & HIPAA

### Q: How exactly are you protecting Patient Data (PHI)?
**Strong Answer:** "I apply **Defense in Depth** across three layers:
1.  **Infrastructure:** S3 bucket is private (Block Public Access), encrypted with SSE-KMS. Database storage is encrypted at rest.
2.  **Network:** Production traffic is TLS-encrypted. Database is in a private subnet, accessible only from the ECS tasks, not the internet.
3.  **Application:** I don't just rely on role checks. Every access to a document passes through a 'Resource Ownership' check (`validateOwnership` in `DocumentsService`). A doctor can only see documents *they created*, and patients can only see documents *linked to them*. This prevents Horizontal Privilege Escalation (IDOR)."

### Q: Why did you use Pre-signed URLs instead of streaming the file through the API?
**Strong Answer:** "Streaming large medical files (e.g., high-res X-rays) through the Node.js API would consume heavy CPU/Memory and block the event loop, limiting scalability. Pre-signed URLs offload the data transfer to S3, which is designed for high bandwidth. It also keeps the API stateless and lightweight. The URL expires in 60 seconds, which minimizes the exposure window."

### Q: What prevents a malicious doctor from guessing another patient's UUID and uploading a file to them?
**Strong Answer:** "The system requires `patientId` in the upload body. While a doctor *could* technically upload for any patient (if they guessed the ID), the `DocumentsController` legally binds the `doctorId` to the *authenticated user*, not the request body. This creates an immutable audit trail: 'Dr. Smith uploaded Document X for Patient Y'. If Dr. Smith acts maliciously, we have the audit log to prove it. In a real HIMS (Hospital Information Management System), we would verify the doctor-patient relationship against an external `Appointments` or `Enrollment` service before allowing the upload."

---

## 💾 Database & Data Model

### Q: You don't have a `Users` table. How do you handle relationships?
**Strong Answer:** "The challenge specified authentication is external/simulated. In a microservices architecture, identity is often handled by a dedicated IDP (Auth0, Cognito). Authenticated requests arrive with a token containing the User ID. Storing a local `Users` table would duplicate state and create synchronization issues. Instead, I store the `patientId` and `doctorId` as UUID references. This decouples the Document Service from the Identity Service."

### Q: Why did you create a composite index on `(doctorId, createdAt)`?
**Strong Answer:** "The most common query for a doctor is 'Show me my recent documents'. A standard index on `doctorId` creates a bucket of documents, but the database still has to sort them in memory. The composite index allows the database to retrieve the doctor's documents *already sorted* by date, which significantly improves performance for paginated lists."

---

## 🚦 Operational Maturity

### Q: How would you handle a production incident where a doctor claims they can't see a file they just uploaded?
**Strong Answer:** "First, I'd check the **Audit Logs** (table `audit_logs`).
1.  Did the UPLOAD action succeed?
2.  Is there a subsequent VIEW attempt?
3.  If the upload failed, I'd check CloudWatch Logs for S3 5xx errors.
4.  If the upload succeeded but they can't see it, I'd verify the `doctorId` on the document matches their User ID. It's possible they uploaded it under a different account or the frontend is filtering it out."

### Q: What is the disaster recovery plan?
**Strong Answer:** "We have **RDS automated backups** (7-day retention) and **S3 Versioning**.
- If a row is deleted: Restore from RDS Point-in-Time Recovery.
- If a file is overwritten/deleted: In S3, previous versions are preserved by versioning.
- If the region goes down: In a future phase, we would enable Cross-Region Replication for both S3 and RDS to fail over to a secondary region."

---

## 🧠 "Gotcha" Questions

### Q: Why not just store the file in Base64 in the database?
**Strong Answer:** "That's a 'blob antipattern'. Databases are optimized for structured queries, not binary storage. Storing files in DB creates massive BLOAT, makes backups huge and slow, and kills cache performance. S3 is cheaper, faster, and offers features like lifecycle policies (archive to Glacier) that databases can't match."

### Q: Can a patient delete their own documents?
**Strong Answer:** "Not in the current API. I successfully implemented `POST` and `GET`, but intentionally omitted `DELETE` to ensure **data immutability** for the challenge scope. Medical records generally shouldn't be deleted, only 'soft deleted' or archived. If `DELETE` were added, it would be a logical delete (`deletedAt` column), not a physical one."
