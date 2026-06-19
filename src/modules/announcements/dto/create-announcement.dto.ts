import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 200, example: 'Winter break schedule' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Campuses close from Dec 24 and reopen Jan 2.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  body!: string;
}
