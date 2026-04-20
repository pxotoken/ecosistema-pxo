import { Resend } from "resend";

// Singleton instance
let resendInstance = null;

export function getResendClient() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn(
      "⚠️ RESEND_API_KEY is not set. Email functionality will be disabled."
    );
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(key);
  }

  return resendInstance;
}

// Email configuration - read directly from env (safe to read at module load)
export const EMAIL_CONFIG = {
  fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@pxotoken.com",
  fromName: process.env.RESEND_FROM_NAME || "PXO Platform",
  replyTo: process.env.RESEND_REPLY_TO || "info@pxotoken.com",
};
