import { withAuth } from '../../lib/authMiddleware.js';
import { thirdwebAuth, JWT_EXPIRATION_SECONDS } from '../../lib/thirdwebAuthServer-simple.js';
import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

function normalizeProviderInput(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 100);
}

const handler = async (req, res) => {
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const walletProvider = normalizeProviderInput(req.body?.walletProvider, 'unknown');
    const providerClass = normalizeProviderInput(req.body?.providerClass, 'external_wallet');
    const walletAddress = req.user.wallet_address;

    let dbUpdated = false;
    let dbError = null;
    try {
      await userService.updateUser({
        id: req.user.id,
        auth_provider: walletProvider,
        auth_provider_class: providerClass,
      });
      dbUpdated = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to persist auth provider in users table:', dbError);
    }

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      address: walletAddress,
      chain_id: 1,
      domain: process.env.VITE_THIRDWEB_AUTH_DOMAIN || req.headers.host,
      expiration_time: (currentTimeInSeconds + JWT_EXPIRATION_SECONDS).toString(),
      invalid_before: currentTimeInSeconds.toString(),
      nonce: Math.random().toString(36).substring(2, 15),
      context: {
        auth_provider: walletProvider,
        auth_provider_class: providerClass,
      },
    };

    const jwt = await thirdwebAuth.generateJWT({ payload: jwtPayload });
    const isProduction = process.env.NODE_ENV === 'production';
    const currentUser = await userService.getUserByWalletAddress(walletAddress);
    const responseUser = currentUser || req.user;

    if (isProduction) {
      res.setHeader('Set-Cookie', [
        `pxo_jwt=${jwt}; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=${JWT_EXPIRATION_SECONDS}`,
        `pxo_user=${encodeURIComponent(JSON.stringify(responseUser))}; Path=/; Secure; SameSite=Lax; Max-Age=${JWT_EXPIRATION_SECONDS}`,
      ]);
    } else {
      res.setHeader('Set-Cookie', [
        `pxo_jwt=${jwt}; Path=/; SameSite=Lax; Max-Age=${JWT_EXPIRATION_SECONDS}`,
        `pxo_user=${encodeURIComponent(JSON.stringify(responseUser))}; Path=/; SameSite=Lax; Max-Age=${JWT_EXPIRATION_SECONDS}`,
      ]);
    }

    console.log('🔐 Auth provider post-login sync:', {
      userId: req.user.id,
      walletAddress,
      walletProvider,
      providerClass,
      dbUpdated,
      dbError,
    });

    res.status(200).json({
      success: true,
      walletProvider,
      providerClass,
      dbUpdated,
      dbError,
    });
  } catch (error) {
    console.error('❌ Error syncing auth provider post-login:', error);
    res.status(500).json({
      error: 'Failed to sync auth provider',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export default withAuth(handler);
