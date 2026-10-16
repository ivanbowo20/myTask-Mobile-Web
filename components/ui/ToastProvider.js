'use client';

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { subscribeToast, toast } from "@/lib/use-toast";
import DynamicIslandToast from "./DynamicIslandToast";

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToast({
      add: (newToast) => {
        setToasts((prev) => {
          // Hilangkan toast dengan id sama jika ada, lalu pertahankan maksimal 3 (yang lama hilang duluan)
          const filtered = prev.filter((t) => t.id !== newToast.id);
          return [newToast, ...filtered].slice(0, 3);
        });
      },
      dismiss: (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    });

    return unsubscribe;
  }, []);

  return (
    <aside
      aria-label="Notifikasi Sistem"
      aria-live="polite"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col-reverse items-center gap-2.5 w-[calc(100%-32px)] sm:w-auto max-w-[380px]"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((item) => (
          <DynamicIslandToast
            key={item.id}
            item={item}
            onDismiss={() => toast.dismiss(item.id)}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
}
