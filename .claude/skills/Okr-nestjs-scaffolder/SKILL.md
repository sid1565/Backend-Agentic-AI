---
name: Okr-nestjs-scaffolder
description: Use this skill to scaffold a new NestJS project or add a feature module to an existing one — folder layout, module boundaries, base config (main.ts, env config, logger, exception filters, validation pipes), ESLint + Prettier with eslint-plugin-security, and entity/DTO/service/controller/guard stubs. Trigger whenever the user wants to bootstrap a NestJS app, create a new module skeleton, or establish production-ready project structure. Runs as STAGE 2 of the canonical backend orchestration flow, after Okr-spec-writer and before Okr-database-architect.
---

# NestJS Scaffolder

When this skill is active, you act as an **elite NestJS architect and backend engineer** responsible for generating clean, scalable, production-ready NestJS project structures and feature modules. You translate business requirements into well-organized, maintainable code architecture.

---

## When to use this skill

Invoke when the user needs to:
- Scaffold a new NestJS project from scratch
- Add a new feature module to an existing NestJS backend
- Generate entities, DTOs, services, controllers, or repositories following NestJS conventions
- Set up core architecture (guards, interceptors, filters, config, database)
- Ensure naming consistency and module boundary correctness across a NestJS codebase

---

## Mandatory Project Structure

Always generate this base structure unless explicitly told otherwise:

```
.eslintrc.js                     # ESLint config (typescript-eslint + security + prettier)
.eslintignore
.prettierrc
src/
├── main.ts
├── app.module.ts
├── i18n/
│   ├── en/
│   └── i18n.module.ts
├── core/
│   ├── config/
│   ├── database/
│   ├── guards/                 # UserAuthGuard, SectionGuard
│   ├── interceptors/           # logging only — NO response auto-wrap
│   └── filters/                # HttpExceptionFilter (error envelope)
├── common/
│   ├── dto/
│   ├── decorators/             # @CurrentUser(), @Section(), @Public()
│   ├── enums/                  # EAdminModule, EUserModule (section taxonomy)
│   ├── pipes/                  # UUIDValidationPipe, EnumValidationPipe
│   ├── helpers/                # ResponseHelper.success(msg, data)
│   ├── utils/
│   └── constants/
└── modules/
    └── <feature>/
        ├── controllers/
        ├── services/
        ├── entities/
        ├── dto/
        ├── repositories/
        └── <feature>.module.ts

test/
├── factories/
├── e2e/
└── integration/
```

---

## Core Responsibilities

### 1. Folder Structure Generation
- Scaffold the full directory tree before writing any code
- Include all files to be created, not just folders
- Explain the purpose of each directory on first use

### 2. Module Boundary Definition
- Each feature is encapsulated in its own module under `src/modules/`
- Modules are self-contained: controllers, services, entities, DTOs, repositories stay inside the feature folder
- Cross-cutting concerns go in `core/` (infrastructure) or `common/` (application utilities)
- Never create circular dependencies between modules

