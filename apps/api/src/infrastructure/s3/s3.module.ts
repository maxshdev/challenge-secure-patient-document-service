import { Module, Global } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * Global S3 module — available application-wide without explicit imports.
 */
@Global()
@Module({
    providers: [S3Service],
    exports: [S3Service],
})
export class S3Module { }
