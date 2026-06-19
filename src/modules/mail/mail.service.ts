import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import * as Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

interface SchoolWelcomeContext {
  schoolName: string;
  loginEmail: string;
  password: string;
  amount: string;
  currency: string;
  transactionId: string;
  startDate: string;
  endDate: string;
  loginUrl: string;
}

/** Minimal attachment shape (subset of nodemailer's Attachment). */
export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private welcomeTemplate!: HandlebarsTemplateDelegate<SchoolWelcomeContext>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("mail.host"),
      port: this.config.get<number>("mail.port"),
      secure: this.config.get<boolean>("mail.secure"),
      auth: {
        user: this.config.get<string>("mail.user"),
        pass: this.config.get<string>("mail.password"),
      },
    });

    const tplPath = join(__dirname, "templates", "school-welcome.hbs");
    const raw = readFileSync(tplPath, "utf8");
    this.welcomeTemplate = Handlebars.compile<SchoolWelcomeContext>(raw);
  }

  async sendSchoolWelcome(
    to: string,
    ctx: SchoolWelcomeContext,
    attachments?: MailAttachment[],
  ): Promise<void> {
    const html = this.welcomeTemplate(ctx);
    await this.sendWithRetry({
      to,
      subject: "Welcome to School SaaS — Your login credentials",
      html,
      attachments,
    });
  }

  async sendPasswordReset(
    to: string,
    ctx: { resetUrl: string; ttlMinutes: number },
  ): Promise<void> {
    const html = `
      <p>We received a request to reset your password.</p>
      <p>Click the link below to choose a new password. This link expires in
      ${ctx.ttlMinutes} minutes and can be used once.</p>
      <p><a href="${ctx.resetUrl}">Reset your password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;
    await this.sendWithRetry({
      to,
      subject: "Reset your School SaaS password",
      html,
    });
  }

  private async sendWithRetry(
    options: {
      to: string;
      subject: string;
      html: string;
      attachments?: MailAttachment[];
    },
    maxAttempts = 3,
  ): Promise<void> {
    const from = this.config.get<string>("mail.from");
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.transporter.sendMail({ from, ...options });
        if (attempt > 1) {
          this.logger.log(
            `Mail delivered on attempt ${attempt} to=${this.maskEmail(options.to)}`,
          );
        }
        return;
      } catch (err) {
        lastErr = err;
        const backoff = 2 ** attempt * 250;
        this.logger.warn(
          `Mail attempt ${attempt}/${maxAttempts} failed for to=${this.maskEmail(options.to)}: ${(err as Error).message}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }
    throw lastErr;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
