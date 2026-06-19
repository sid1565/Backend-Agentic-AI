/**
 * Standalone TypeORM DataSource for the migration CLI.
 *
 * This file is consumed ONLY by the `migration:*` npm scripts
 * (typeorm-ts-node-commonjs ... -d src/database/data-source.ts). The running
 * app configures TypeORM separately in `app.module.ts` via forRootAsync.
 *
 * It reads DB connection details straight from `process.env` (NOT from
 * `config/configuration.ts`) on purpose: migration commands must run without a
 * valid `JWT_SECRET`, and `configuration.ts` fails fast when that secret is
 * missing. Keeping this decoupled means `npm run migration:run` works in CI and
 * locally with only the `DB_*` vars set.
 *
 * Entities and migrations are globbed so new feature modules are picked up
 * automatically — scaffolding a module that ships a migration needs no edit
 * here.
 */
import { join } from 'path';
import { DataSource } from 'typeorm';

// Single default export only — the TypeORM CLI requires a data source file to
// contain exactly one DataSource export.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'school_saas',
  // Glob both .ts (ts-node CLI) and .js (compiled) so the same data source
  // works in dev and in a built image.
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  // Migrations are the source of truth here — never auto-sync from this path.
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
