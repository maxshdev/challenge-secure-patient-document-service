import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { Client } from 'pg';

/**
 * Ensure the PostgreSQL database exists before TypeORM connects.
 * Connects to the default `postgres` database to run CREATE DATABASE.
 */
async function createDatabaseIfNotExists() {
  const dbName = process.env.DB_NAME || 'patient_documents';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'root',
    database: 'postgres', // Connect to default DB to create our target DB
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`✅ Database "${dbName}" already exists`);
    }
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  await createDatabaseIfNotExists();

  const app = await NestFactory.create(AppModule);

  // Global prefix /api
  app.setGlobalPrefix('api');

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Secure Patient Document Service')
    .setDescription(
      'Minimal secure backend service for managing patient medical documents. RBAC + HIPAA-aware design.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-user-id',
        in: 'header',
        description: 'Simulated user ID (UUID)',
      },
      'x-user-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-user-role',
        in: 'header',
        description: 'Simulated user role: admin | doctor | patient',
      },
      'x-user-role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // CORS — localhost only for challenge scope
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const hostname = new URL(origin).hostname.toLowerCase();
        const isLocal =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1';
        if (isLocal) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      } catch {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Start server
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📘 Swagger UI at http://localhost:${port}/api/docs`);
}

bootstrap();
