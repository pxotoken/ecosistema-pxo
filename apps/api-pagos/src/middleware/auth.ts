import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticateAPIKey(_req: FastifyRequest, _reply: FastifyReply) {
  // TODO: Validate Bearer token from Authorization header
  // TODO: Validate X-POS-ID header against merchantId
  throw new Error('Not implemented');
}

export function verifyHMAC(_signature: string, _body: string, _secret: string): boolean {
  // TODO: Implement HMAC-SHA256 verification for webhook signatures
  throw new Error('Not implemented');
}
