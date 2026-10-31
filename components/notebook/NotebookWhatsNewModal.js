'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  Star,
  Zap,
  Copy,
  X,
  ArrowRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import SpecularButton from '@/components/ui/SpecularButton';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';

const WHATS_NEW_KEY_PREFIX = 'mytask_whatsnew_v1_3_';

const FEATURES = [
  {
    icon: Sparkles,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 [html[data-theme="celestial-sky"]_&]:text-amber-700 [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:border-amber-300',
    title: 'Format Teks Visual Kaya',
    desc: 'Tulis catatan dengan bold, italic, heading, daftar poin, dan quote langsung tanpa pusing kode Markdown.',
  },
  {
    icon: Star,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:border-amber-300',
    title: 'Pin Catatan & Filter Cepat',
    desc: 'Sematkan materi kuliah atau referensi penting ke urutan teratas, filter menurut hari, minggu, atau bulan.',
  },
  {
    icon: Zap,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20 [html[data-theme="celestial-sky"]_&]:text-sky-700 [html[data-theme="celestial-sky"]_&]:bg-sky-100 [html[data-theme="celestial-sky"]_&]:border-sky-300',
    title: 'Auto-Save & Offline Cache',
    desc: 'Draf tulisan tersimpan otomatis setiap Anda mengetik. Tak perlu takut kehilangan materi saat koneksi terputus.',
  },
  {
    icon: Copy,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 [html[data-theme="celestial-sky"]_&]:text-emerald-700 [html[data-theme="celestial-sky"]_&]:bg-emerald-100 [html[data-theme="celestial-sky"]_&]:border-emerald-300',
    title: 'Salin Siap Kirim ke Chat',
    desc: 'Satu klik salin otomatis mengonversi catatan ke format WhatsApp (*tebal*, _miring_) untuk dibagikan ke teman.',
  },
];

export default function NotebookWhatsNewModal() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id || 'guest';

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user has already seen this announcement
    const storageKey = `${WHATS_NEW_KEY_PREFIX}${userId}`;
    const hasSeen = localStorage.getItem(storageKey);

    if (!hasSeen) {
      // Delay slightly for smooth initial rendering
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${WHATS_NEW_KEY_PREFIX}${userId}`, 'true');
    }
    setIsOpen(false);
  }

  function handleTryNow() {
    handleDismiss();
    router.push('/notebook');
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-black/60 [html[data-theme='celestial-sky']_&]:bg-slate-900/40 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window Container (Apple Glass & High Contrast Anti-Washout) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={cn(
            'relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl z-10 overflow-hidden',
            // Dark & Default Themes
            'bg-[#121217]/95 border border-white/[0.12] text-zinc-100',
            // Light Theme: Celestial Sky (Pemberian kontras tegas anti-washout)
            '[html[data-theme="celestial-sky"]_&]:bg-white/95 [html[data-theme="celestial-sky"]_&]:border-sky-200/90 [html[data-theme="celestial-sky"]_&]:text-[#0F172A] [html[data-theme="celestial-sky"]_&]:shadow-2xl'
          )}
        >
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-amber-500/10 [html[data-theme='celestial-sky']_&]:bg-amber-400/20 blur-3xl pointer-events-none" />

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup Pengumuman"
            className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Badge & Title */}
          <div className="space-y-3 mb-6 pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 [html[data-theme='celestial-sky']_&]:bg-amber-500/20 [html[data-theme='celestial-sky']_&]:border-amber-400/50 [html[data-theme='celestial-sky']_&]:text-amber-800 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Update v1.3.0 Baru</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A]">
              Kini Hadir: Catatan Materi
            </h2>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-300 [html[data-theme='celestial-sky']_&]:text-[#334155] [html[data-theme='celestial-sky']_&]:font-medium">
              Simpan rangkuman kuliah, referensi belajar, dan ide tugas Anda di satu tempat yang aman, terstruktur, dan elegan.
            </p>
          </div>

          {/* Feature Grid List */}
          <div className="space-y-3 mb-7">
            {FEATURES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-3.5 p-3 rounded-2xl transition-colors',
                    'bg-white/[0.03] border border-white/[0.06]',
                    '[html[data-theme="celestial-sky"]_&]:bg-sky-50/70 [html[data-theme="celestial-sky"]_&]:border-sky-200/70'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-xl border shrink-0 mt-0.5 shadow-sm',
                      item.color
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A]">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-400 [html[data-theme='celestial-sky']_&]:text-[#475569] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-slate-200/80">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="w-full sm:w-auto text-xs font-semibold text-zinc-400 hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-600 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 cursor-pointer"
            >
              Nanti Saja
            </Button>
            <SpecularButton
              onClick={handleTryNow}
              className="w-full sm:w-auto cursor-pointer"
            >
              <span>Buka Catatan Materi</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
            </SpecularButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
