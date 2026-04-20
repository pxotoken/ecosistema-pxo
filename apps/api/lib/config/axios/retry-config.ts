/**
 * Axios Retry Configuration
 * Configures retry behavior for failed HTTP requests
 */

import { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { DEFAULT_RETRIES, HTTP_STATUS, RETRY_BASE_DELAY } from '@pxo/shared/consts/http';

/**
 * Retry configuration for axios-retry
 */
export const retryConfig = {
  retries: DEFAULT_RETRIES,
  retryDelay: (retryCount: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s
    return Math.pow(2, retryCount) * RETRY_BASE_DELAY;
  },
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx errors, but not on 4xx errors
    return (
      isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );
  },
  onRetry: (retryCount: number, _error: any, requestConfig: any) => {
    console.log(
      `[Axios Retry] Attempt ${retryCount}/${DEFAULT_RETRIES} for ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`
    );
  },
};
