import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

/**
 * Audit Service — creates immutable audit log entries.
 *
 * Every sensitive operation (UPLOAD, VIEW, DOWNLOAD) must generate an audit entry.
 * This service only exposes append operations — no update or delete.
 *
 * Sensitive data (PHI, file content, tokens) is NEVER logged.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepo: Repository<AuditLog>,
    ) { }

    /**
     * Record an audit log entry for a sensitive operation.
     */
    async log(
        userId: string,
        documentId: string,
        action: AuditAction,
    ): Promise<AuditLog> {
        const entry = this.auditLogRepo.create({
            userId,
            documentId,
            action,
        });

        const saved = await this.auditLogRepo.save(entry);

        // Log the action without PHI — only IDs and action type
        this.logger.log(
            `Audit: user=${userId} action=${action} document=${documentId}`,
        );

        return saved;
    }

    /**
     * Retrieve audit logs for a specific document.
     * Only accessible by admins in production.
     */
    async findByDocumentId(documentId: string): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            where: { documentId },
            order: { createdAt: 'DESC' },
        });
    }
}
