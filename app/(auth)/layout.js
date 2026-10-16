import Link from "next/link";
import { CheckSquare } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-transparent relative z-10">
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

      {/* Auth Card Content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-[#71717A]">
        © 2026 MyTask. Hak cipta dilindungi.
      </footer>
    </div>
  );
}
