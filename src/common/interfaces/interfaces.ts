/**
 * Canonical response envelopes. Every controller wraps with `ResponseHelper`
 * (success / paginatedSuccess / paginatedSuccessWithSummary / error). The
 * `message` field is always a translation KEY — TransformInterceptor resolves
 * it against the request's `accept-language` header before serialization.
 */

export interface IApiResponse<T> {
  status: boolean;
  message: string; // translation key
  data: T;
}

export interface IPaginationMeta {
  limit: number | null;
  offset: number | null;
  total: number;
}

export interface IPaginatedResponse<T> {
  status: boolean;
  message: string; // translation key
  pagination: IPaginationMeta;
  data: T;
}
