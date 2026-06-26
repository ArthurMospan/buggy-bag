import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * OneB OAuth callback — registered redirect_uri: https://buggy-bag.vercel.app/oauth2/result
 *
 * Flow:
 * 1. Receive ?code=... from OneB
 * 2. Exchange code for access_token via OneB token endpoint
 * 3. Fetch user profile from OneB
 * 4. Sign in / link identity in Supabase (using email as the anchor)
 * 5. Redirect to intended destination
 *
 * NOTE: redirect_uri must NOT contain query params — exact match with registered URI.
 * The post-login redirect destination is passed via the `state` param as JSON { r: string }.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code  = searchParams.get('code');
  const stateRaw = searchParams.get('state') ?? '';

  // Extract post-login redirect from state (encoded by the client)
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

  const clientId     = process.env.NEXT_PUBLIC_ONEB_CLIENT_ID!;
  const clientSecret = process.env.ONEB_CLIENT_SECRET!;
  // Must match registered redirect_uri exactly — no query params
  const redirectUri  = `${origin}/oauth2/result`;

  try {
    // --- Step 1: Exchange code for tokens ---
    const tokenRes = await fetch('https://account.oneb.app/oauth/token', {
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
      console.error('[OneB] Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${origin}/login?error=oneb_token`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      token_type:   string;
      id_token?:    string;
    };

    // --- Step 2: Fetch user profile ---
    const profileRes = await fetch('https://account.oneb.app/oauth/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      console.error('[OneB] Profile fetch failed:', await profileRes.text());
      return NextResponse.redirect(`${origin}/login?error=oneb_profile`);
    }

    const profile = await profileRes.json() as {
      sub:      string;
      email:    string;
      name?:    string;
      picture?: string;
    };

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=oneb_no_email`);
    }

    // --- Step 3: Upsert user via Supabase service client ---
    const serviceClient = createServiceClient();

    // Try to find existing user by email
    const { data: { users }, error: listErr } = await serviceClient.auth.admin.listUsers();
    const existingUser = !listErr ? users.find(u => u.email === profile.email) : undefined;

    if (existingUser) {
      // Sign in the existing user by creating a session
      const { data: session, error: sessionErr } = await serviceClient.auth.admin.createSession({
        user_id: existingUser.id,
      });
      if (sessionErr || !session) {
        console.error('[OneB] Create session failed:', sessionErr);
        return NextResponse.redirect(`${origin}/login?error=oneb_session`);
      }

      const res = NextResponse.redirect(`${origin}${redirectTo}`);
      res.cookies.set('sb-access-token',  session.session.access_token,  { path: '/', httpOnly: true, sameSite: 'lax' });
      res.cookies.set('sb-refresh-token', session.session.refresh_token, { path: '/', httpOnly: true, sameSite: 'lax' });
      return res;
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email:         profile.email,
        email_confirm: true,
        user_metadata: {
          full_name:  profile.name    ?? profile.email,
          avatar_url: profile.picture ?? null,
          oneb_id:    profile.sub,
          provider:   'oneb',
        },
      });

      if (createErr || !newUser.user) {
        console.error('[OneB] Create user failed:', createErr);
        return NextResponse.redirect(`${origin}/login?error=oneb_create`);
      }

      const { data: session, error: sessionErr } = await serviceClient.auth.admin.createSession({
        user_id: newUser.user.id,
      });
      if (sessionErr || !session) {
        console.error('[OneB] Create session failed:', sessionErr);
        return NextResponse.redirect(`${origin}/login?error=oneb_session`);
      }

      const res = NextResponse.redirect(`${origin}${redirectTo}`);
      res.cookies.set('sb-access-token',  session.session.access_token,  { path: '/', httpOnly: true, sameSite: 'lax' });
      res.cookies.set('sb-refresh-token', session.session.refresh_token, { path: '/', httpOnly: true, sameSite: 'lax' });
      return res;
    }
  } catch (err) {
    console.error('[OneB] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=oneb_unexpected`);
  }
}
