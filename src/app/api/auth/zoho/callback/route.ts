import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/admin/migration?zoho_error=${encodeURIComponent(error)}`);
  }

  const store = await cookies();
  const savedState = store.get('zoho_oauth_state')?.value;
  const userId = store.get('user_id')?.value;

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/login?error=session_expired`);
  }

  if (!code || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/admin/migration?zoho_error=invalid_state`);
  }

  try {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

    if (!clientId || !clientSecret) {
      throw new Error('ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET is missing in server configuration');
    }

    const redirectUri = `${appUrl}/api/auth/zoho/callback`;

    // Try regional endpoints for robust exchange
    const regionalAccountsUrls = [
      accountsUrl,
      'https://accounts.zoho.in',
      'https://accounts.zoho.com'
    ];

    let tokens: any = null;
    let exchangeErr: any = null;

    for (const url of regionalAccountsUrls) {
      try {
        const targetUrl = `${url}/oauth/v2/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`;
        console.log(`[ZOHO OAUTH CALLBACK] Exchanging code on: ${url}`);
        const response = await fetch(targetUrl, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          if (data.access_token) {
            tokens = data;
            break;
          }
        }
      } catch (err: any) {
        exchangeErr = err;
      }
    }

    if (!tokens || !tokens.access_token) {
      throw exchangeErr || new Error('Failed to exchange authorization code for tokens');
    }

    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;

    // Save tokens in database under current userId
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ZohoConfig" (id, "clientId", "clientSecret", "refreshToken", "accessToken", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         "clientId" = EXCLUDED."clientId",
         "clientSecret" = EXCLUDED."clientSecret",
         "refreshToken" = EXCLUDED."refreshToken",
         "accessToken" = EXCLUDED."accessToken",
         "updatedAt" = NOW()`,
      userId,
      clientId,
      clientSecret,
      refreshToken || "",
      accessToken
    );

    store.delete('zoho_oauth_state');

    return NextResponse.redirect(`${appUrl}/admin/migration?zoho_connected=1`);
  } catch (err: any) {
    console.error('[Zoho OAuth callback error]', err.message);
    return NextResponse.redirect(`${appUrl}/admin/migration?zoho_error=${encodeURIComponent(err.message)}`);
  }
}
