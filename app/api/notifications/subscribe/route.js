import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const authKey = body?.keys?.auth;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "Payload subscription tidak lengkap (endpoint, keys.p256dh, dan keys.auth diperlukan)." },
        { status: 400 }
      );
    }

    // Lakukan UPSERT ke tabel push_subscriptions di Supabase
    const result = await query(
      `INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         created_at = NOW()
       RETURNING *;`,
      [session.user.id, String(endpoint), String(p256dh), String(authKey)]
    );

    return NextResponse.json(
      { success: true, subscription: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menyimpan subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = body?.endpoint;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint diperlukan" }, { status: 400 });
    }

    await query(
      `DELETE FROM public.push_subscriptions WHERE user_id = $1 AND endpoint = $2;`,
      [session.user.id, String(endpoint)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menghapus subscription." },
      { status: 500 }
    );
  }
}
