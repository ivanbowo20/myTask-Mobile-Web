'use client';

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const TOAST_VARIANTS = {
  success: {
    borderColor: "border-l-[#8FB88F]",
    icon: CheckCircle2,
    iconColor: "text-[#8FB88F]",
  },
  error: {
    borderColor: "border-l-[#E88B8B]",
    icon: AlertCircle,
    iconColor: "text-[#E88B8B]",
  },
  warning: {
    borderColor: "border-l-[#D4A574]",
    icon: AlertTriangle,
    iconColor: "text-[#D4A574]",
  },
  info: {
    borderColor: "border-l-[#FAFAFA]",
    icon: Info,
    iconColor: "text-[#FAFAFA]",
  },
};

export default function DynamicIslandToast({ item, onDismiss }) {
  const variant = TOAST_VARIANTS[item.type] || TOAST_VARIANTS.info;
  const IconComponent = variant.icon;

  // Auto-dismiss countdown (default 4 detik / 4000ms)
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, item.duration);

    return () => clearTimeout(timer);
  }, [item.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      whileHover={{ scale: 1.02 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.5, bottom: 0.5 }}
      onDragEnd={(_, info) => {
        // Swipe/drag untuk dismiss manual
        if (Math.abs(info.offset.y) > 25 || Math.abs(info.velocity.y) > 200) {
          onDismiss();
        }
      }}
      className={`pointer-events-auto cursor-grab active:cursor-grabbing w-full max-w-[380px] min-w-[280px] rounded-2xl dynamic-island-toast px-3.5 py-3 flex items-center gap-3 select-none transition-all duration-200`}
    >
      {/* Icon: Masuk dengan delay 20ms */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.02, duration: 0.2 }}
        className="shrink-0 flex items-center justify-center"
      >
        <IconComponent className={`w-5 h-5 ${variant.iconColor}`} />
      </motion.div>

      {/* Konten Text: Masuk dengan stagger delay 50ms */}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.2 }}
        className="flex-1 min-w-0"
      >
        <p className="text-sm font-semibold text-[#FAFAFA] leading-tight truncate">
          {item.title}
        </p>
        {item.description ? (
          <p className="text-xs text-[#A1A1AA] leading-normal line-clamp-2 mt-0.5">
            {item.description}
          </p>
        ) : null}
      </motion.div>

      {/* Tombol Tutup: Tap target min 44x44px */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="shrink-0 min-w-[44px] min-h-[44px] -my-2 -mr-1 flex items-center justify-center rounded-xl text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
