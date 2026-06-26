import { createServiceClient } from './supabase-server';

/** Returns true if user is owner or member of the given project */
export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const service = createServiceClient();
  let { data, error } = await service
    .from('projects')
    .select('user_id, members')
    .eq('id', projectId)
    .single();

  if (error && error.message.includes('members')) {
    const fallback = await service
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();
    data = fallback.data as any;
  }

  if (!data) return false;
  if (data.user_id === userId) return true;
  const members: { user_id: string }[] = data.members ?? [];
  return members.some(m => m.user_id === userId);
}
