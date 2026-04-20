import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDitto } from '../lib/services/external/PokeApiService.js';
import { HTTP_METHODS, HTTP_STATUS } from '@pxo/shared/consts/http';

/**
 * PokeAPI Handler - Get Ditto's data
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === HTTP_METHODS.OPTIONS) {
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  if (req.method !== HTTP_METHODS.GET) {
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported',
    });
  }

  try {
    const dittoData = await getDitto();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: dittoData,
    });
  } catch (error) {
    console.error('[PokeAPI Handler] Error fetching Ditto data:', error);

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch Pokemon data',
      message: (error as Error).message,
    });
  }
}
