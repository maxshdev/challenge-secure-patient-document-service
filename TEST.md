# Backend + AWS + Security Test (Max 4-8 Hours)

## 🎯 Objective

Build a minimal Secure Patient Document Service with a focus on:

- Backend architecture
- Security (RBAC mindset)
- AWS integration awareness
- HIPAA-aware design
- Spec-driven development

Prioritize correctness, structure, and reasoning.

---

## ⏱ Time Limit

### Maximum: 4-8 hours

## 🧱 Tech Stack

- Backend: Node.js + TypeScript
- Database: PostgreSQL
- File Storage: AWS S3 (or mock if needed)

You may use any framework or libraries.

---

## 🧠 Required Workflow (IMPORTANT)

You must follow a **spec-first approach:**

1. Write a **SPEC.md** file BEFORE coding
2. Define:
    - Entities
    - API endpoints
    - Access rules
    - Assumptions

👉 The spec will be evaluated as part of the test.

---

## 📦 Features

1. **Document Management**

Implement the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /documents | Upload document |
| GET | /documents | List accessible documents |
| GET | /documents/:id | Get document metadata |

A document has:

```
id
patientId
doctorId
fileKey
createdAt
```

---

2. **Authentication (Simulated)**

You will receive the user from a decoded token:

```
type User = {
    id: string
    role: 'admin' | 'doctor' | 'patient'
}
```

Assume the user is available in each request.

---

3. **Authorization (RBAC + Resource Rules)**

Access rules:

1. admin
  - Can access all documents
2. doctor
  - Can upload documents for patients
  - Can view documents they created
3. patient
  - Can only view documents where `patientId === user.id`

👉 You must enforce these rules in your API.

---

4. **File Storage**

- Store files in S3 (or mock)
- Store metadata in PostgreSQL
- Do NOT expose public file URLs

Bonus (optional):

- Pre-signed URLs for access

---

5. **Database**

Use PostgreSQL.
You are free to choose:

- ORM (Prisma, TypeORM, etc.)
- Raw SQL

Expected:

- Proper schema
- Clear relationships

---

## 🔐 Security Expectations

Design as if handling **sensitive medical data:**

- No public file access
- Proper authorization checks
- Avoid trusting client input blindly
- Consider encryption and access control

---

## 🏥 HIPAA Considerations

This system handles **Protected Health Information (PHI).**

You are not expected to be a legal expert, but you must design the system with a HIPAA-aware mindset.

Update your implementation and/or ARCHITECTURE.md to address:

- How sensitive data is protected (encryption at rest and in transit)
- How access to data is controlled and limited (principle of least privilege)
- How access to patient data is audited (who accessed what and when)
- What data should not be logged
- How you would respond to a potential data breach
- How secrets and credentials are managed securely

---

## 🏗 Architecture

Create a file **ARCHITECTURE.md** explaining:

### Deployment (AWS)

How you would deploy using:

- ECS / Fargate
- RDS (PostgreSQL)
- S3
- CloudTrail

### Security

Explain:

- How data is encrypted (at rest & in transit)
- How access is controlled (IAM roles, least privilege)
- How secrets are managed
- How audit logs are collected and stored

### Scaling

- How the system would scale
- Any bottlenecks

---

## 📁 Deliverables

Provide a repository or zip with:

```
- /src
- SPEC.md
ARCHITECTURE.md
README.md
README.md
```

---

Include:

- How to run the project
- Assumptions
- Trade-offs
- What you would improve with more time

---

## ⭐ Bonus (Optional)

If time permits, you may include:

- Pre-signed S3 URLs
- Input validation
- Logging strategy
- Docker setup
- Migrations
- Infrastructure as code (Terraform / CDK)
- Additional access control (e.g. per-document permissions)

---

## ❗ Important Notes

- You are not expected to build a frontend
- You are not required to fully deploy to AWS
- Focus on correctness, structure, and reasoning

---

## 🧠 Short Questions (Answer in README.md)

Please answer briefly:

1. Data Protection
- Where would you apply encryption in this system and why?

2. Access Control
- How do you ensure a doctor cannot access another doctor’s documents?

3. File Storage
- How would you securely store and serve files in S3?

4. Auditing
- How would you audit access to patient data?

5. Incident Scenario
- If a database snapshot is leaked, what limits the damage?

6. Spec-Driven Development
- Why is writing a spec before coding useful?

7. Working with AI
- How would you use a spec to guide an AI coding assistant?

8. Ambiguity
- If a requirement is unclear, how do you proceed?

9. PHI Handling
- What is considered sensitive data in this system, and how would you protect it?

10. Logging
- What data should NOT be logged, and why?

11. Compliance
- What additional steps would be required to make this system production-ready for healthcare use?

---

## ✅ Evaluation Criteria

You will be evaluated on:

- Code structure and clarity
- Correct authorization logic
- Database design
- Security awareness
- HIPAA awareness
- AWS understanding
- Quality of the spec
- Ability to explain decisions