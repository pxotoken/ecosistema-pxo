import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Set secure cookies (simplified without refresh tokens)
export function setSecureCookies(res, { jwt, user }) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('🍪 Creating cookie headers...');
  console.log('🍪 Environment:', isProduction ? 'production' : 'development');
  console.log('🍪 JWT length:', jwt ? jwt.length : 0);
  console.log('🍪 User:', user ? 'present' : 'missing');
  
  // Get domain from environment or request
  const domain = process.env.VITE_THIRDWEB_AUTH_DOMAIN || 
                 process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || 
                 (res.req ? res.req.headers.host : 'localhost');
  
  console.log('🍪 Domain for cookies:', domain);
  
  // For Vercel production, we need to be more careful with cookie settings
  if (isProduction) {
    // Production settings optimized for Vercel
    const cookieHeaders = [
      `pxo_jwt=${jwt}; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=${30 * 60}`,
      `pxo_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; Secure; SameSite=Lax; Max-Age=${30 * 60}`
    ];
    
    console.log('🍪 Production cookie headers:', cookieHeaders);
    res.setHeader('Set-Cookie', cookieHeaders);
  } else {
    // Development settings - simpler for localhost
    console.log('🍪 Using development cookie settings...');
    const cookieHeaders = [
      `pxo_jwt=${jwt}; Path=/; SameSite=Lax; Max-Age=${30 * 60}`, // No HttpOnly in dev
      `pxo_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax; Max-Age=${30 * 60}`
    ];
    
    console.log('🍪 Development cookie headers:', cookieHeaders);
    res.setHeader('Set-Cookie', cookieHeaders);
  }
  
  console.log('🍪 Cookies set in response headers');
  
  // Log the actual headers that were set
  const setCookieHeader = res.getHeader('Set-Cookie');
  console.log('🍪 Actual Set-Cookie header value:', setCookieHeader);
}

// Clear all auth cookies
export function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    res.setHeader('Set-Cookie', [
      'pxo_jwt=; HttpOnly; Path=/; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'pxo_user=; Path=/; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);
  } else {
    res.setHeader('Set-Cookie', [
      'pxo_jwt=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'pxo_user=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);
  }
}
