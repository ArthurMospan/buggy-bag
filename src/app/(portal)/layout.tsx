import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase-server';
import AppShell from '@/components/layout/AppShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>;
}
