/**
 * Axios Client Configuration
 * Centralized HTTP client with interceptors, retry logic, and logging
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { retryConfig } from './retry-config.js';
import { applyRequestInterceptor, applyResponseInterceptor } from './interceptors.js';
import { API_PROVIDERS, type ApiProvider } from '@pxo/shared/consts/providers';
import { DEFAULT_TIMEOUT, DEFAULT_HEADERS } from '@pxo/shared/consts/http';
import '@pxo/shared/types/axios';

const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT,
  headers: DEFAULT_HEADERS,
});

axiosRetry(apiClient, retryConfig);

applyRequestInterceptor(apiClient);
applyResponseInterceptor(apiClient);

export default apiClient;
export { API_PROVIDERS, type ApiProvider };
