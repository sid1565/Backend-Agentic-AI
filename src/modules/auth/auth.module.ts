import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from '../admin/schools/entities/school.entity';
import { MailModule } from '../mail/mail.module';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminSeeder } from './admin-seeder.service';
import { AdminUser } from './entities/admin-user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: cfg.get<string>('auth.jwtExpiresIn'),
          algorithm: 'HS256' as const,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      AdminUser,
      RefreshToken,
      PasswordResetToken,
      School,
    ]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService, AdminSeeder],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
