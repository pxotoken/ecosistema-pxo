/**
 * HTTP Configuration Constants
 * Default values for HTTP client configuration
 */

/**
 * Default timeout for HTTP requests (5 seconds)
 */
export const DEFAULT_TIMEOUT = 5000;

/**
 * Default number of retry attempts
 */
export const DEFAULT_RETRIES = 3;

/**
 * Base delay for exponential backoff (1 second)
 */
export const RETRY_BASE_DELAY = 1000;


export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
  UNKNOWN: 'UNKNOWN',
} as const;

export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
