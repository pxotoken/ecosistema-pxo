/**
 * Binance Endpoint Monitoring Helper
 * Handles automatic endpoint status tracking
 */

import { BinanceEndpointRepository } from '../../repositories/BinanceEndpointRepository.js';
import { EndpointStatus } from '@pxo/shared/types/binance';
import { HTTP_STATUS } from '@pxo/shared/consts/http';

/**
 * Extract endpoint name from URL (last segment after /)
 */
function extractEndpointName(url?: string): string | null {
    if (!url) return null;
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

/**
 * Updates Binance endpoint status based on request success
 * @param url - Request URL
 * @param method - HTTP method
 * @param status - HTTP status code
 */
export async function updateBinanceEndpointStatus(
    url: string,
    method: string,
    status: number
): Promise<void> {
    const endpointName = extractEndpointName(url);
    if (!endpointName) return;

    let endpointStatus: EndpointStatus;

    if (!status || status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        endpointStatus = status === HTTP_STATUS.SERVICE_UNAVAILABLE ? EndpointStatus.DOWN : EndpointStatus.DEGRADED;
    } else if (status >= HTTP_STATUS.BAD_REQUEST) {
        endpointStatus = EndpointStatus.DEGRADED;
    } else {
        endpointStatus = EndpointStatus.ACTIVE;
    }

    await BinanceEndpointRepository.upsertStatus({
        name: endpointName,
        status: endpointStatus,
        url,
        method
    });
}
