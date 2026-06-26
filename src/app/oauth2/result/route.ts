import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * OneB OAuth callback — registered redirect_uri: https://buggy-bag.vercel.app/oauth2/result
 *
 * Docs: OAuth 2.0 Authorization Code flow
 *   - Token endpoint: {ONEB_API_URI}token  → https://account.oneb.app/s/token
 *   - Profile:        {ONEB_API_URI}auth/v1/user-details
 *
 * NOTE: redirect_uri must NOT contain query params — exact match with registered URI.
 * The post-login redirect destination is passed via the `state` param as JSON { r: string }.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code     = searchParams.get('code');
  const stateRaw = searchParams.get('state') ?? '';

  // Extract post-login redirect from state (encoded by the client as JSON)
  let redirectTo = '/';
  try {
    const parsed = JSON.parse(decodeURIComponent(stateRaw));
    if (parsed?.r && typeof parsed.r === 'string') redirectTo = parsed.r;
  } catch {
    // state might be a plain random string (register/profile pages) — default to '/'
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oneb_no_code`);
  }

  const clientId     = process.env.NEXT_PUBLIC_ONEB_CLIENT_ID;
  const clientSecret = process.env.ONEB_CLIENT_SECRET;
  const apiUri       = 'https://account.oneb.app/s/';
  // redirect_uri must match what's registered in OneB dashboard (where code is actually sent)
  const redirectUri  = `${origin}/login`;

  // Validate env vars are set
  if (!clientId || clientId === 'dummy_client_id') {
    console.error('[OneB] NEXT_PUBLIC_ONEB_CLIENT_ID is not set or is placeholder');
    return NextResponse.redirect(`${origin}/login?error=oneb_no_client_id`);
  }
  if (!clientSecret) {
    console.error('[OneB] ONEB_CLIENT_SECRET is not set');
    return NextResponse.redirect(`${origin}/login?error=oneb_no_client_secret`);
  }

  console.log('[OneB] Starting token exchange', {
    clientId,
    clientSecretLength: clientSecret.length,
    redirectUri,
    codeLength: code.length,
  });

  try {
    // --- Step 1: Exchange code for tokens ---
    // Token endpoint = {ONEB_API_URI}token
    const tokenRes = await fetch(`${apiUri}token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[OneB] Token exchange failed:', errText, 'redirect_uri:', redirectUri);
      return NextResponse.redirect(`${origin}/login?error=oneb_token`);
    }

    const tokenData = await tokenRes.json() as {
      access_token:  string;
      refresh_token: string;
      expires_in:    number;
      token_type:    string;
    };

    // --- Step 2: Fetch user profile ---
    // Profile endpoint = {ONEB_API_URI}auth/v1/user-details
    const profileRes = await fetch(`${apiUri}auth/v1/user-details`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      console.error('[OneB] Profile fetch failed:', await profileRes.text());
      return NextResponse.redirect(`${origin}/login?error=oneb_profile`);
    }

    // OneB user-details response (no email field — uses accountId as global identifier)
    const profile = await profileRes.json() as {
      id:          string;  // user id in workspace
      accountId:   string;  // global account id (= sub from JWT)
      name:        string;
      tenantId:    string;  // workspace id
      alias?:      string;
      workspace?:  string;
      locale?:     string;
      photoUrl?:   string | null;
      logoUrl?:    string | null;
    };

    if (!profile.accountId) {
      return NextResponse.redirect(`${origin}/login?error=oneb_no_account`);
    }

    // OneB doesn't provide email — generate a stable synthetic email from accountId
    const syntheticEmail = `oneb_${profile.accountId}@oneb.buggy-bag`;

    // --- Step 3: Find or create user in Supabase ---
    const serviceClient = createServiceClient();

    const { data: { users }, error: listErr } = await serviceClient.auth.admin.listUsers();
    const existingUser = !listErr
      ? users.find(u => u.user_metadata?.oneb_id === profile.accountId || u.email === syntheticEmail)
      : undefined;

    if (!existingUser) {
      const { error: createErr } = await serviceClient.auth.admin.createUser({
        email:         syntheticEmail,
        email_confirm: true,
        user_metadata: {
          full_name:    profile.name,
          avatar_url:   profile.photoUrl ?? null,
          oneb_id:      profile.accountId,
          oneb_alias:   profile.alias ?? null,
          workspace:    profile.workspace ?? null,
          workspace_id: profile.tenantId,
          provider:     'oneb',
        },
      });

      if (createErr) {
        console.error('[OneB] Create user failed:', createErr);
        return NextResponse.redirect(`${origin}/login?error=oneb_create`);
      }
    } else {
      // Update metadata if user already exists
      await serviceClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          full_name:    profile.name,
          avatar_url:   profile.photoUrl ?? existingUser.user_metadata?.avatar_url,
          oneb_alias:   profile.alias ?? null,
          workspace:    profile.workspace ?? null,
          workspace_id: profile.tenantId,
        },
      });
    }

    // --- Step 4: Generate a magic link to authenticate the user ---
    // IMPORTANT: Supabase SSR uses PKCE flow — magic link redirects with ?code= to a callback URL.
    // We route through /auth/callback which calls exchangeCodeForSession, then redirects to destination.
    const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`;

    const { data: linkData, error: linkErr } = await serviceClient.auth.admin.generateLink({
      type:    'magiclink',
      email:   syntheticEmail,
      options: { redirectTo: callbackUrl },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[OneB] Generate link failed:', linkErr);
      return NextResponse.redirect(`${origin}/login?error=oneb_link`);
    }

    // Redirect through Supabase magic link → Supabase verifies → /auth/callback → destination
    return NextResponse.redirect(linkData.properties.action_link);

  } catch (err) {
    console.error('[OneB] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=oneb_unexpected`);
  }
}
