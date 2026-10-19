'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
  X,
  Send,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/use-toast";
import {
  getNotificationPermission,
  subscribeToPush,
  sendTestPush,
} from "@/lib/pwa";

export default function NotificationBanner({ dismissible = false, className = "" }) {
  const [isMounted, setIsMounted] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 1. Cek status permission browser
    setPermission(getNotificationPermission());

    // 2. Baca status tersimpan di client-side (Hanya jika dismissible = true)
    if (dismissible && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mytask_notif_tested_or_dismissed");
        if (stored === "true") {
          setIsDismissed(true);
        }
      } catch (e) {
        console.error("Gagal membaca status notifikasi dari localStorage:", e);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [dismissible]);

  async function handleEnableNotification() {
    setIsSubscribing(true);
    try {
      const res = await subscribeToPush();
      const newPerm = getNotificationPermission();
      setPermission(newPerm);

      if (res?.success) {
        toast.success("Notifikasi berhasil diaktifkan! Pengingat tenggat waktu siap dikirim.");
      } else if (newPerm === "denied") {
        toast.error("Izin notifikasi ditolak. Anda dapat membukanya kembali lewat setelan browser.");
      } else if (res?.reason === "missing_vapid_key") {
        toast.error("Kunci VAPID belum dikonfigurasi di server.");
      } else {
        toast.info("Status perizinan belum selesai.");
      }
    } catch (err) {
      console.error("Gagal mengaktifkan notifikasi:", err);
      toast.error("Terjadi kendala saat mengaktifkan notifikasi.");
    } finally {
      setIsSubscribing(false);
    }
  }

  async function handleSendTest() {
    setIsTesting(true);
    try {
      const res = await sendTestPush();
      if (res?.ok) {
        setTestSuccess(true);
        toast.success("Notifikasi tes berhasil dikirim! Periksa layar perangkat Anda.");

        if (dismissible) {
          // Tunggu 3 detik, lalu auto-dismiss dan simpan status ke localStorage
          timerRef.current = setTimeout(() => {
            setIsDismissed(true);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("mytask_notif_tested_or_dismissed", "true");
              } catch (e) {
                console.error("Gagal menyimpan status ke localStorage:", e);
              }
            }
          }, 3000);
        } else {
          // Untuk halaman /notifikasi (dismissible: false), kembalikan tombol setelah 3.5 detik
          timerRef.current = setTimeout(() => {
            setTestSuccess(false);
          }, 3500);
        }
      } else {
        toast.error(res?.error || "Gagal mengirim tes notifikasi.");
      }
    } catch (err) {
      console.error("Gagal mengirim tes notifikasi:", err);
      toast.error("Terjadi kendala saat memicu notifikasi tes.");
    } finally {
      setIsTesting(false);
    }
  }

  function handleDismiss() {
    if (!dismissible) return;
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mytask_notif_tested_or_dismissed", "true");
      } catch (e) {
        console.error("Gagal menyimpan status ke localStorage:", e);
      }
    }
  }

  if (!isMounted) {
    return null; // Jangan render apapun saat SSR
  }

  if (permission === "unsupported") {
    return null;
  }

  function renderContent() {
    // 1. STATE: AKTIF (GRANTED) - Tampilan Ringkas & Elegan
    if (permission === "granted") {
      return (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#8FB88F]/10 border border-[#8FB88F]/25 text-[#FAFAFA] ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#8FB88F]/20 text-[#8FB88F] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#8FB88F]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#FAFAFA] flex items-center gap-1.5">
                <span>Pengingat Tugas Aktif</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#8FB88F] animate-pulse" />
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-300 truncate">
                Perangkat ini siap menerima notifikasi saat tugas mendekati deadline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting || testSuccess}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8FB88F] cursor-pointer disabled:cursor-default ${
                testSuccess
                  ? "bg-[#8FB88F]/25 border border-[#8FB88F]/50 text-[#8FB88F]"
                  : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[#FAFAFA]"
              }`}
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : testSuccess ? (
                <Check className="w-3.5 h-3.5 text-[#8FB88F]" />
              ) : (
                <Send className="w-3.5 h-3.5 text-[#8FB88F]" />
              )}
              <span>
                {isTesting
                  ? "Mengirim..."
                  : testSuccess
                  ? "✓ Tes Berhasil!"
                  : "Kirim Tes Notifikasi"}
              </span>
            </button>

            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Tutup notifikasi"
                className="text-zinc-400 hover:text-[#FAFAFA] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // 2. STATE: DIBLOKIR (DENIED) - Arahan Buka Kunci
    if (permission === "denied") {
      return (
        <div
          className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#E88B8B]/10 border border-[#E88B8B]/25 text-[#FAFAFA] space-y-3 ${className}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E88B8B]/20 text-[#E88B8B] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[#E88B8B]">
                  Izin Notifikasi Diblokir di Browser
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Browser saat ini memblokir pemberitahuan. Anda tidak akan menerima pengingat deadline sebelum izin diaktifkan kembali.
                </p>
              </div>
            </div>

            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Tutup pemberitahuan"
                className="text-zinc-400 hover:text-[#FAFAFA] p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] text-[11px] sm:text-xs text-zinc-300 space-y-1.5">
            <p className="font-semibold text-[#FAFAFA] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              Cara Membuka Kunci Notifikasi:
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-zinc-300">
              <li>Klik ikon <strong>Gembok / Setelan Situs</strong> di sebelah kiri alamat URL (address bar browser).</li>
              <li>Cari menu <strong>Notifikasi</strong> lalu ubah dari &quot;Blokir&quot; menjadi <strong>&quot;Izinkan&quot;</strong>.</li>
              <li>Muat ulang (refresh) halaman ini untuk menerapkan perubahan.</li>
            </ul>
          </div>
        </div>
      );
    }

    // 3. STATE: DEFAULT / PROMPT - Ajakan Mengaktifkan
    return (
      <div
        className={`relative p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-3.5 ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 text-[var(--theme-accent,#D97706)] flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#FAFAFA] tracking-tight">
                Aktifkan Pengingat Tenggat Waktu
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                Jangan lewatkan tugas penting. Nyalakan notifikasi browser untuk menerima alarm otomatis saat jadwal mendekati batas waktu.
              </p>
            </div>
          </div>

          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Tutup sementara"
              className="text-zinc-400 hover:text-[#FAFAFA] p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons & Guide Toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
          <Button
            variant="primary"
            onClick={handleEnableNotification}
            disabled={isSubscribing}
            className="text-xs py-2 px-3.5 gap-1.5"
          >
            {isSubscribing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>{isSubscribing ? "Menghubungkan..." : "Nyalakan Notifikasi"}</span>
          </Button>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-[#FAFAFA] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Panduan HP &amp; Laptop</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showGuide ? "rotate-180" : ""}`} />
          </button>

          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-zinc-400 hover:text-zinc-300 ml-auto px-2 py-1 cursor-pointer"
            >
              Nanti Saja
            </button>
          )}
        </div>

        {/* Collapsible Guide Accordion */}
        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 animate-in fade-in duration-150 text-[11px] sm:text-xs">
            {/* Laptop Guide */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <p className="font-semibold text-[#FAFAFA] flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                Untuk Laptop / PC (Chrome, Edge, Firefox):
              </p>
              <p className="text-zinc-400 leading-normal">
                Klik tombol &quot;Nyalakan Notifikasi&quot; di atas, lalu saat popup browser muncul di kiri atas, klik <strong>&quot;Izinkan&quot; (Allow)</strong>.
              </p>
            </div>

            {/* Mobile Guide */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <p className="font-semibold text-[#FAFAFA] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                Untuk HP (Android &amp; iPhone):
              </p>
              <p className="text-zinc-400 leading-normal">
                <strong>Android:</strong> Klik &quot;Nyalakan Notifikasi&quot; lalu tekan Izinkan. <br />
                <strong>iPhone (iOS):</strong> Tekan tombol Share Safari &gt; <em>&quot;Add to Home Screen&quot;</em>, buka aplikasi dari layar utama, lalu aktifkan notifikasi.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {!(dismissible && isDismissed) && (
        <motion.div
          key="notification-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            height: 0,
            y: -16,
            transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
          }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden"
        >
          {renderContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
