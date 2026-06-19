/**
 * Known-insecure placeholder secrets that have shipped in `.env`, `.env.example`,
 * or prior config defaults. A signing secret matching any of these is treated as
 * absent — tokens signed with a publicly-known value are forgeable.
 */
const INSECURE_JWT_SECRETS = new Set([
  "change-me",
  "replace-with-strong-random-secret",
]);

/** Minimum JWT secret length. HS256 needs >= 256 bits of key material. */
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Resolve the JWT signing secret, failing fast (in EVERY environment) if it is
 * missing, too short, or a known placeholder. There is deliberately no default:
 * booting with a guessable secret is a full authentication bypass, so the app
 * must refuse to start rather than silently sign forgeable tokens.
 */
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    secret.length < MIN_JWT_SECRET_LENGTH ||
    INSECURE_JWT_SECRETS.has(secret)
  ) {
    throw new Error(
      `JWT_SECRET must be set to a strong, non-default value of at least ` +
        `${MIN_JWT_SECRET_LENGTH} characters. Refusing to start with a missing, ` +
        `weak, or placeholder signing secret (generate one with ` +
        `\`openssl rand -hex 32\`).`,
    );
  }
  return secret;
}

export default () => ({
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USERNAME ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "school_saas",
  },
  auth: {
    jwtSecret: requireJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    // Refresh tokens are opaque + DB-hashed (revocable), not signed JWTs, so
    // only a TTL is needed here — no separate signing secret.
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10),
    resetTokenTtlMinutes: parseInt(
      process.env.RESET_TOKEN_TTL_MINUTES ?? "30",
      10,
    ),
  },
  adminSeed: {
    email: process.env.ROOT_ADMIN_EMAIL ?? "admin@school-saas.local",
    password: process.env.ROOT_ADMIN_PASSWORD ?? "ChangeMe!2026",
  },
  mail: {
    host: process.env.MAIL_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT ?? "587", 10),
    secure: process.env.MAIL_SECURE === "true",
    user: process.env.MAIL_USER ?? "",
    password: process.env.MAIL_PASSWORD ?? "",
    from: process.env.MAIL_FROM ?? "noreply@example.com",
  },
  app: {
    loginUrl: process.env.APP_LOGIN_URL ?? "http://localhost:3000/login",
    resetPasswordUrl:
      process.env.APP_RESET_PASSWORD_URL ??
      "http://localhost:3000/reset-password",
  },
  invoice: {
    // "From" block + branding rendered on the subscription invoice PDF.
    companyName: process.env.INVOICE_COMPANY_NAME ?? "EdTech Mini Game",
    companyEmail: process.env.INVOICE_COMPANY_EMAIL ?? "developer@solguruz.com",
    brandName: process.env.INVOICE_BRAND_NAME ?? "TirTir",
    brandTagline: process.env.INVOICE_BRAND_TAGLINE ?? "world",
    planLabel: process.env.INVOICE_PLAN_LABEL ?? "Institutional Plan",
    // Optional override for the brand logo (PNG/JPEG) rendered on the invoice.
    // Empty = use the logo bundled under assets/images/tir-tir.png.
    logoPath: process.env.INVOICE_LOGO_PATH ?? "",
    // Optional override for the Arabic-capable font used to render currency
    // glyphs (e.g. KWD "د.ك"). Empty = use the font bundled under assets/fonts.
    arabicFontPath: process.env.INVOICE_ARABIC_FONT_PATH ?? "",
  },
});
