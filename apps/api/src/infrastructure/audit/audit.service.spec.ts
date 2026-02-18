import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './audit-log.entity';

const mockAuditLogRepo = () => ({
    create: jest.fn().mockImplementation((dto) => ({
        id: 'audit-uuid',
        ...dto,
        createdAt: new Date(),
    })),
    save: jest.fn().mockImplementation((entry) => Promise.resolve(entry)),
    find: jest.fn().mockResolvedValue([]),
});

describe('AuditService', () => {
    let service: AuditService;
    let repo: ReturnType<typeof mockAuditLogRepo>;

    beforeEach(async () => {
        repo = mockAuditLogRepo();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: getRepositoryToken(AuditLog), useValue: repo },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
    });

    describe('log', () => {
        it('should create an audit entry with correct fields', async () => {
            const result = await service.log('user-1', 'doc-1', AuditAction.UPLOAD);

            expect(repo.create).toHaveBeenCalledWith({
                userId: 'user-1',
                documentId: 'doc-1',
                action: AuditAction.UPLOAD,
            });
            expect(repo.save).toHaveBeenCalledTimes(1);
            expect(result.userId).toBe('user-1');
            expect(result.documentId).toBe('doc-1');
            expect(result.action).toBe(AuditAction.UPLOAD);
        });

        it('should support VIEW action', async () => {
            await service.log('user-1', 'doc-1', AuditAction.VIEW);

            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.VIEW }),
            );
        });

        it('should support DOWNLOAD action', async () => {
            await service.log('user-1', 'doc-1', AuditAction.DOWNLOAD);

            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.DOWNLOAD }),
            );
        });
    });

    describe('findByDocumentId', () => {
        it('should return audit logs sorted by date DESC', async () => {
            await service.findByDocumentId('doc-1');

            expect(repo.find).toHaveBeenCalledWith({
                where: { documentId: 'doc-1' },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('immutability', () => {
        it('should NOT expose update or delete methods', () => {
            // AuditService must be append-only
            expect((service as any).update).toBeUndefined();
            expect((service as any).delete).toBeUndefined();
            expect((service as any).remove).toBeUndefined();
        });
    });
});
