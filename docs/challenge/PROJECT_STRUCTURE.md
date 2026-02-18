# Project Structure

```
challenge-secure-patient-document-service/
├── README.md                           # Main documentation
├── Dockerfile                          # Multi-stage build
├── docker-compose.yml                  # PG + LocalStack + API
├── .dockerignore
│
├── docs/challenge/
│   ├── TEST.md                         # Original challenge requirements
│   ├── SPEC.md                         # API specification
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── README.md                       # Challenge answers + details
│   ├── PROJECT_STRUCTURE.md            # This file
│   ├── TECHNICAL_INTERVIEW_SIMULATION.md
│   └── IMPLEMENTATION_ROADMAP.md       # Development roadmap
│
└── apps/api/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    │
    └── src/
        ├── main.ts                      # Bootstrap + DB auto-creation
        ├── app.module.ts                # Root module (TypeORM, ConfigModule)
        ├── app.controller.ts            # Health check endpoint
        ├── app.service.ts
        │
        ├── modules/
        │   ├── auth/
        │   │   ├── auth.middleware.ts        # Simulated auth via headers
        │   │   ├── auth.middleware.spec.ts   # 7 tests
        │   │   └── interfaces/
        │   │       └── user.interface.ts     # RequestUser, UserRole types
        │   │
        │   └── documents/
        │       ├── document.entity.ts        # Document entity (TypeORM)
        │       ├── documents.controller.ts   # REST endpoints + Swagger
        │       ├── documents.service.ts      # CRUD + RBAC + ownership
        │       ├── documents.service.spec.ts # 17 tests
        │       ├── documents.module.ts
        │       └── dto/
        │           └── create-document.dto.ts
        │
        ├── infrastructure/
        │   ├── s3/
        │   │   ├── s3.service.ts            # Upload, presigned URL, delete
        │   │   └── s3.module.ts             # Global module
        │   │
        │   └── audit/
        │       ├── audit-log.entity.ts      # AuditLog entity (append-only)
        │       ├── audit.service.ts         # Immutable audit logging
        │       ├── audit.service.spec.ts    # 5 tests
        │       └── audit.module.ts          # Global module
        │
        └── common/
            ├── decorators/
            │   ├── current-user.decorator.ts
            │   └── roles.decorator.ts       # @Roles() type-safe decorator
            ├── guards/
            │   └── roles.guard.ts           # RolesGuard for RBAC
            └── filters/
                └── http-exception.filter.ts
```

## Design Principles

1. **Separation of Concerns**: Auth, Documents, Audit, and S3 are independent modules
2. **Global Modules**: S3Service and AuditService are globally available
3. **Immutability**: AuditService exposes no update/delete methods
4. **Security by Default**: RBAC enforced at query level, ownership validated on every access
5. **No PHI in Logs**: Only IDs are stored in audit entries
