import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AuthLayout({ children }) {
  // Hanya redirect ke dashboard jika sesi benar-benar tervalidasi di database Supabase aktif
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch (err) {
    // Biarkan render halaman login jika error atau redirect dipicu
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) {
      throw err;
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-transparent relative z-10">
      {/* Brand Header */}
      <div className="mb-6 text-center space-y-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-2.5 p-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center font-bold shadow-md">
            <CheckSquare className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="font-heading text-2xl font-bold text-[#FAFAFA] tracking-tight">
            MyTask
          </span>
        </Link>
        <p className="text-xs text-[#A1A1AA]">
          Manajemen Tugas Pintar & Terorganisir
        </p>
      </div>

      {/* Auth Card Content (Responsive: max-w-md on mobile, max-w-4xl ~880px on desktop) */}
      <div className="w-full max-w-md sm:max-w-4xl transition-all duration-300">
        {children}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-[#71717A]">
        © 2026 MyTask. Hak cipta dilindungi.
      </footer>
    </div>
  );
}
