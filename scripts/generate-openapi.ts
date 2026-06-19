/**
 * Generate docs/openapi.yaml from the LIVE NestJS routes (the @nestjs/swagger
 * decorators on controllers + DTOs). This is the anti-drift source of truth:
 * the spec is derived from the actual code, never hand-maintained.
 *
 * Runs the app in **preview mode** (`NestFactory.create(AppModule, { preview })`)
 * so the module/route graph is built WITHOUT instantiating providers — no
 * database connection, no admin seeder, no SMTP. A dummy JWT_SECRET is set only
 * to satisfy config validation at module-load time.
 *
 * Usage:  npm run openapi:gen
 */
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';

// js-yaml ships no bundled types; type the one function we use locally so the
// script compiles under strict mode without a dev-dependency on @types/js-yaml.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml') as {
  dump: (obj: unknown, opts?: { sortKeys?: boolean; lineWidth?: number }) => string;
};

async function generate(): Promise<void> {
  // Set before the module graph loads: configuration.ts fails fast if
  // JWT_SECRET is missing/short. Doc generation needs no real secret — this
  // value never leaves the build step. The dynamic import below guarantees the
  // env is in place before AppModule (and its config) is evaluated.
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'openapi-gen-dummy-secret-0123456789abcdef';
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';

  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  // Match runtime routing so generated paths carry the /v1 prefix.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('School SaaS Backend API')
    .setDescription(
      'Generated from the live NestJS routes by scripts/generate-openapi.ts. ' +
        'Do not edit by hand — run `npm run openapi:gen`.',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3000', 'Local')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // DocumentBuilder.setLicense requires a url; set the license object directly
  // so it carries just a name (satisfies redocly's info-license error rule).
  document.info.license = { name: 'UNLICENSED' };

  // Redocly's `security-defined` rule requires every operation to declare
  // security. Protected ops already carry it via @ApiBearerAuth(); mark the
  // remaining (public) ops with an explicit empty array so the spec lints
  // clean and the public/protected split is unambiguous.
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = (pathItem as Record<string, { security?: unknown[] }>)[method];
      if (op && op.security === undefined) {
        op.security = [];
      }
    }
  }

  const outPath = join(__dirname, '..', 'docs', 'openapi.yaml');
  const header =
    '# AUTO-GENERATED from the live NestJS routes by scripts/generate-openapi.ts.\n' +
    '# Do not edit by hand — run `npm run openapi:gen` after changing any route or DTO.\n';
  writeFileSync(
    outPath,
    header + yaml.dump(document, { sortKeys: false, lineWidth: 100 }),
  );

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${Object.keys(document.paths ?? {}).length} paths)`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('OpenAPI generation failed:', err);
  process.exit(1);
});
