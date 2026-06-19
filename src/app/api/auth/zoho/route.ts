import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Global ZOHO_CLIENT_ID is not configured in .env' }, { status: 500 });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
  
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${appUrl}/api/auth/zoho/callback`;
  
  // Scope from rule: ZohoCRM.modules.leads.ALL
  // Bigin scope: ZohoBigin.modules.contacts.ALL
  const scopes = 'ZohoCRM.modules.leads.ALL,ZohoBigin.modules.contacts.ALL';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    access_type: 'offline',
    state,
    prompt: 'consent',
  });

  const authUrl = `${accountsUrl}/oauth/v2/auth?${params.toString()}`;

  const isHttps = appUrl.startsWith('https');
  const store = await cookies();
  store.set('zoho_oauth_state', state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(authUrl);
}
