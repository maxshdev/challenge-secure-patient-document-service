import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Document entity — stores metadata for patient medical documents.
 *
 * The actual file is stored in S3; only the object key (fileKey) is persisted.
 * Access is controlled via RBAC + resource ownership (doctorId / patientId).
 */
@Entity('documents')
@Index(['doctorId', 'createdAt']) // Composite index for doctor queries sorted by date
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 36 })
    @Index()
    patientId: string;

    @Column({ type: 'varchar', length: 36 })
    @Index()
    doctorId: string;

    @Column({ type: 'varchar', length: 512, unique: true })
    fileKey: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    fileName: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    mimeType: string;

    @CreateDateColumn()
    createdAt: Date;
}
