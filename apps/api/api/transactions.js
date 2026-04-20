export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chain = '80002' } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const chainId = String(chain) === '137' ? 137 : 80002;
    const alchemyHost = chainId === 137 ? 'polygon-mainnet.g.alchemy.com' : 'polygon-amoy.g.alchemy.com';
    const alchemyUrl = `https://${alchemyHost}/v2/${process.env.ALCHEMY_API_KEY}`;

    const sentResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress: address,
          category: ['erc20'],
          order: 'desc',
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: '0x3e8'
        }]
      })
    });

    const receivedResponse = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          toAddress: address,
          category: ['erc20'],
          order: 'desc',
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: '0x3e8'
        }]
      })
    });

    const sentData = await sentResponse.json();
    const receivedData = await receivedResponse.json();

    const allTransfers = [
      ...(sentData.result?.transfers || []),
      ...(receivedData.result?.transfers || [])
    ];

    const transactions = allTransfers.map((tx) => ({
      hash: tx.hash,
      from_address: tx.from,
      to_address: tx.to,
      block_timestamp: tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).toISOString() : null,
      value: tx.value?.toString() || "0",
      tokenSymbol: tx.asset,
      tokenAddress: tx.rawContract.address,
      tokenDecimals: tx.rawContract.decimal || 18,
      isReceived: tx.to.toLowerCase() === address.toLowerCase(),
      status: 1
    }));

    res.status(200).json({
      data: transactions,
      meta: { total_items: transactions.length }
    });

  } catch (error) {
    console.error('Error in transactions API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
} 