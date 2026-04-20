import { clearAuthCookies } from '../../lib/authUtils.js';

export default async function handler(req, res) {
  // Set CORS headers for credentials
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
    console.log('🔓 Logout API called');
    
    // Clear all auth cookies
    clearAuthCookies(res);
    
    console.log('✅ Auth cookies cleared');
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Error in logout API:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      details: error.message 
    });
  }
}
