import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/env';
import type { Paginated } from '../types/admin';

/**
 * The single axios instance for CakeConnect.
 *
 * Responsibilities kept here rather than at each call site:
 *   - JWT attachment (PRD §5 Security, "role-scoped APIs")
 *   - silent access-token refresh, so a session survives token expiry
 *   - retry with backoff for transient network failures (context.md §5)
 *   - unwrapping the backend's response envelope
 *
 * The auth tokens are read through injected getters instead of importing the
 * store, which would create a cycle: store -> slices -> services -> store.
 */

export const API_BASE = API_BASE_URL;

/* -------------------------------------------------------------------------- */
/* Response envelope (docs/api-endpoints.md)                                   */
/* -------------------------------------------------------------------------- */

export type ApiMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
};

export type ApiFieldError = { path: string; message: string };

export type ApiErrorBody = {
  success: false;
  message: string;
  errors?: ApiFieldError[];
};

/* -------------------------------------------------------------------------- */
/* Retry policy                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Worth retrying; a 4xx is not.
 *
 * 429 is deliberately absent: `/auth/send-otp` and `/auth/verify-otp` are rate
 * limited, and retrying into a rate limiter only deepens the lockout. Callers
 * read `retryAfterSeconds()` and tell the user when to try again instead.
 */
const RETRYABLE_STATUS = [408, 425, 500, 502, 503, 504];
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/**
 * Only methods that are safe to repeat. The previous policy retried every
 * method, which would duplicate `POST /orders` and `POST /payments/create` on a
 * timeout the server had in fact received.
 */
const IDEMPOTENT_METHODS = ['get', 'head', 'options'];

type TimedConfig = InternalAxiosRequestConfig & { startedAt?: number };

type RetryConfig = InternalAxiosRequestConfig & {
  startedAt?: number;
  retryCount?: number;
  /** Set once a 401 on this request has already been through a refresh. */
  hasRetriedAuth?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Store bridge                                                                */
/* -------------------------------------------------------------------------- */

export type RefreshedTokens = {
  accessToken: string;
  /**
   * Optional because the backend documents the returned fields only for login
   * and verify-otp. When refresh does not rotate it, the existing token stands.
   */
  refreshToken?: string;
};

let getToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let onTokensRefreshed: (tokens: RefreshedTokens) => void = () => {};

/**
 * Wired once at startup (see `src/store/authBridge.ts`) so this module stays
 * free of store imports.
 */
export function configureHttpClient(options: {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  onUnauthorized: () => void;
  onTokensRefreshed: (tokens: RefreshedTokens) => void;
}) {
  getToken = options.getToken;
  getRefreshToken = options.getRefreshToken;
  onUnauthorized = options.onUnauthorized;
  onTokensRefreshed = options.onTokensRefreshed;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/* -------------------------------------------------------------------------- */
/* Dev request log                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One line per request in development, so a failing screen can be traced to a
 * method, a URL and a status without adding a console.log at the call site.
 *
 *   [API] -> GET /shops
 *   [API] <- 200 GET /shops (142ms)
 *   [API] xx 404 GET /production-plans/date/2026-09-04 (61ms) - No production plan found
 *
 * Silent in release builds: `__DEV__` is false there, and these lines would
 * otherwise leak URLs and query strings into logcat.
 */
const logRequest = (method: string, url: string) => {
  if (__DEV__) {
  console.log(`[API] -> ${method} ${url}`);
  }
};

const logResponse = (method: string, url: string, status: number, ms: number) => {
  if (__DEV__) {
    console.log(`[API] <- ${status} ${method} ${url} (${ms}ms)`);
  }
};

const logFailure = (error: AxiosError) => {
  if (!__DEV__) {
    return;
  }

  const method = (error.config?.method ?? 'get').toUpperCase();
  const url = error.config?.url ?? '';
  const status = error.response?.status;
  const started = (error.config as TimedConfig | undefined)?.startedAt;
  const ms = started ? Date.now() - started : 0;
  const body = error.response?.data as ApiErrorBody | undefined;

  // The server's own message first: it is the one that says what was wrong.
  const reason = body?.message ?? error.message;
  const fields = body?.errors?.length
    ? ` | ${body.errors.map(e => `${e.path}: ${e.message}`).join('; ')}`
    : '';

  console.log(
    `[API] xx ${status ?? 'NETWORK'} ${method} ${url} (${ms}ms) - ${reason}${fields}`,
  );
};

httpClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  (config as TimedConfig).startedAt = Date.now();
  logRequest((config.method ?? 'get').toUpperCase(), config.url ?? '');

  return config;
});

httpClient.interceptors.response.use(response => {
  const started = (response.config as TimedConfig).startedAt;
  logResponse(
    (response.config.method ?? 'get').toUpperCase(),
    response.config.url ?? '',
    response.status,
    started ? Date.now() - started : 0,
  );
  return response;
});

/* -------------------------------------------------------------------------- */
/* Token refresh                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A 401 on an auth route means bad credentials or a spent OTP, not an expired
 * session — refreshing would be meaningless and dropping the session would be
 * wrong, since there is no session yet.
 */
const isAuthRoute = (url?: string) => Boolean(url && url.includes('/auth/'));

/**
 * Held while a refresh is in flight so that N requests failing at once share
 * one refresh rather than racing and invalidating each other's token.
 */
