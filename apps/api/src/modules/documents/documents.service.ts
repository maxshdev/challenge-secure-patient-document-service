import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Document } from './document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import type { RequestUser } from '../auth/interfaces/user.interface';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditAction } from '../../infrastructure/audit/audit-log.entity';

/** Allowed file MIME types */
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Maximum file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
        @InjectRepository(Document)
        private readonly documentRepo: Repository<Document>,
        private readonly s3Service: S3Service,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Upload a document.
     * - Only admin and doctor can upload.
     * - doctorId is inferred from authenticated user.
     * - patientId is validated from the DTO.
     */
    async upload(
        user: RequestUser,
        dto: CreateDocumentDto,
        file: Express.Multer.File,
    ): Promise<Document> {
        // Validate file presence
        if (!file) {
            throw new BadRequestException('File is required');
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException(
                `File too large: ${file.size} bytes. Maximum: ${MAX_FILE_SIZE} bytes (10MB)`,
            );
        }

        // Generate unique file key for S3
        const ext = file.originalname.split('.').pop() || 'bin';
        const fileKey = `documents/${dto.patientId}/${randomUUID()}.${ext}`;

        // Upload to S3
        await this.s3Service.uploadFile(fileKey, file.buffer, file.mimetype);

        // Save metadata to database
        const document = this.documentRepo.create({
            patientId: dto.patientId,
            doctorId: user.id, // Always from authenticated user, never from body
            fileKey,
            fileName: file.originalname,
            mimeType: file.mimetype,
        });

        const saved = await this.documentRepo.save(document);

        // Audit log
        await this.auditService.log(user.id, saved.id, AuditAction.UPLOAD);

        this.logger.log(`Document uploaded: ${saved.id} by user ${user.id}`);
        return saved;
    }

    /**
     * List all accessible documents for the current user.
     *
     * Access rules enforced at database query level:
     * - admin: all documents
     * - doctor: only documents where doctorId = user.id
     * - patient: only documents where patientId = user.id
     */
    async findAll(user: RequestUser): Promise<Document[]> {
        const queryBuilder = this.documentRepo
            .createQueryBuilder('doc')
            .select([
                'doc.id',
                'doc.patientId',
                'doc.doctorId',
                'doc.fileName',
                'doc.mimeType',
                'doc.createdAt',
            ]); // Exclude fileKey from list responses

        switch (user.role) {
            case 'admin':
                // No filter — full access
                break;
            case 'doctor':
                queryBuilder.where('doc.doctorId = :userId', { userId: user.id });
                break;
            case 'patient':
                queryBuilder.where('doc.patientId = :userId', { userId: user.id });
                break;
        }

        queryBuilder.orderBy('doc.createdAt', 'DESC');

        return queryBuilder.getMany();
    }

    /**
     * Get a single document's metadata.
     *
     * Ownership is validated: the user must be the doctor, patient, or an admin.
     */
    async findOne(user: RequestUser, documentId: string): Promise<Document> {
        const document = await this.documentRepo.findOne({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException(`Document ${documentId} not found`);
        }

        this.validateOwnership(user, document);

        // Audit log
        await this.auditService.log(user.id, document.id, AuditAction.VIEW);

        return document;
    }

    /**
     * Generate a short-lived pre-signed URL for downloading a document.
     */
    async getDownloadUrl(
        user: RequestUser,
        documentId: string,
    ): Promise<{ url: string; expiresIn: number }> {
        const document = await this.documentRepo.findOne({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException(`Document ${documentId} not found`);
        }

        this.validateOwnership(user, document);

        const expiresIn = 60; // 60 seconds
        const url = await this.s3Service.getPresignedUrl(
            document.fileKey,
            expiresIn,
        );

        // Audit log
        await this.auditService.log(user.id, document.id, AuditAction.DOWNLOAD);

        return { url, expiresIn };
    }

    /**
     * Validate that the user has access to the given document.
     * - admin: always allowed
     * - doctor: only if doctorId matches
     * - patient: only if patientId matches
     *
     * This is the core ownership check that prevents horizontal privilege escalation.
     */
    private validateOwnership(user: RequestUser, document: Document): void {
        switch (user.role) {
            case 'admin':
                return; // Full access
            case 'doctor':
                if (document.doctorId !== user.id) {
                    throw new ForbiddenException(
                        'Access denied: you can only access documents you created',
                    );
                }
                return;
            case 'patient':
                if (document.patientId !== user.id) {
                    throw new ForbiddenException(
                        'Access denied: you can only access your own documents',
                    );
                }
                return;
        }
    }
}
