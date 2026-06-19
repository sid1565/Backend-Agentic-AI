/**
 * Environment for the e2e suite. Runs before the Nest app is imported so that
 * ConfigModule reads these values. Points at a dedicated test database and a
 * known seeded root admin; MailService is overridden in the spec so no SMTP
 * connection is attempted.
 */
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '12345';
process.env.DB_NAME = 'backend_agent_test';

process.env.JWT_SECRET = 'e2e-test-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.RESET_TOKEN_TTL_MINUTES = '30';

process.env.ROOT_ADMIN_EMAIL = 'root-e2e@school-saas.test';
process.env.ROOT_ADMIN_PASSWORD = 'RootPw!2026';
