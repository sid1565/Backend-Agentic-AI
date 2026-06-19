import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class TokenPairResponseDto {
  accessToken!: string;
  accessTokenExpiresIn!: number;
  refreshToken?: string;
  tokenType!: 'Bearer';
  user!: {
    id: string;
    role: 'admin' | 'school';
    mustResetPassword?: boolean;
  };
}