let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // A bare axios call, not `httpClient`: routing this through the instance
  // would let its own 401 handler recurse.
  const response = await axios.post<ApiEnvelope<RefreshedTokens>>(
    `${API_BASE_URL}/auth/refresh-token`,
    { refreshToken },
    {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const tokens = response.data?.data;
  if (!tokens?.accessToken) {
    throw new Error('Refresh response carried no access token');
  }

  onTokensRefreshed(tokens);
  return tokens.accessToken;
}

function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

httpClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    logFailure(error);

    if (status === 401 && config && !isAuthRoute(config.url)) {
      if (config.hasRetriedAuth) {
        // The replay failed too, so the new token is no better than the old one.
        onUnauthorized();
        return Promise.reject(error);
      }

      config.hasRetriedAuth = true;

      try {
        const accessToken = await refreshAccessToken();
        config.headers.set('Authorization', `Bearer ${accessToken}`);
        return await httpClient(config);
      } catch {
        // The session really is gone; retrying would only burn requests.
        onUnauthorized();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      return Promise.reject(error);
    }

    // `status === undefined` covers timeouts and connection failures.
    const isTransient = status === undefined || RETRYABLE_STATUS.includes(status);
    const isIdempotent = IDEMPOTENT_METHODS.includes(
      (config?.method ?? 'get').toLowerCase(),
    );
    const retryCount = config?.retryCount ?? 0;

    if (config && isIdempotent && isTransient && retryCount < MAX_RETRIES) {
      config.retryCount = retryCount + 1;
      // Exponential backoff: 500ms, then 1000ms.
      await delay(BASE_BACKOFF_MS * 2 ** retryCount);
      return httpClient(config);
    }

    return Promise.reject(error);
  },
);

/* -------------------------------------------------------------------------- */
/* Typed request helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Every response is wrapped as `{ success, message, data, meta }`. Unwrapping
 * inside an interceptor would mean lying to axios about its own response type,
 * so callers go through these helpers instead and receive `data` directly.
 */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.request<ApiEnvelope<T>>(config);
  return response.data?.data as T;
}

export const apiGet = <T,>(url: string, params?: unknown): Promise<T> =>
  request<T>({ method: 'GET', url, params });

export const apiPost = <T,>(url: string, data?: unknown): Promise<T> =>
  request<T>({ method: 'POST', url, data });

export const apiPatch = <T,>(url: string, data?: unknown): Promise<T> =>
  request<T>({ method: 'PATCH', url, data });

/**
 * `DELETE /products/:id/availability` and `DELETE /price-lists/:id/items` both
 * carry a request body, which axios only sends when passed as `data` on the
 * config rather than as a positional argument.
 */
export const apiDelete = <T,>(url: string, data?: unknown): Promise<T> =>
  request<T>({ method: 'DELETE', url, data });

/**
 * List endpoints put the rows in `data` and the paging in `meta`. `Paginated<T>`
 * carries no `totalPages` — it is `Math.ceil(total / limit)` wherever a screen
 * needs it — so the field is dropped here rather than widening the domain type.
 */
export async function apiGetPaged<T>(
  url: string,
  params?: unknown,
): Promise<Paginated<T>> {
  const response = await httpClient.request<ApiEnvelope<T[]>>({
    method: 'GET',
    url,
    params,
  });

  const items = response.data?.data ?? [];
  const meta = response.data?.meta;

  return {
    items,
    page: meta?.page ?? 1,
    limit: meta?.limit ?? items.length,
    total: meta?.total ?? items.length,
  };
}

export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/* Error reporting                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Seconds the server asked us to wait, from the `Retry-After` header. Returns
 * null when the header is absent or unparseable. Nothing retries automatically
 * on this — it exists so a rate-limited screen can say when to try again.
 */
export function retryAfterSeconds(error: unknown): number | null {
  const headers = (error as AxiosError)?.response?.headers as
    | Record<string, unknown>
    | undefined;
  const header = headers?.['retry-after'];

  if (header === undefined || header === null) {
    return null;
  }

  const raw = String(header).trim();

  // RFC 7231 allows either delta-seconds or an HTTP-date.
  const seconds = Number(raw);
  if (raw !== '' && Number.isFinite(seconds)) {
    return Math.max(Math.ceil(seconds), 0);
  }

  const at = Date.parse(raw);
  if (Number.isNaN(at)) {
    return null;
  }

  return Math.max(Math.ceil((at - Date.now()) / 1000), 0);
}

/**
 * Field-level validation messages, keyed by the `path` the server reported, so
 * a form can put each complaint next to the input that caused it. Empty when
 * the failure was not a validation error.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  const body = (error as AxiosError<ApiErrorBody>)?.response?.data;

  if (!Array.isArray(body?.errors)) {
    return {};
  }

  return body.errors.reduce<Record<string, string>>((map, entry) => {
    // First complaint wins: a field showing one clear reason beats a list.
    if (entry?.path && entry.message && !(entry.path in map)) {
      map[entry.path] = entry.message;
    }
    return map;
  }, {});
}

/**
 * Turns an axios failure into copy a franchise owner can act on. PRD §5 asks
 * for user-friendly error states; raw axios messages are not that.
 */
export function describeApiError(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const body = axiosError?.response?.data;
  const status = axiosError?.response?.status;

  if (status === 429) {
    const seconds = retryAfterSeconds(error);
    if (seconds) {
      return `Too many attempts. Try again in ${seconds} second${
        seconds === 1 ? '' : 's'
      }.`;
    }
    return body?.message ?? 'Too many attempts. Wait a moment and try again.';
  }

  if (body?.message) {
    return body.message;
  }

  const firstFieldError = body?.errors?.find(entry => entry?.message)?.message;
  if (firstFieldError) {
    return firstFieldError;
  }

  switch (status) {
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'That record no longer exists.';
    case 409:
      return 'Someone else changed this record. Refresh and try again.';
    case 422:
      return 'Some details are invalid. Check the form and try again.';
    default:
      break;
  }

  if (axiosError?.code === 'ECONNABORTED' || !axiosError?.response) {
    return 'No connection. Check your network and try again.';
  }

  return 'Something went wrong. Please try again.';
}

export default httpClient;
