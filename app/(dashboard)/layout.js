import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInitialDashboardData } from "@/lib/server-data";
import { TaskProvider } from "@/lib/task-context";
import { NotebookProvider } from "@/lib/notebook-context";
import DashboardShell from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const reqHeaders = await headers();
  let session = null;

  try {
    session = await auth.api.getSession({
      headers: reqHeaders,
    });
  } catch (err) {
    console.error("DashboardLayout auth.api.getSession error:", err);
  }

  if (!session?.user) {
    redirect("/login");
  }

  // Bersihkan data session menjadi serializable JSON murni untuk boundary Client Component
  const serializableSession = JSON.parse(JSON.stringify(session));

  // Ambil data awal tugas dan kategori langsung dari database di server (SSR)
  const { tasks: initialTasks, categories: initialCategories, error: serverError } =
    await getInitialDashboardData(session.user.id);

  return (
    <TaskProvider
      initialSession={serializableSession}
      initialTasks={initialTasks}
      initialCategories={initialCategories}
      hasServerError={serverError}
    >
      <NotebookProvider>
        <DashboardShell>{children}</DashboardShell>
      </NotebookProvider>
    </TaskProvider>
  );
}
