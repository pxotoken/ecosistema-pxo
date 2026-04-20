// Simple cookie parser for Vercel Functions
export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  
  const cookies = {};
  const pairs = cookieHeader.split(';');
  
  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        // If decodeURIComponent fails, use the raw value
        cookies[name] = value;
      }
    }
  }
  
  return cookies;
}

// Get cookies from request headers
export function getCookies(req) {
  const cookieHeader = req.headers.cookie;
  return parseCookies(cookieHeader);
}
