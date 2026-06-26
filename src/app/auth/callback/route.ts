import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  // Support both `next` and `redirect` param names for intended destination
  const next = searchParams.get('redirect') ?? searchParams.get('next') ?? '/';

  const redirectTo = `${origin}${next}`;
  const response = NextResponse.redirect(redirectTo);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the intended destination after successful sign-in
      return response;
    }
    console.error('[Auth Callback] Code exchange failed:', error);
  }

  // If something went wrong, redirect to login with an error param
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
