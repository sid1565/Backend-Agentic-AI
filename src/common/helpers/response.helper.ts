import {
  IApiResponse,
  IPaginatedResponse,
  IPaginationMeta,
} from '../interfaces/interfaces';

/**
 * ResponseHelper
 * ----------------------------------------------------
 * - Always returns plain objects
 * - Message is a translation KEY (not translated here)
 * - Translation is handled by TransformInterceptor
 * ----------------------------------------------------
 */
export class ResponseHelper {
  /**
   * Standard success response
   */
  static success<T>(
    message: string = 'translation.SUCCESS.DEFAULT',
    data: T,
  ): IApiResponse<T> {
    return {
      status: true,
      message, // translation key
      data,
    };
  }

  /**
   * Paginated success response — pagination meta is spread at the top level
   * alongside `data` so clients don't need to descend into a sub-object.
   */
  static paginatedSuccess<T>(
    message: string = 'translation.SUCCESS.DEFAULT',
    paginationMeta: IPaginationMeta,
    data: T,
    extra?: Record<string, unknown>,
  ): Omit<IPaginatedResponse<T>, 'pagination'> &
    IPaginationMeta &
    Record<string, unknown> {
    return {
      status: true,
      message,
      ...paginationMeta,
      ...extra,
      data,
    };
  }

  /**
   * Paginated response with summary block — use when a list endpoint also
   * needs to return aggregate stats over the full (unpaginated) result set.
   */
  static paginatedSuccessWithSummary<ListType, SummaryType>(
    message: string = 'translation.SUCCESS.DEFAULT',
    list: ListType[],
    paginationMeta: IPaginationMeta,
    summary: SummaryType,
  ): {
    status: boolean;
    message: string;
    limit: number | null;
    offset: number | null;
    total: number;
    data: {
      list: ListType[];
      summary: SummaryType;
    };
  } {
    return {
      status: true,
      message,
      ...paginationMeta,
      data: {
        list,
        summary,
      },
    };
  }

  /**
   * Generic error response (optional use in services).
   * Usually handled by Exception Filters — prefer throwing NestJS exceptions.
   */
  static error(
    message: string = 'translation.ERROR.INTERNAL_SERVER_ERROR',
    status = false,
  ) {
    return {
      status,
      message,
    };
  }
}
