import { NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';

export async function DELETE(request: Request) {
  try {
    const supabase = await createAuthClient();
    
    // Перевіряємо, чи користувач авторизований
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Використовуємо service client для видалення користувача
    const serviceClient = createServiceClient();
    
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Помилка видалення акаунту:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Помилка сервера при видаленні акаунту:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
