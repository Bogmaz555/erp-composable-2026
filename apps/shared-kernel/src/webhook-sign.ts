/**
 * Enterprise Q4 — HMAC-SHA256 webhook signatures.
 * Header: X-ERP-Signature: sha256=<hex>
 */
import { createHmac, timingSafeEqual } from 'crypto';

export function signWebhookBody(body: string | Buffer, secret: string): string {
  const h = createHmac('sha256', secret);
  h.update(typeof body === 'string' ? body : body);
  return `sha256=${h.digest('hex')}`;
}

export function verifyWebhookSignature(
  body: string | Buffer,
  secret: string,
  header: string | undefined | null,
): boolean {
  if (!header || !secret) return false;
  const expected = signWebhookBody(body, secret);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(header).trim());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const WEBHOOK_SIGNATURE_HEADER = 'x-erp-signature';
