import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// === Challenge Modules ===
import { DocumentsModule } from './modules/documents/documents.module';
import { S3Module } from './infrastructure/s3/s3.module';
import { AuditModule } from './infrastructure/audit/audit.module';

// === Auth Middleware (Simulated) ===
import { AuthMiddleware } from './modules/auth/auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'patient_documents',
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      migrations: [__dirname + '/database/migrations/*.{ts,js}'],
      autoLoadEntities: true,
      // In production: use migrations (synchronize: false, migrationsRun: true)
      // In development: use synchronize for convenience
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: process.env.NODE_ENV === 'production',
      logging: false,
    }),

    // --- Infrastructure ---
    S3Module,
    AuditModule,

    // --- Challenge Feature ---
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply simulated auth middleware to all /documents routes
    consumer.apply(AuthMiddleware).forRoutes('documents');
  }
}
