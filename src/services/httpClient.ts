import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

/**
 * The single axios instance for CakeConnect.
 *
 * Responsibilities kept here rather than at each call site:
 *   - JWT attachment (PRD §5 Security, "role-scoped APIs")
 *   - 401 handling, which drops the session rather than looping on a dead token
 *   - retry with backoff for transient network failures (context.md §5)
 *
 * The auth token is read through an injected getter instead of importing the
 * store, which would create a cycle: store -> slices -> services -> store.
 */

export const API_BASE_URL = 'https://api.cakeconnect.com';

/** Requests that fail with these are worth retrying; a 4xx is not. */
const RETRYABLE_STATUS = [408, 425, 429, 500, 502, 503, 504];
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

type RetryConfig = InternalAxiosRequestConfig & { retryCount?: number };

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

/**
 * Wired once at startup (see `src/store/authBridge.ts`) so this module stays
 * free of store imports.
 */
export function configureHttpClient(options: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

httpClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status === 401) {
      // The session is gone; retrying would only burn requests.
      onUnauthorized();
      return Promise.reject(error);
    }

    const isTransient = status === undefined || RETRYABLE_STATUS.includes(status);
    const retryCount = config?.retryCount ?? 0;

    if (config && isTransient && retryCount < MAX_RETRIES) {
      config.retryCount = retryCount + 1;
      // Exponential backoff: 500ms, then 1000ms.
      await delay(BASE_BACKOFF_MS * 2 ** retryCount);
      return httpClient(config);
    }

    return Promise.reject(error);
  },
);

export const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Turns an axios failure into copy a franchise owner can act on. PRD §5 asks
 * for user-friendly error states; raw axios messages are not that.
 */
export function describeApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }

  switch (axiosError?.response?.status) {
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