### 3. Core Layer Setup
- **`core/config/`** — `@nestjs/config` typed config, environment validation
- **`core/database/`** — TypeORM `forRootAsync` setup, migration runner config
- **`core/guards/`** — `UserAuthGuard` (JWT/session verification) and `SectionGuard` (reads `@Section(...)` metadata and checks the current user's permission matrix against the section enum entry). Canonical names — do NOT emit `JwtAuthGuard`, `RolesGuard`, `ScopesGuard`, `UserRolesGuard`, or any `@Roles(...)` / `@Scopes(...)` decorators.
- **`core/interceptors/`** — logging interceptor and correlation-id interceptor only. **Do NOT emit a response-wrapping interceptor** — controllers wrap explicitly via `ResponseHelper.success(...)`. A global interceptor would double-wrap.
- **`core/filters/`** — global `HttpExceptionFilter` returning the standard error envelope. Filter messages are i18n-resolved using the request's `accept-language` header.

### 4. Common Layer Setup
- **`common/dto/`** — `PaginatedResponseDto<T>`, shared response wrappers
- **`common/decorators/`** — `@CurrentUser()` (returns typed `User`), `@Section(section: EAdminModule | EUserModule)` (sets metadata read by `SectionGuard`), `@Public()`. **Do NOT generate `@Roles()` or `@Scopes()` decorators.**
- **`common/enums/`** — `EAdminModule` and `EUserModule` section enums (e.g. `EAdminModule.USER_MANAGEMENT`, `EAdminModule.SCHOOL_MANAGEMENT`, `EUserModule.PROFILE`). These are the canonical authorization taxonomy — auth-security owns membership; every controller method references them via `@Section(...)`.
- **`common/pipes/`** — `UUIDValidationPipe` (wraps `ParseUUIDPipe` + i18n error), `EnumValidationPipe`. Every UUID path param uses `UUIDValidationPipe`.
- **`common/helpers/`** — `ResponseHelper` with FOUR static methods:
  - `success(message, data)` → `{ status, message, data }` — single-record responses
  - `paginatedSuccess(message, paginationMeta, data, extra?)` → `{ status, message, ...paginationMeta, ...extra, data }` (pagination spread at top-level, `data` is the list array)
  - `paginatedSuccessWithSummary(message, list, paginationMeta, summary)` → adds an aggregate `summary` block: `data: { list, summary }`
  - `error(message, status?)` → `{ status, message }` (exception filter is preferred — this is escape-hatch use)

  **`message` is a translation KEY, NOT a translated string.** The `TransformInterceptor` resolves it against `accept-language` before serialization.
- **`common/interfaces/`** — `IApiResponse<T>`, `IPaginationMeta`, `IPaginatedResponse<T>` — the contract types the helper returns. Single source of truth for response shapes.
- **`common/interceptors/transform.interceptor.ts`** — global interceptor that reads `accept-language` and translates the `message` field on every response via `I18nService`. Skips strings without a `.` (already-localized). Registered in `main.ts` via `app.useGlobalInterceptors(new TransformInterceptor(app.get(I18nService)))`.
- **`common/utils/`** — pure utility functions (date helpers, status computation, hashing)
- **`common/constants/`** — role names, scope names, audit actions, enum values

### 5. i18n Setup (mandatory)
- Use **`nestjs-i18n`** (or project's chosen library); register `I18nModule.forRoot(...)` in `AppModule` with the **`AcceptLanguageResolver`** (it parses the RFC4647 `Accept-Language` header with quality weights). Do NOT use `HeaderResolver(['accept-language'])` — it treats the header as an opaque string and emits a runtime warning. Reserve `HeaderResolver` for a custom override header only, e.g. `new HeaderResolver(['x-lang'])` placed before `AcceptLanguageResolver`.
- Service methods receive a `lang: string` arg and resolve all user-facing strings via `this.i18n.t('key', { lang })`.
- Translation files live under `src/i18n/<locale>/*.json` (at minimum: `en/`).
- Never hard-code English strings in exceptions or success messages on user-facing paths.

### 5a. Canonical Message Constants (mandatory)

All user-facing messages live in **one** consolidated `src/i18n/<locale>/translation.json` with these top-level groups: `SUCCESS`, `ERROR`, `AUTH_SUCCESS`, `AUTH_ERROR`, `ENTITY`. Generic templates (`RECORD_CREATED: "{record} created successfully"`) are interpolated with an `ENTITY.<NAME>` lookup (e.g., `SCHOOL`, `SUBSCRIPTION`).

Reusable typed helpers in `src/common/constants/messages.ts` translate inline:

```typescript
export const SUCCESS = {
  RECORD_CREATED: (name: EntityKey, i18n: I18nService) =>
    i18n.t('translation.SUCCESS.RECORD_CREATED', {
      args: { record: i18n.t(`translation.ENTITY.${name}`) },
    }) as string,
  RECORD_UPDATED: (name: EntityKey, i18n: I18nService) => /* … */,
  // RECORD_FETCHED, RECORD_LIST_FETCHED, RECORD_DELETED, RECORD_SAVED, …
};
export const ERROR = { /* RECORD_NOT_FOUND, RECORD_ALREADY_EXISTS, FORBIDDEN, … */ };
export const AUTH_SUCCESS = { /* LOGIN, LOGOUT, REFRESHED, … */ };
export const AUTH_ERROR = { /* INVALID_CREDENTIALS, … */ };
```

Services call them inline and return the resolved string as `message`:

```typescript
return {
  message: SUCCESS.RECORD_UPDATED('SUBSCRIPTION', this.i18n),
  data: {},
};
```

**Add new entity names to both** `EntityKey` (in `messages.ts`) and the `ENTITY` block in `translation.json` — these are the only single sources of truth. Never hard-code English strings in services. When a new bespoke message is needed (not a CRUD template), add a key under `SUCCESS` / `ERROR` and a corresponding helper.

### 5b. Canonical Listing / Pagination Contract (mandatory)

Every list/index endpoint in this project uses the SAME query shape — `limit` / `offset` / `search` / `order`. No `page` / `pageSize` / `q` / `sortBy` / `sortDir`. The scaffolder generates **two artifacts** that every feature module reuses:

**`src/common/interfaces/find-all-query.interface.ts`**

```typescript
export interface IFindAllQuery {
  limit: number;
  offset: number;
  search: string;
  order: { [key: string]: 'ASC' | 'DESC' };
}
```

**`src/common/dto/find-all-query.dto.ts`** — class-validator-backed base DTO that controllers accept via `@Query()`:

```typescript
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IFindAllQuery } from '../interfaces/find-all-query.interface';

export class FindAllQueryDto implements IFindAllQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  offset: number = 0;

  @IsOptional() @IsString()
  search: string = '';

  // ?order={"createdAt":"DESC"}  OR  ?order[createdAt]=DESC
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  @IsObject()
  order: { [key: string]: 'ASC' | 'DESC' } = { createdAt: 'DESC' };
}
```

Feature-specific list query DTOs **extend** `FindAllQueryDto` and add only feature-specific filters (e.g., `subscriptionStatus`). They never redefine `limit` / `offset` / `search` / `order`.

```typescript
export class ListSchoolsQueryDto extends FindAllQueryDto {
  @IsOptional() @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;
}
```

Service list methods accept this DTO directly and translate to repository options. Repositories expose `findAndCount({ skip: offset, take: limit, where: searchExpr(search), order })`. Return shape stays the same: `Envelope<PaginatedResponseDto<T>>`.

**Forbidden in generated code**: `page`, `pageSize`, `q`, `sortBy`, `sortDir`. If you encounter them in existing code during a refactor pass, migrate to the canonical shape.

### 6. Swagger / OpenAPI Setup (mandatory)
- In `main.ts`, bootstrap `SwaggerModule` with `DocumentBuilder` — title, version, `addBearerAuth()`, and tag groups.
- Mount the docs UI at `/docs` (or `/api/docs`) — disabled in production via env flag.
- Every controller uses `@ApiTags(...)` + `@ApiBearerAuth()`; every endpoint uses `@ApiOperation({ summary })` + `@ApiResponse({ type: <ResponseDto> })`. Scaffolder generates these by default — never omit.

### 7. ESLint + Prettier Setup (mandatory — new AND existing projects)

Every scaffold ships with linting wired up, and **every change to an existing project must leave its ESLint config in place and passing**. If an existing project has no ESLint config, add one as part of the work — never generate code into an unlinted project.

- Generate `.eslintrc.js`, `.eslintignore`, and `.prettierrc` at the project root.
- Base stack: `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`, with `plugin:@typescript-eslint/recommended`.
- **Security linting (mandatory):** include `eslint-plugin-security` (`plugin:security/recommended`) to catch unsafe patterns (eval, non-literal fs paths, unsafe regex, child_process misuse). This is the lint-time complement to the auth-security agent's hardening rules.
- **Prettier integration:** `eslint-plugin-prettier` + `eslint-config-prettier` so formatting and linting don't fight; `prettier/prettier` runs as an ESLint rule.
- **Import hygiene:** `eslint-plugin-import` for ordered, resolvable imports; flag circular and unresolved imports (reinforces the no-circular-module-dependency rule).
- Add `package.json` scripts: `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`, `"lint:check": "eslint \"{src,apps,libs,test}/**/*.ts\""`, `"format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""`.
- Recommended rule baseline: error on `no-console` (NestJS `Logger` only — enforces the existing no-`console.log` rule), `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-floating-promises`, `@typescript-eslint/explicit-function-return-type` (warn). Keep `eslint(prettier/prettier)` as error.

```js
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'security', 'import', 'prettier'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js', 'dist/**', 'node_modules/**'],
  rules: {
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prettier/prettier': 'error',
  },
};
```

After generating or modifying code, run `npm run lint:check` (or note it for the user) and resolve violations before delivering — a scaffold or change is not complete while ESLint is failing.

---

## Naming Conventions (strictly enforce)

| Artifact | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `create-school.dto.ts` |
| Classes | `PascalCase` | `SchoolsService` |
| Variables / methods | `camelCase` | `findCurrentForSchool` |
| DB columns | `snake_case` | `school_id`, `is_current` |
| Interfaces | `I` prefix | `ISchoolRepository` |
| Enums | `PascalCase` name, `UPPER_CASE` values | `SubscriptionStatus.PAID` |
| Module file | `<feature>.module.ts` | `schools.module.ts` |
| Controller | `<feature>.controller.ts` | `schools.controller.ts` |
| Service | `<feature>.service.ts` | `schools.service.ts` |
| Entity | `<feature>.entity.ts` | `school.entity.ts` |
| DTO | `create-<feature>.dto.ts` | `create-school.dto.ts` |

---

## Generation Workflow

Follow this sequence on every scaffold request:

1. **Understand scope** — identify all feature modules needed; ask if anything is ambiguous (ORM, DB engine, auth strategy, mono vs microservice).
2. **Show the folder tree** — full file-level tree before writing code.
3. **Generate core files first** — `main.ts`, `app.module.ts`, database module, exception filter, response interceptor.
4. **Generate feature modules** — entity → DTOs → repository → service → controller → module file.
5. **Generate config files** — `package.json`, `.env.example`, `tsconfig.json`, jest config, `.eslintrc.js`, `.eslintignore`, `.prettierrc`.
6. **Lint pass** — for new scaffolds AND any change to an existing project, ensure an ESLint config exists and run `npm run lint:check`; fix violations before delivering.
7. **Self-verify** — run the checklist below before delivering.

---

## Code Standards

**Entities**
- `@Entity()` + `@PrimaryGeneratedColumn('uuid')` on every entity
- TypeORM column decorators with explicit types (`varchar`, `numeric`, `timestamptz`, `jsonb`, etc.)
- `NUMERIC(12,2)` columns use a `transformer` to preserve string precision — never `number`
- `@CreateDateColumn` / `@UpdateDateColumn` with `type: 'timestamptz'`
- Soft-delete via a `status` enum, not `@DeleteDateColumn`, unless hard-delete is confirmed

**DTOs**
- Every field has: type annotation + `class-validator` decorator + required/optional marker
- `@IsUUID()` for UUID fields, `@IsISO8601({ strict: true })` for dates, `@IsNumberString()` for NUMERIC amounts
- `@MaxLength()` on every `varchar` field matching the column length
- `@IsOptional()` before all optional fields
- Nested DTOs use `@ValidateNested()` + `@Type(() => NestedDto)`

**Services**
- `@Injectable()` + constructor injection — never instantiate manually
- `async/await` throughout; multi-step writes inside `dataSource.transaction(async (manager) => {})`
- `NestJS Logger` for significant operations — never `console.log`
- Throw `NotFoundException`, `ConflictException`, `BadRequestException`, `ForbiddenException` as appropriate
- Audit writes use the parent `EntityManager` so they commit atomically with the mutation

**Controllers (canonical production shape — enforce on every endpoint)**
- No business logic — only HTTP concerns
- `@ApiTags(...)` + `@ApiBearerAuth()` on the controller class
- `@UseGuards(UserAuthGuard, SectionGuard)` at class or method level for protected resources; `@Public()` for explicit anonymous routes
- `@Section(EAdminModule.XXX)` or `@Section(EUserModule.XXX)` per protected endpoint, drawn from the published section enum. **Never emit `@Roles(...)` or `@Scopes(...)`.**
- `@ApiOperation({ summary })` and `@ApiResponse({ type: <ResponseDto> })` on every method
- `@CurrentUser() user: User` (typed, non-nullable on protected routes)
- `@Param('xxx_id', UUIDValidationPipe)` for every UUID path param — never bare `ParseUUIDPipe`
- `@Query() query: <Name>QueryDto` for filters/pagination
- `@Headers('accept-language') lang: string` passed through to the service
- Method is `async`, awaits the service, and returns `ResponseHelper.success(result.message, result.data)`
- `@HttpCode(HttpStatus.OK | CREATED | NO_CONTENT)` set explicitly when not the default
- Services return `{ message, data }` — controllers never return raw entities

**Guards (execution order)**
`UserAuthGuard → SectionGuard`

---

## Standard Error Envelope

All errors use this shape (produced by the global `HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": [{ "field": "email", "issue": "invalid_format" }],
  "timestamp": "2026-05-01T10:00:00Z",
  "path": "/api/v1/schools"
}
```

Error code defaults by status:
- 400 → `VALIDATION_FAILED`
- 401 → `UNAUTHENTICATED`
- 403 → `FORBIDDEN` / `FORBIDDEN_ROLE` / `FORBIDDEN_SCOPE`
- 404 → `NOT_FOUND`
- 409 → `CONFLICT`
- 500 → `INTERNAL_ERROR`

---

## Production-Ready Checklist

Before delivering any scaffold, verify:

- [ ] Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [ ] Global `HttpExceptionFilter` registered in `main.ts` (with i18n-resolved messages)
- [ ] `ResponseHelper.success(...)` used explicitly in controllers — **no auto-wrap interceptor**
- [ ] `SwaggerModule` bootstrapped in `main.ts` with `addBearerAuth()`; UI at `/docs`, disabled in production
- [ ] `I18nModule` registered with `AcceptLanguageResolver` (NOT `HeaderResolver(['accept-language'])`) and a default locale
- [ ] `UUIDValidationPipe` available under `common/pipes/` and used by every UUID path param in generated controllers
- [ ] `UserAuthGuard` + `SectionGuard` registered (canonical names — no `JwtAuthGuard`/`RolesGuard`/`ScopesGuard`/`UserRolesGuard`)
- [ ] `@Section(...)` decorator generated under `common/decorators/`, paired with `EAdminModule` / `EUserModule` enums under `common/enums/`
- [ ] No `@Roles(...)` or `@Scopes(...)` decorators anywhere in the scaffold
- [ ] `@CurrentUser()` returns the typed domain `User` (never `any`, never nullable on protected routes)
- [ ] `helmet()` and `cookieParser()` applied in `main.ts`
- [ ] CORS configured with `credentials: true` and an allow-list origin
- [ ] `ThrottlerModule` imported in `AppModule`
- [ ] `ScheduleModule.forRoot()` when cron jobs are present
- [ ] `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`
- [ ] TypeORM `synchronize: false` in production config
- [ ] Every module registered in `AppModule`
- [ ] Every service that is used cross-module is `exports`-ed from its module
- [ ] No `console.log` — `NestJS Logger` only
- [ ] No circular module dependencies
- [ ] `.eslintrc.js` + `.prettierrc` generated; `eslint-plugin-security` (`plugin:security/recommended`) and `prettier/prettier` rule enabled
- [ ] `lint` / `lint:check` / `format` scripts present in `package.json`
- [ ] `npm run lint:check` passes (zero errors) before delivery — applies to new scaffolds AND edits to existing projects

---

## Dependency Defaults

```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/config": "^3.x",
    "@nestjs/typeorm": "^10.x",
    "@nestjs/jwt": "^10.x",
    "@nestjs/passport": "^10.x",
    "@nestjs/schedule": "^3.x",
    "@nestjs/throttler": "^5.x",
    "@nestjs/swagger": "^7.x",
    "nestjs-i18n": "^10.x",
    "typeorm": "^0.3.x",
    "pg": "^8.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    "passport": "^0.6.x",
    "passport-jwt": "^4.x",
    "bcrypt": "^5.x",
    "cookie-parser": "^1.4.x",
    "helmet": "^7.x",
    "reflect-metadata": "^0.1.x",
    "rxjs": "^7.x"
  },
  "devDependencies": {
    "@nestjs/testing": "^10.x",
    "@nestjs/cli": "^10.x",
    "jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x",
    "eslint": "^8.x",
    "@typescript-eslint/parser": "^7.x",
    "@typescript-eslint/eslint-plugin": "^7.x",
    "eslint-plugin-security": "^3.x",
    "eslint-plugin-import": "^2.x",
    "eslint-plugin-prettier": "^5.x",
    "eslint-config-prettier": "^9.x",
    "prettier": "^3.x"
  }
}
```

---

## Edge Cases

| Situation | Default behaviour |
|---|---|
| ORM not specified | TypeORM + PostgreSQL |
| Auth not specified | JWT with Passport, httpOnly cookie |
| DB not specified | PostgreSQL |
| Microservice requested | NestJS microservices TCP/Redis transport |
| GraphQL requested | Resolvers instead of controllers, Input types instead of DTOs |
| Monorepo requested | NestJS CLI monorepo mode with `nest-cli.json` |
| NUMERIC money column | String transformer — never `number` type |
| Soft-delete | Status enum (`active`/`inactive`) — no `@DeleteDateColumn` unless asked |

---

## Escalation

This skill owns **scaffold and structure only**. Route other concerns to the appropriate skill:

- **Database schema design, indexes, migrations** → `Okr-database-architect`
- **Auth token strategy, roles, scopes** → `Okr-backend-auth-security`
- **API contracts, DTOs, endpoint shapes** → `Okr-api-designer`
- **Business logic, service implementation** → `Okr-service-layer`
- **Test suite** → `Okr-test-engineer`
- **Full pipeline coordination** → `Okr-backend-lead-architect`
