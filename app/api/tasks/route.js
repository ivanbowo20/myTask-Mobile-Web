import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import * as taskService from "@/lib/modules/tasks/task.service";

export async function GET(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const result = await taskService.getTasks(session.user.id, {
      limitParam: searchParams.get("limit"),
      offsetParam: searchParams.get("offset"),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perlindungan rate limiting untuk mutasi tambah tugas
    const rl = checkRateLimit(`task_post_${session.user.id}`, 60, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = await taskService.createTask(
      session.user.id,
      session.user.email,
      body
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({ task: result.task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perlindungan rate limiting untuk mutasi update tugas
    const rl = checkRateLimit(`task_put_${session.user.id}`, 120, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = await taskService.updateTask(session.user.id, body);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({ task: result.task });
  } catch (error) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
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

    // Perlindungan rate limiting untuk mutasi hapus tugas
    const rl = checkRateLimit(`task_del_${session.user.id}`, 120, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const id = searchParams.get("id");

    const result = await taskService.deleteTask(session.user.id, { id, scope });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}
