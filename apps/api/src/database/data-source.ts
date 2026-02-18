import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * TypeORM Data Source configuration for CLI migrations.
 *
 * This file is used by the TypeORM CLI (typeorm-ts-node-commonjs)
 * to generate, run, and revert migrations.
 *
 * It intentionally mirrors the connection settings from app.module.ts
 * but adds migration-specific configuration.
 *
 * Usage:
 *   pnpm run migration:generate -- src/database/migrations/MigrationName
 *   pnpm run migration:run
 *   pnpm run migration:revert
 */
export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'patient_documents',

    // Entity discovery — same glob as app.module.ts
    entities: [__dirname + '/../**/*.entity.{ts,js}'],

    // Migration files
    migrations: [__dirname + '/migrations/*.{ts,js}'],

    // IMPORTANT: synchronize is false for migration-based workflow
    synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
