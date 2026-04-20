import { getServerLiquidity } from '../../lib/liquidity.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chainId } = req.query;
    const parsedChainId = chainId ? Number(chainId) : undefined;

    const liquidity = await getServerLiquidity(
      Number.isFinite(parsedChainId) ? parsedChainId : undefined
    );

    res.status(200).json({
      success: true,
      liquidity,
    });
  } catch (error) {
    console.error('Error in liquidity API:', error);
    res.status(500).json({
      error: 'Failed to fetch liquidity',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

