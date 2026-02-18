import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating (uploading) a new document.
 *
 * - patientId is provided by the requesting doctor/admin.
 * - doctorId is ALWAYS inferred from the authenticated user (never from body).
 * - File is handled separately via multipart interceptor.
 */
export class CreateDocumentDto {
    @ApiProperty({
        description: 'UUID of the patient this document belongs to',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    @IsNotEmpty()
    patientId: string;
}
