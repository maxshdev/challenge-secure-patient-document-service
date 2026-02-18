import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { Document } from './document.entity';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditAction } from '../../infrastructure/audit/audit-log.entity';

// ── Mock factories ──────────────────────────────────────────────
const mockDocument: Document = {
    id: '11111111-1111-1111-1111-111111111111',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    fileKey: 'documents/patient-uuid/test.pdf',
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    createdAt: new Date(),
};

const mockFile = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake-file-content'),
} as Express.Multer.File;

const mockDocumentRepo = () => ({
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: mockDocument.id })),
    save: jest.fn().mockImplementation((doc) => Promise.resolve({ ...mockDocument, ...doc })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDocument]),
    })),
});

const mockS3Service = () => ({
    uploadFile: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn().mockResolvedValue('https://s3.mock/presigned-url'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
});

const mockAuditService = () => ({
    log: jest.fn().mockResolvedValue({ id: 'audit-uuid' }),
});

// ── Test Suite ──────────────────────────────────────────────────
describe('DocumentsService', () => {
    let service: DocumentsService;
    let documentRepo: ReturnType<typeof mockDocumentRepo>;
    let s3Service: ReturnType<typeof mockS3Service>;
    let auditService: ReturnType<typeof mockAuditService>;

    beforeEach(async () => {
        documentRepo = mockDocumentRepo();
        s3Service = mockS3Service();
        auditService = mockAuditService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentsService,
                { provide: getRepositoryToken(Document), useValue: documentRepo },
                { provide: S3Service, useValue: s3Service },
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        service = module.get<DocumentsService>(DocumentsService);
    });

    // ── Upload Tests ────────────────────────────────────────────
    describe('upload', () => {
        it('should upload a document and return metadata', async () => {
            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const dto = { patientId: 'patient-uuid' };

            const result = await service.upload(user, dto, mockFile);

            expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
            expect(documentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    patientId: 'patient-uuid',
                    doctorId: 'doctor-uuid', // Always from user, never from body
                }),
            );
            expect(documentRepo.save).toHaveBeenCalledTimes(1);
            expect(auditService.log).toHaveBeenCalledWith(
                'doctor-uuid',
                expect.any(String),
                AuditAction.UPLOAD,
            );
            expect(result).toBeDefined();
        });

        it('should reject if no file is provided', async () => {
            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const dto = { patientId: 'patient-uuid' };

            await expect(
                service.upload(user, dto, undefined as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject invalid MIME types', async () => {
            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const dto = { patientId: 'patient-uuid' };
            const invalidFile = { ...mockFile, mimetype: 'application/zip' };

            await expect(
                service.upload(user, dto, invalidFile as Express.Multer.File),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject files exceeding 10MB', async () => {
            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const dto = { patientId: 'patient-uuid' };
            const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };

            await expect(
                service.upload(user, dto, largeFile as Express.Multer.File),
            ).rejects.toThrow(BadRequestException);
        });

        it('should always set doctorId from authenticated user, not from body', async () => {
            const user = { id: 'actual-doctor-uuid', role: 'doctor' as const };
            const dto = { patientId: 'patient-uuid' };

            await service.upload(user, dto, mockFile);

            expect(documentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ doctorId: 'actual-doctor-uuid' }),
            );
        });
    });

    // ── findAll Tests (RBAC filtering) ──────────────────────────
    describe('findAll', () => {
        let sharedQb: any;

        beforeEach(() => {
            // Create a stable QB mock so the same instance is returned each call
            sharedQb = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockDocument]),
            };
            documentRepo.createQueryBuilder.mockReturnValue(sharedQb);
        });

        it('admin should see all documents (no filter)', async () => {
            const user = { id: 'admin-uuid', role: 'admin' as const };

            await service.findAll(user);

            // admin → no .where() call
            expect(sharedQb.where).not.toHaveBeenCalled();
        });

        it('doctor should only see their own documents', async () => {
            const user = { id: 'doctor-uuid', role: 'doctor' as const };

            await service.findAll(user);

            expect(sharedQb.where).toHaveBeenCalledWith('doc.doctorId = :userId', {
                userId: 'doctor-uuid',
            });
        });

        it('patient should only see their own documents', async () => {
            const user = { id: 'patient-uuid', role: 'patient' as const };

            await service.findAll(user);

            expect(sharedQb.where).toHaveBeenCalledWith('doc.patientId = :userId', {
                userId: 'patient-uuid',
            });
        });
    });

    // ── findOne Tests (Ownership validation) ────────────────────
    describe('findOne', () => {
        it('should return document for the owning doctor', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const result = await service.findOne(user, mockDocument.id);

            expect(result).toEqual(mockDocument);
            expect(auditService.log).toHaveBeenCalledWith(
                'doctor-uuid',
                mockDocument.id,
                AuditAction.VIEW,
            );
        });

        it('should return document for the owning patient', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'patient-uuid', role: 'patient' as const };
            const result = await service.findOne(user, mockDocument.id);

            expect(result).toEqual(mockDocument);
        });

        it('admin should access any document', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'any-admin-uuid', role: 'admin' as const };
            const result = await service.findOne(user, mockDocument.id);

            expect(result).toEqual(mockDocument);
        });

        it('should throw ForbiddenException for non-owning doctor', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'other-doctor-uuid', role: 'doctor' as const };

            await expect(
                service.findOne(user, mockDocument.id),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException for non-owning patient', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'other-patient-uuid', role: 'patient' as const };

            await expect(
                service.findOne(user, mockDocument.id),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException if document does not exist', async () => {
            documentRepo.findOne.mockResolvedValue(null);

            const user = { id: 'doctor-uuid', role: 'doctor' as const };

            await expect(
                service.findOne(user, 'non-existent-uuid'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ── getDownloadUrl Tests ────────────────────────────────────
    describe('getDownloadUrl', () => {
        it('should return pre-signed URL for valid owner', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'doctor-uuid', role: 'doctor' as const };
            const result = await service.getDownloadUrl(user, mockDocument.id);

            expect(result.url).toBeDefined();
            expect(result.expiresIn).toBe(60);
            expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(
                mockDocument.fileKey,
                60,
            );
            expect(auditService.log).toHaveBeenCalledWith(
                'doctor-uuid',
                mockDocument.id,
                AuditAction.DOWNLOAD,
            );
        });

        it('should deny download for non-owner', async () => {
            documentRepo.findOne.mockResolvedValue(mockDocument);

            const user = { id: 'other-patient-uuid', role: 'patient' as const };

            await expect(
                service.getDownloadUrl(user, mockDocument.id),
            ).rejects.toThrow(ForbiddenException);
        });
    });
});
