import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    // Аутентифікація запиту, щоб переконатися, що він надходить від Vercel CRON (за бажанням)
    const authHeader = request.headers.get("authorization");
    
    // Якщо у вас в Vercel Environment Variables задано CRON_SECRET, 
    // це захистить ваш ендпоінт від сторонніх викликів
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Створюємо клієнт з сервісним ключем (bypasses RLS)
    const supabase = createServiceClient();

    // Робимо простий запит до бази даних, щоб вона не засинала.
    // Виклик auth.admin.listUsers - це легкий запит, який точно розбудить БД.
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Database pinged successfully" });
  } catch (error) {
    console.error("Keep-alive error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to ping database" },
      { status: 500 }
    );
  }
}
