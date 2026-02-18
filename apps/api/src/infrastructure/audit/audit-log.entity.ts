import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Audit actions tracked by the system.
 */
export enum AuditAction {
    UPLOAD = 'UPLOAD',
    VIEW = 'VIEW',
    DOWNLOAD = 'DOWNLOAD',
}

/**
 * AuditLog entity — immutable record of all sensitive operations.
 *
 * This table is append-only. No UPDATE or DELETE operations should be exposed.
 * Every access to patient data generates an audit entry.
 */
@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 36 })
    @Index()
    userId: string;

    @Column({ type: 'varchar', length: 36 })
    @Index()
    documentId: string;

    @Column({ type: 'enum', enum: AuditAction })
    action: AuditAction;

    @CreateDateColumn()
    createdAt: Date;
}
