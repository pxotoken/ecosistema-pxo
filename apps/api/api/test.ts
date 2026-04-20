import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TestResponse {
  message: string;
  timestamp: string;
  method: string;
  url: string;
  env: {
    hasSupabaseUrl: boolean;
    hasThirdwebClientId: boolean;
    hasThirdwebAuthDomain: boolean;
    hasThirdwebAdminKey: boolean;
    hasThirdwebSecretKey: boolean;
  };
}

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const response: TestResponse = {
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method || 'GET',
    url: req.url || '/api/test',
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasThirdwebClientId: !!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
      hasThirdwebAuthDomain: !!process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN,
      hasThirdwebAdminKey: !!process.env.THIRDWEB_ADMIN_PRIVATE_KEY,
      hasThirdwebSecretKey: !!process.env.THIRDWEB_SECRET_KEY,
    }
  };

  res.status(200).json(response);
}
