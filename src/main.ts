import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { I18nService } from "nestjs-i18n";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

/**
 * Refuse to boot in production with an insecure root admin password.
 *
 * JWT_SECRET is validated unconditionally (every environment) in
 * `config/configuration.ts` via `requireJwtSecret()`, so it is not re-checked
 * here. This guard covers the root admin seed password, which has no such
 * load-time validation.
 */
function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;
  const violations: string[] = [];
  if (
    !process.env.ROOT_ADMIN_PASSWORD ||
    process.env.ROOT_ADMIN_PASSWORD === "ChangeMe!2026"
  ) {
    violations.push("ROOT_ADMIN_PASSWORD must be set to a non-default value");
  }
  if (violations.length > 0) {
    throw new Error(`Insecure production config: ${violations.join("; ")}`);
  }
}

async function bootstrap(): Promise<void> {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? false,
    credentials: true,
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(I18nService)));

  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("School SaaS API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
