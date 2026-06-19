import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  role: 'ADMIN' | 'SCHOOL';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    // configuration.ts validates this at load, but assert here too so the
    // strategy can never fall back to a guessable secret (defense in depth).
    const secret = config.get<string>('auth.jwtSecret');
    if (!secret) {
      throw new Error('auth.jwtSecret is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // Pin the accepted algorithm so a forged token can't request a different
      // verification scheme (alg-confusion defence).
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, role: payload.role };
  }
}
