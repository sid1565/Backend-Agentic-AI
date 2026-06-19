/**
 * Canonical paginated envelope returned by list endpoints. Echoes the
 * request's `limit` / `offset` back so clients don't have to remember what
 * they asked for, plus the total count of matching rows.
 *
 * Query-side shape lives in `FindAllQueryDto` (extends `IFindAllQuery`):
 * `{ limit, offset, search, order }`. Do NOT introduce `page` / `pageSize`
 * / `sortBy` / `sortDir` — those are the legacy shape.
 */
export class PaginatedResponseDto<T> {
  items!: T[];
  total!: number;
  limit!: number;
  offset!: number;
}
