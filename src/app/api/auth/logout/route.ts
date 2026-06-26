import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Logout Route] Error signing out:', err);
  }
  return NextResponse.json({ success: true });
}
