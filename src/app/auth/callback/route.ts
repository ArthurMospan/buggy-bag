import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  // Support both `next` and `redirect` param names for intended destination
  const next = searchParams.get('redirect') ?? searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the intended destination after successful sign-in
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with an error param
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
