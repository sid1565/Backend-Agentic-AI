/**
 * Environment for the e2e suite. Runs before the Nest app is imported so that
 * ConfigModule reads these values. Points at a dedicated test database and a
 * known seeded root admin; MailService is overridden in the spec so no SMTP
 * connection is attempted.
 *
 * SECURITY: every value below is a TEST-ONLY FIXTURE — never a production
 * secret. They exist only to boot the app inside the test process against a
 * throwaway database. Each is overridable from the real environment (`?? `
 * fallback), so CI may inject repo secrets if desired without code changes;
 * absent an override, the safe local defaults apply. Production reads these
 * same vars from the host environment / secret store, and `requireJwtSecret()`
 * rejects short or placeholder secrets, so a fixture can never reach prod.
 */
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '12345';
// DB_NAME is intentionally pinned (not overridable): a hard guard so the e2e
// suite — which drops/recreates schema via synchronize — can never run against
// a non-test database.
process.env.DB_NAME = 'backend_agent_test';

// Must satisfy requireJwtSecret() (>= 32 chars, not a known placeholder).
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'e2e-test-secret-0123456789abcdef0123';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';
process.env.RESET_TOKEN_TTL_MINUTES =
  process.env.RESET_TOKEN_TTL_MINUTES ?? '30';

process.env.ROOT_ADMIN_EMAIL =
  process.env.ROOT_ADMIN_EMAIL ?? 'root-e2e@school-saas.test';
process.env.ROOT_ADMIN_PASSWORD =
  process.env.ROOT_ADMIN_PASSWORD ?? 'RootPw!2026';
