import { I18nService } from 'nestjs-i18n';

/**
 * Reusable message helpers. Each member is a function that takes an
 * `I18nService` (and optional template args) and returns a translated string.
 *
 * Services call these inline so the returned `message` is already localized
 * for the request's language. The `TransformInterceptor` sees plain text
 * (no dots in the resolved sentence) and passes it through unchanged.
 *
 * Translation keys live in `src/i18n/<locale>/translation.json` under the
 * SUCCESS, ERROR, AUTH_SUCCESS, AUTH_ERROR, and ENTITY namespaces.
 *
 * `entity` is an ENTITY-table key (`SCHOOL`, `SUBSCRIPTION`, ...) — it is
 * itself translated, so calling `SUCCESS.RECORD_UPDATED('SUBSCRIPTION', i18n)`
 * with `lang=en` returns `"Subscription updated successfully"`.
 */

type EntityKey =
  | 'SCHOOL'
  | 'SUBSCRIPTION'
  | 'AUDIT_LOG'
  | 'USER'
  | 'ME_SCHOOL'
  | 'ME_SUBSCRIPTION'
  | 'ANNOUNCEMENT';

const t = (i18n: I18nService, key: string, args?: Record<string, unknown>) =>
  i18n.t(key, args ? { args } : undefined) as string;

const entity = (i18n: I18nService, name: EntityKey) =>
  t(i18n, `translation.ENTITY.${name}`);

export const SUCCESS = {
  DEFAULT: (i18n: I18nService) => t(i18n, 'translation.SUCCESS.DEFAULT'),
  RECORD_FETCHED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_FETCHED', { record: entity(i18n, name) }),
  RECORD_LIST_FETCHED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_LIST_FETCHED', {
      record: entity(i18n, name),
    }),
  RECORD_CREATED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_CREATED', { record: entity(i18n, name) }),
  RECORD_UPDATED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_UPDATED', { record: entity(i18n, name) }),
  RECORD_DELETED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_DELETED', { record: entity(i18n, name) }),
  RECORD_SAVED: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.RECORD_SAVED', { record: entity(i18n, name) }),
  CREDENTIALS_RESENT: (i18n: I18nService) =>
    t(i18n, 'translation.SUCCESS.CREDENTIALS_RESENT'),
};

export const ERROR = {
  DEFAULT: (i18n: I18nService) => t(i18n, 'translation.ERROR.DEFAULT'),
  RECORD_NOT_FOUND: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.ERROR.RECORD_NOT_FOUND', { record: entity(i18n, name) }),
  RECORD_ALREADY_EXISTS: (name: EntityKey, i18n: I18nService) =>
    t(i18n, 'translation.ERROR.RECORD_ALREADY_EXISTS', {
      record: entity(i18n, name),
    }),
  FORBIDDEN: (i18n: I18nService) => t(i18n, 'translation.ERROR.FORBIDDEN'),
  SUBSCRIPTION_END_BEFORE_START: (i18n: I18nService) =>
    t(i18n, 'translation.ERROR.SUBSCRIPTION_END_BEFORE_START'),
  SCHOOL_ACCOUNTS_ONLY: (i18n: I18nService) =>
    t(i18n, 'translation.ERROR.SCHOOL_ACCOUNTS_ONLY'),
};

export const AUTH_SUCCESS = {
  LOGIN: (i18n: I18nService) => t(i18n, 'translation.AUTH_SUCCESS.LOGIN'),
  LOGOUT: (i18n: I18nService) => t(i18n, 'translation.AUTH_SUCCESS.LOGOUT'),
  REFRESHED: (i18n: I18nService) => t(i18n, 'translation.AUTH_SUCCESS.REFRESHED'),
  PASSWORD_RESET_REQUESTED: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_SUCCESS.PASSWORD_RESET_REQUESTED'),
  PASSWORD_RESET_DONE: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_SUCCESS.PASSWORD_RESET_DONE'),
};

export const AUTH_ERROR = {
  INVALID_CREDENTIALS: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_ERROR.INVALID_CREDENTIALS'),
  INVALID_REFRESH_TOKEN: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_ERROR.INVALID_REFRESH_TOKEN'),
  INVALID_RESET_TOKEN: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_ERROR.INVALID_RESET_TOKEN'),
  REFRESH_TOKEN_REQUIRED: (i18n: I18nService) =>
    t(i18n, 'translation.AUTH_ERROR.REFRESH_TOKEN_REQUIRED'),
};
