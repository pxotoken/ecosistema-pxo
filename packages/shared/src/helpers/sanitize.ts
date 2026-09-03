/**
 * Sanitize Helper
 * Utilities for sanitizing sensitive data from logs
 */

import { SENSITIVE_KEYS } from '../consts/security.ts';

/**
 * Sanitize sensitive data from objects for safe logging
 * @param obj - Object to sanitize
 * @returns Sanitized object with sensitive values redacted
 */
export function sanitizeForLog(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item));
  }

  const sanitized: any = {};

  Object.keys(obj).forEach((key) => {
    const shouldRedact = SENSITIVE_KEYS.some((sensitive) => 
      key.toLowerCase().includes(sensitive)
    );

    if (shouldRedact) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeForLog(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  });

  return sanitized;
}

/**
 * Sanitize URL by removing query parameters that might contain sensitive data
 * @param url - URL to sanitize
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    SENSITIVE_KEYS.forEach((key) => {
      if (urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, '[REDACTED]');
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}
