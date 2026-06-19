import { IsIn, IsOptional } from 'class-validator';
import { FindAllQueryDto } from '../../../../common/dto/find-all-query.dto';

export class ListSchoolsQueryDto extends FindAllQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED'])
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED';
}
