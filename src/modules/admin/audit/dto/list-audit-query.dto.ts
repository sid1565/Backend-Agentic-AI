import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsUUID } from 'class-validator';
import { FindAllQueryDto } from '../../../../common/dto/find-all-query.dto';
import { AdminAuditAction } from '../admin-audit-log.entity';

export class ListAuditQueryDto extends FindAllQueryDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsIn(Object.values(AdminAuditAction))
  action?: AdminAuditAction;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
