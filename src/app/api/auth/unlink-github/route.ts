import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-server';

/**
 * DELETE /api/auth/unlink-github
 *
 * Server-side GitHub identity unlink.
 * We use the auth client (the user's own JWT) server-side, which avoids
 * the browser-session restrictions but still respects Supabase safety rules.
 *
 * Before unlinking we enforce our own rule:
 * the user must have at least one other login method (email/password or OneB).
 */
export async function DELETE() {
  try {
    const authClient = await createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the GitHub identity
    const githubIdentity = user.identities?.find(i => i.provider === 'github');
    if (!githubIdentity) {
      return NextResponse.json({ error: 'GitHub identity not found' }, { status: 404 });
    }

    // Safety: user must have at least one other login method or they'd be locked out
    const hasEmailIdentity  = user.identities?.some(i => i.provider === 'email') ?? false;
    const hasOnebConnected  = !!(user.user_metadata?.oneb_id && user.user_metadata?.oneb_connected !== false);
    const isPrimaryGitHub   = !hasEmailIdentity && !hasOnebConnected;

    if (isPrimaryGitHub) {
      return NextResponse.json(
        { error: 'primary_provider', message: 'GitHub є основним способом входу. Додайте пароль або підключіть OneB перед відключенням.' },
        { status: 400 }
      );
    }

    // Unlink using the user's own server-side auth client
    const { error: unlinkError } = await authClient.auth.unlinkIdentity(githubIdentity as any);

    if (unlinkError) {
      console.error('[unlink-github] Failed:', unlinkError);
      return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[unlink-github] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
