import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AcceptLanguageResolver, I18nModule } from "nestjs-i18n";
import { join } from "path";
import configuration from "./config/configuration";
import { School } from "./modules/admin/schools/entities/school.entity";
import { Subscription } from "./modules/subscriptions/entities/subscription.entity";
import { AdminAuditLog } from "./modules/admin/audit/admin-audit-log.entity";
import { AdminUser } from "./modules/auth/entities/admin-user.entity";
import { RefreshToken } from "./modules/auth/entities/refresh-token.entity";
import { PasswordResetToken } from "./modules/auth/entities/password-reset-token.entity";
import { SchoolsModule } from "./modules/admin/schools/schools.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { MailModule } from "./modules/mail/mail.module";
import { AuditModule } from "./modules/admin/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MeModule } from "./modules/me/me.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    I18nModule.forRoot({
      fallbackLanguage: "en",
      loaderOptions: {
        path: join(__dirname, "i18n"),
        watch: false,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    ScheduleModule.forRoot(),
    // Baseline abuse protection across all routes. Production should layer
    // stricter per-route limits on the auth endpoints (see REVIEW.md F4).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "postgres",
        host: cfg.get<string>("db.host"),
        port: cfg.get<number>("db.port"),
        username: cfg.get<string>("db.username"),
        password: cfg.get<string>("db.password"),
        database: cfg.get<string>("db.database"),
        entities: [
          School,
          Subscription,
          AdminAuditLog,
          AdminUser,
          RefreshToken,
          PasswordResetToken,
        ],
        synchronize: cfg.get<string>("env") !== "production",
        logging: false,
      }),
    }),
    AuthModule,
    MailModule,
    AuditModule,
    SchoolsModule,
    SubscriptionsModule,
    MeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
