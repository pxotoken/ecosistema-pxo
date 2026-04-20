/**
 * Axios Interceptors
 * Request and response interceptors for axios client
 */

import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { AxiosRequestConfigWithMetadata } from '@pxo/shared/types/axios';
import { sanitizeForLog } from '@pxo/shared/helpers/sanitize';
import { applyBinanceAuth } from '../../helpers/binance/auth.js';
import { updateBinanceEndpointStatus } from '../../helpers/binance/endpointMonitoring.js';
import { createLog } from '../../repositories/ApiLogRepository.js';
import { API_PROVIDERS } from '@pxo/shared/consts/providers';
import { HTTP_METHODS } from '@pxo/shared/consts/http';


/**
 * Request interceptor - adds metadata, logs, and handles auth
 */
export function applyRequestInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {

      const configWithMetadata = config as AxiosRequestConfigWithMetadata;
      configWithMetadata.metadata = { startTime: Date.now() };

      if (configWithMetadata.binanceAuth) {
        config = applyBinanceAuth(config);
      }

      console.log(
        `[API Client] ${config.method?.toUpperCase()} ${config.url}`,
        sanitizeForLog({
          params: config.params,
          headers: config.headers,
          timeout: config.timeout,
        })
      );

      return config;
    },
    (error: Error) => {
      console.error('[API Client] Request Error:', error);
      return Promise.reject(error);
    }
  );
}

/**
 * Response interceptor - logs responses and saves to database
 */
export function applyResponseInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    async (response: AxiosResponse): Promise<AxiosResponse> => {
      const config = response.config as AxiosRequestConfigWithMetadata;
      const duration = Date.now() - (config.metadata?.startTime ?? Date.now());
      const provider = config.provider ?? API_PROVIDERS.UNKNOWN;

      console.log(
        `[API Client] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`
      );

      await logAndMonitor(
        provider,
        response.config.method?.toUpperCase() || HTTP_METHODS.UNKNOWN,
        response.config.url || '',
        response.status,
        response.data
      );

      return response;
    },
    async (error: AxiosError): Promise<never> => {
      const config = error.config as AxiosRequestConfigWithMetadata | undefined;
      const duration = config?.metadata?.startTime
        ? Date.now() - config.metadata.startTime
        : 0;
      const provider = config?.provider ?? API_PROVIDERS.UNKNOWN;

      console.error(
        `[API Client] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Error (${duration}ms):`,
        {
          message: error.message,
          status: error.response?.status,
        }
      );

      await logAndMonitor(
        provider,
        error.config?.method?.toUpperCase() || HTTP_METHODS.UNKNOWN,
        error.config?.url || '',
        error.response?.status || 0,
        error.response?.data || { error: error.message }
      );

      return Promise.reject(error);
    }
  );
}

/**
 * Log and monitor API request/response
 */
async function logAndMonitor(
  provider: string,
  method: string,
  url: string,
  status: number,
  responseData: any
): Promise<void> {
  await createLog({
    provider,
    method,
    endpoint: url,
    status,
    response: responseData,
  }).catch((logError) => {
    console.error('[API Logging] Failed to save log to database:', logError);
  });

  if (provider === API_PROVIDERS.BINANCE) {
    await updateBinanceEndpointStatus(url, method, status).catch((monitorError) => {
      console.error('[Endpoint Monitoring] Failed to update status:', monitorError);
    });
  }
}
