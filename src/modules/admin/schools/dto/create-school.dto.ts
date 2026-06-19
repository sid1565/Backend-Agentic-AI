import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SubscriptionCurrency } from '../../../subscriptions/entities/subscription.entity';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  schoolName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @Matches(/^\+\d{1,4}$/, {
    message: 'phoneCode must be in E.164 format like +91',
  })
  phoneCode!: string;

  @Matches(/^\d{6,15}$/, {
    message: 'phoneNumber must be 6-15 digits',
  })
  phoneNumber!: string;

  @IsInt()
  @Min(1)
  studentSeat!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subscriptionAmount!: number;

  @IsEnum(SubscriptionCurrency, {
    message: 'currency must be one of: KWD, USD',
  })
  currency!: SubscriptionCurrency;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'transactionId may contain letters, digits, dot, underscore, hyphen',
  })
  transactionId!: string;

  @Type(() => Date)
  @IsDate()
  subscriptionStartDate!: Date;

  @Type(() => Date)
  @IsDate()
  subscriptionEndDate!: Date;
}
