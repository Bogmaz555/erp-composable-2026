import { NextRequest, NextResponse } from 'next/server';

/**
 * Local password-grant proxy → Keycloak.
 * Lets remote testers (Cloudflare tunnel) log in without browser access to :8080.
 * Path is /auth/token (not /api/*) so next.config rewrites do not steal the request.
 */
const TOKEN_URL =
  process.env.KEYCLOAK_TOKEN_URL ||
  process.env.NEXT_PUBLIC_KEYCLOAK_TOKEN_URL ||
  'http://127.0.0.1:8080/realms/erp/protocol/openid-connect/token';
const CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || 'erp-frontend';

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string; client_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'username and password required' },
      { status: 400 },
    );
  }

  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: body.client_id || CLIENT_ID,
    username,
    password,
    scope: 'openid',
  });

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'keycloak_unreachable',
        error_description: e instanceof Error ? e.message : 'token endpoint failed',
      },
      { status: 502 },
    );
  }
}
