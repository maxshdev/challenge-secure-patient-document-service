import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';

/**
 * Global Audit module — available application-wide for logging sensitive operations.
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AuditLog])],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
