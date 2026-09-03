/**
 * Axios Configuration Types
 * Type definitions for axios client configuration
 */

import type { ApiProvider } from '../consts/providers.ts';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * Request metadata
 */
export interface RequestMetadata {
  startTime: number;
}

/**
 * Extended Axios Request Config with metadata
 */
export interface AxiosRequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
  provider?: ApiProvider;
  binanceAuth?: boolean;
}

/**
 * Extend Axios types to include provider field
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    provider?: ApiProvider;
    metadata?: RequestMetadata;
    binanceAuth?: boolean;
  }
}
