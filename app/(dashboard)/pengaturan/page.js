'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Info,
  LogOut,
  ShieldAlert,
  Calendar,
  Mail,
} from "lucide-react";
import { Palette, GearSix } from "@phosphor-icons/react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MotionContainer from "@/components/ui/MotionContainer";
import { useToast } from "@/lib/use-toast";
import { useTheme } from "@/lib/theme-context";
import { useSession, signOut } from "@/lib/auth-client";
import { useTasks } from "@/lib/task-context";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentTheme, openThemeModal } = useTheme();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Ambil data sesi pengguna dari Better Auth (dengan fallback langsung ke contextUser dari SSR)
  const { user: contextUser } = useTasks();
  const { data: session } = useSession();
  const currentUser = session?.user || contextUser;
  const displayName = currentUser?.name || "-";
  const displayEmail = currentUser?.email || "-";
  const avatarUrl = currentUser?.image;
  const joinedDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  async function handleLogout() {
    try {
      await signOut();
      toast.info("Anda telah keluar dari akun.");
    } catch (e) {
      console.error("Logout error", e);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <MotionContainer delay={0} className="rounded-2xl">
        <div className="border-b border-[var(--glass-border)] pb-5 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-sm">
              <GearSix weight="fill" className="w-4 h-4" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Pengaturan
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Informasi profil pengguna, detail spesifikasi aplikasi, dan manajemen sesi.
          </p>
        </div>
      </MotionContainer>

      {/* Card 1: Profil Pengguna */}
      <MotionContainer delay={1} className="rounded-2xl">
        <section className="glass-panel p-5 sm:p-6 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--glass-border)]">
            <User className="w-4 h-4 text-[var(--text-secondary)]" />
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">Profil Pengguna</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[var(--glass-border)] shrink-0 shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] border-2 border-[var(--glass-border)] flex items-center justify-center text-2xl font-bold text-[var(--text-primary)] shrink-0 shadow-inner">
                {(displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {displayName}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  {displayEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Bergabung sejak {joinedDate}
                </span>
              </div>
            </div>
          </div>
        </section>
      </MotionContainer>

      {/* Card 2: Tema & Tampilan */}
      <MotionContainer delay={2} className="rounded-2xl">
        <section className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Palette weight="fill" className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">Tema & Tampilan</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30">
              PRO
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentTheme?.name || "Dark Chocolate"}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
                  {currentTheme?.badge || "Espresso Obsidian"}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {currentTheme?.description || "Nuansa obsidian espresso hangat dengan pendaran orbs amber gold yang mewah."}
              </p>
              {currentTheme?.swatchColors && (
                <div className="flex items-center gap-1.5 pt-1">
                  {currentTheme.swatchColors.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={openThemeModal}
              className="shrink-0 w-full sm:w-auto"
            >
              <Palette weight="fill" className="w-4 h-4" />
              Ganti Tema
            </Button>
          </div>
        </section>
      </MotionContainer>

      {/* Card 3: Informasi Aplikasi */}
      <MotionContainer delay={3} className="rounded-2xl">
        <section className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--glass-border)]">
            <Info className="w-4 h-4 text-[var(--text-secondary)]" />
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">Informasi Aplikasi</h2>
          </div>

          <div className="divide-y divide-[var(--glass-border)] text-xs">
            <div className="py-3 flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Nama Aplikasi</span>
              <span className="font-semibold text-[var(--text-primary)]">MyTask</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Versi Aplikasi</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">v1.3.0</span>
            </div>
            <div className="py-3 flex items-start sm:items-center justify-between gap-4">
              <span className="text-[var(--text-secondary)] shrink-0">Catatan Rilis</span>
              <span className="font-medium text-[var(--text-primary)] text-right">
                Fitur Baru Catatan Materi (Notebook), Pembaruan Tema Celestial Sky &amp; Aurora
              </span>
            </div>
          </div>
        </section>
      </MotionContainer>

      {/* Card 4: Zona Bahaya & Logout */}
      <MotionContainer delay={4} className="rounded-2xl">
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border-l-4 border-l-[#E88B8B] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--glass-border)]">
            <ShieldAlert className="w-4 h-4 text-[#E88B8B]" />
            <h2 className="font-heading text-sm font-bold text-[#E88B8B]">Zona Bahaya</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Keluar dari Akun</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Mengakhiri sesi saat ini. Anda perlu masuk kembali untuk mengakses daftar tugas Anda.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Keluar Akun
            </Button>
          </div>
        </section>
      </MotionContainer>

      {/* Confirm Logout Dialog */}
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun MyTask saat ini?"
        confirmLabel="Ya, Keluar"
        isDanger={true}
      />
    </div>
  );
}
