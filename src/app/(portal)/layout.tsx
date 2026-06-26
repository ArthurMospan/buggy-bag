import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase-server';
import AppShell from '@/components/layout/AppShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const userName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
  const userAvatar = user.user_metadata?.custom_avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

  return <AppShell userEmail={user.email ?? ''} userName={userName} userAvatar={userAvatar}>{children}</AppShell>;
}
