import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-[#FAFAFA]">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-[#A1A1AA]">
            Maaf, tautan yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-5 py-2.5 rounded-lg bg-[#FAFAFA] text-[#0A0A0A] font-semibold text-sm hover:bg-[#E4E4E7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
