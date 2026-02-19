import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    ClassSerializerInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiSecurity,
    ApiParam,
    ApiResponse,
} from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/user.interface';

@ApiTags('Documents')
@ApiSecurity('x-user-id')
@ApiSecurity('x-user-role')
@Controller('documents')
@UseInterceptors(ClassSerializerInterceptor)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    /**
     * POST /documents — Upload a document.
     * Only admin and doctor can upload.
     */
    @Post()
    @UseGuards(RolesGuard)
    @Roles('admin', 'doctor')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
        }),
    )
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Upload a patient document' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Document file with patient ID',
        schema: {
            type: 'object',
            required: ['file', 'patientId'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Document file (PDF, JPG, PNG). Max 10MB.',
                },
                patientId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'UUID of the patient this document belongs to',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file or input' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 403, description: 'Forbidden — patients cannot upload' })
    async upload(
        @CurrentUser() user: RequestUser,
        @Body() dto: CreateDocumentDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.documentsService.upload(user, dto, file);
    }

    /**
     * GET /documents — List accessible documents.
     * Filtered by role at the service/query level.
     */
    @Get()
    @ApiOperation({ summary: 'List accessible documents (filtered by role)' })
    @ApiResponse({ status: 200, description: 'List of accessible documents' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async findAll(@CurrentUser() user: RequestUser) {
        return this.documentsService.findAll(user);
    }

    /**
     * GET /documents/:id — Get document metadata.
     * Ownership validated at service level.
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get document metadata by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Document metadata' })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 403, description: 'Access denied — not the owner' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async findOne(
        @CurrentUser() user: RequestUser,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.documentsService.findOne(user, id);
    }

    /**
     * GET /documents/:id/download — Get a pre-signed S3 URL (bonus).
     * Short-lived URL (60 seconds) with ownership validation.
     */
    @Get(':id/download')
    @ApiOperation({ summary: 'Get pre-signed download URL (expires in 60s)' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({
        status: 200,
        description: 'Pre-signed URL for file download',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'Pre-signed S3 URL' },
                expiresIn: { type: 'number', description: 'Expiration in seconds' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 403, description: 'Access denied — not the owner' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async download(
        @CurrentUser() user: RequestUser,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.documentsService.getDownloadUrl(user, id);
    }
}
