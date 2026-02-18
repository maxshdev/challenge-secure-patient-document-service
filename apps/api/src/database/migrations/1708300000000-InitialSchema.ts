import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Initial database schema migration.
 *
 * Creates the two core tables:
 *   - documents: Patient medical document metadata
 *   - audit_logs: Immutable audit trail for sensitive operations
 *
 * This migration is idempotent and can be reverted cleanly.
 */
export class InitialSchema1708300000000 implements MigrationInterface {
    name = 'InitialSchema1708300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Install uuid-ossp extension for UUID generation ──
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ── Create documents table ──
        await queryRunner.createTable(
            new Table({
                name: 'documents',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'patientId',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'doctorId',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'fileKey',
                        type: 'varchar',
                        length: '512',
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: 'fileName',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'mimeType',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true, // ifNotExists
        );

        // ── Create indexes for documents ──
        await queryRunner.createIndex(
            'documents',
            new TableIndex({
                name: 'IDX_documents_patientId',
                columnNames: ['patientId'],
            }),
        );

        await queryRunner.createIndex(
            'documents',
            new TableIndex({
                name: 'IDX_documents_doctorId',
                columnNames: ['doctorId'],
            }),
        );

        await queryRunner.createIndex(
            'documents',
            new TableIndex({
                name: 'IDX_documents_doctorId_createdAt',
                columnNames: ['doctorId', 'createdAt'],
            }),
        );

        // ── Create audit_action enum ──
        await queryRunner.query(
            `CREATE TYPE "audit_action_enum" AS ENUM ('UPLOAD', 'VIEW', 'DOWNLOAD')`,
        );

        // ── Create audit_logs table ──
        await queryRunner.createTable(
            new Table({
                name: 'audit_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'userId',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'documentId',
                        type: 'varchar',
                        length: '36',
                        isNullable: false,
                    },
                    {
                        name: 'action',
                        type: 'audit_action_enum',
                        isNullable: false,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );

        // ── Create indexes for audit_logs ──
        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_userId',
                columnNames: ['userId'],
            }),
        );

        await queryRunner.createIndex(
            'audit_logs',
            new TableIndex({
                name: 'IDX_audit_logs_documentId',
                columnNames: ['documentId'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('audit_logs', true);
        await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
        await queryRunner.dropTable('documents', true);
    }
}
