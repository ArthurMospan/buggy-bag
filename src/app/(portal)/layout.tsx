import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase-server';
import AppShell from '@/components/layout/AppShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect('/login');

  const metadata = claims.user_metadata && typeof claims.user_metadata === 'object'
    ? claims.user_metadata as Record<string, unknown>
    : {};
  const firstString = (...values: unknown[]) =>
    values.find((value): value is string => typeof value === 'string') ?? '';

  const userName = firstString(metadata.display_name, metadata.full_name, metadata.name);
  const userAvatar = firstString(metadata.custom_avatar_url, metadata.avatar_url, metadata.picture);
  const userEmail = typeof claims.email === 'string' ? claims.email : '';

  return <AppShell userEmail={userEmail} userName={userName} userAvatar={userAvatar}>{children}</AppShell>;
}
