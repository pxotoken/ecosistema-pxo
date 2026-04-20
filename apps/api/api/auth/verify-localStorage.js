import { thirdwebAuth } from '../../lib/thirdwebAuthServer-simple.js';
import { getServerSupabase } from '../../lib/supabase.js';
import { UserRepository } from '../../lib/repositories/UserRepository.js';
import { UserService } from '../../lib/services/UserService.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export default async function handler(req, res) {
  // Set CORS headers
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
    console.log('🔍 Verify API called (localStorage fallback)');
    
    // Get JWT from body or cookies
    const { jwt } = req.body;
    const cookies = req.headers.cookie ? 
      Object.fromEntries(req.headers.cookie.split('; ').map(c => c.split('='))) : {};
    
    const jwtToken = jwt || cookies.pxo_jwt;

    if (!jwtToken) {
      return res.status(401).json({ error: 'No JWT token found' });
    }

    // Verify JWT with Thirdweb
    const authResult = await thirdwebAuth.verifyJWT({ jwt: jwtToken });
    
    if (!authResult.valid) {
      return res.status(401).json({ error: 'Invalid JWT token' });
    }

    // Get user from database
    const walletAddress = authResult.parsedJWT.sub;
    const user = await userService.getUserByWalletAddress(walletAddress);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ JWT verified successfully');
    
    res.status(200).json({
      success: true,
      user,
      message: 'Authentication verified (localStorage fallback)'
    });

  } catch (error) {
    console.error('❌ Error in verify API:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message 
    });
  }
}

