import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IFindAllQuery } from '../interfaces/find-all-query.interface';

/**
 * Canonical base DTO for every list/index endpoint.
 *
 * Feature-specific query DTOs MUST extend this class and add only their own
 * filters. Do not redefine `limit`, `offset`, `search`, or `order`, and do not
 * introduce `page` / `pageSize` / `q` / `sortBy` / `sortDir` — those are the
 * legacy shape.
 *
 * The `order` parameter accepts either a JSON string (`?order={"createdAt":"DESC"}`)
 * or an already-parsed object (when used programmatically).
 */
export class FindAllQueryDto implements IFindAllQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsString()
  search: string = '';

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return { createdAt: 'DESC' };
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return { createdAt: 'DESC' };
      }
    }
    return value;
  })
  @IsObject()
  order: { [key: string]: 'ASC' | 'DESC' } = { createdAt: 'DESC' };
}
