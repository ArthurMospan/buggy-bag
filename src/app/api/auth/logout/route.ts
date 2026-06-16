import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
