'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Download, X, Share } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Jika aplikasi sudah berjalan dalam mode PWA Standalone (Homescreen), jangan tampilkan
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // 2. Cek apakah pengguna sudah menekan tombol "Nanti" dalam 3 hari terakhir
    const dismissedTime = localStorage.getItem('mytask_pwa_dismissed');
    if (dismissedTime) {
      const elapsed = Date.now() - Number(dismissedTime);
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (elapsed < threeDaysMs) {
        return;
      }
    }

    // 3. Deteksi iOS Safari (karena iOS tidak mendukung event beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Tampilkan banner ramah iOS setelah jeda 2 detik
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 4. Tangkap event resmi PWA Android / Chrome (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Berikan jeda sejenak agar pengguna sempat melihat dashboard terlebih dahulu
      setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem('mytask_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Gagal memicu install prompt PWA:', err);
    }
  }

  function handleDismiss() {
    setIsVisible(false);
    // Simpan timestamp penundaan selama 3 hari
    try {
      localStorage.setItem('mytask_pwa_dismissed', String(Date.now()));
    } catch (e) {}
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pwa-install-mini-banner"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-sm mx-auto sm:mx-0"
        >
          <div className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-[var(--theme-accent,#D97706)]/35 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-xl bg-[#120E0B]/90">
            {/* Ambient amber top accent stripe */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--theme-accent,#D97706)] to-transparent" />

            {/* Header Content */}
            <div className="flex items-start gap-3">
              {/* MyTask App Logo CheckSquare */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2A1B12] to-[#120B07] border border-[var(--theme-accent,#D97706)]/60 flex items-center justify-center shrink-0 shadow-md shadow-amber-950/40">
                <CheckSquare className="w-5 h-5 text-[var(--theme-accent,#D97706)] stroke-[2.5]" />
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-bold text-[#FAFAFA] tracking-tight">
                    Pasang MyTask di HP
                  </h3>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Tutup ajakan instalasi"
                    className="w-5 h-5 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                  Akses kilat dari layar utama seperti aplikasi native & bebas address bar browser.
                </p>

                {/* iOS Step-by-Step Instruction Popup */}
                {showIosGuide && (
                  <div className="mt-2.5 p-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-[11px] text-zinc-200 space-y-1">
                    <p className="font-semibold text-[var(--theme-accent,#D97706)]">
                      Langkah Pasang di iOS (Safari):
                    </p>
                    <p className="flex items-center gap-1.5">
                      1. Tekan tombol <Share className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <b>Share</b> di bawah Safari.
                    </p>
                    <p>
                      2. Gulir lalu pilih <b>"Add to Home Screen"</b> (Tambah ke Layar Utama).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--theme-accent,#D97706)] hover:brightness-110 text-[#0A0A0A] transition-all shadow-md shadow-amber-950/30 cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Install Aplikasi</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
