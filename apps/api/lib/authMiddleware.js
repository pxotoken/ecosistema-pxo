import { thirdwebAuth } from './thirdwebAuthServer-simple.js';
import { getServerSupabase } from './supabase.js';
import { UserRepository } from './repositories/UserRepository.js';
import { UserService } from './services/UserService.js';
import { getCookies } from './cookieParser.js';

const supabase = getServerSupabase();
const userRepository = new UserRepository(supabase);
const userService = new UserService(userRepository);

export async function authenticateRequest(req) {
  try {
    const cookies = getCookies(req);
    const jwt = cookies.pxo_jwt;

    if (!jwt) {
      return { user: null, error: 'No JWT token found' };
    }

    // Verify JWT with Thirdweb
    const authResult = await thirdwebAuth.verifyJWT({ jwt });
    
    if (!authResult.valid) {
      return { user: null, error: 'Invalid JWT token' };
    }

    // Get user from database
    const walletAddress = authResult.parsedJWT.sub;
    const user = await userService.getUserByWalletAddress(walletAddress);

    if (!user) {
      return { user: null, error: 'User not found' };
    }

    return { user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, error: 'Authentication failed' };
  }
}

const ADMIN_UUID = "989e3702-b515-4d6e-8627-fa0142a1a88f";
const ADMIN_EMAIL = "admin@pxo.com";

// Middleware wrapper for Vercel Serverless Functions
export function withAuth(handler) {
  return async (req, res) => {
    const { user, error } = await authenticateRequest(req);
    
    if (error || !user) {
      return res.status(401).json({ error: error || 'Authentication required' });
    }

    // Add user to request object
    req.user = user;
    
    return handler(req, res);
  };
}

// Middleware wrapper for admin-only endpoints
export function withAdminAuth(handler) {
  return async (req, res) => {
    const { user, error } = await authenticateRequest(req);
    
    if (error || !user) {
      return res.status(401).json({ error: error || 'Authentication required' });
    }

    const isAdminUser = user?.user_type?.includes(ADMIN_UUID) || user?.mail === ADMIN_EMAIL;
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Add user to request object
    req.user = user;
    
    return handler(req, res);
  };
}
