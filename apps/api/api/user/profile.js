import { withAuth } from '../../lib/authMiddleware.js';

async function profileHandler(req, res) {
  // Set CORS headers
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // The user is already authenticated and attached to req.user by the middleware
  res.status(200).json({
    success: true,
    user: req.user,
    message: 'Profile retrieved successfully'
  });
}

export default withAuth(profileHandler);
