import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3 Storage Service — handles file upload, download URL generation, and deletion.
 *
 * Files are stored in a private S3 bucket. No public URLs are ever exposed.
 * Access is controlled via short-lived pre-signed URLs.
 *
 * When S3_MOCK=true (development), operations are logged but not executed.
 */
@Injectable()
export class S3Service {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly isMock: boolean;
    private readonly logger = new Logger(S3Service.name);

    constructor(private readonly configService: ConfigService) {
        this.isMock =
            this.configService.get<string>('S3_MOCK', 'true') === 'true';
        this.bucketName = this.configService.get<string>(
            'S3_BUCKET_NAME',
            'patient-documents-dev',
        );

        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
            ...(this.isMock
                ? {
                    endpoint: this.configService.get<string>(
                        'S3_ENDPOINT',
                        'http://localhost:4566',
                    ),
                    forcePathStyle: true,
                    credentials: {
                        accessKeyId: 'test',
                        secretAccessKey: 'test',
                    },
                }
                : {}),
        });
    }

    /**
     * Upload a file to S3.
     */
    async uploadFile(
        fileKey: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<void> {
        if (this.isMock) {
            this.logger.log(
                `[MOCK] Upload file: ${fileKey} (${mimeType}, ${buffer.length} bytes)`,
            );
            return;
        }

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey,
                Body: buffer,
                ContentType: mimeType,
                ServerSideEncryption: 'aws:kms', // SSE-KMS encryption at rest
            }),
        );

        this.logger.log(`File uploaded: ${fileKey}`);
    }

    /**
     * Generate a short-lived pre-signed URL for downloading a file.
     * Default expiration: 60 seconds.
     */
    async getPresignedUrl(
        fileKey: string,
        expiresInSeconds = 60,
    ): Promise<string> {
        if (this.isMock) {
            const mockUrl = `https://${this.bucketName}.s3.amazonaws.com/${fileKey}?mock=true&expires=${expiresInSeconds}`;
            this.logger.log(`[MOCK] Pre-signed URL generated for: ${fileKey}`);
            return mockUrl;
        }

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
        });

        const url = await getSignedUrl(this.s3Client, command, {
            expiresIn: expiresInSeconds,
        });

        this.logger.log(`Pre-signed URL generated for: ${fileKey}`);
        return url;
    }

    /**
     * Delete a file from S3.
     */
    async deleteFile(fileKey: string): Promise<void> {
        if (this.isMock) {
            this.logger.log(`[MOCK] Delete file: ${fileKey}`);
            return;
        }

        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey,
            }),
        );

        this.logger.log(`File deleted: ${fileKey}`);
    }
}
