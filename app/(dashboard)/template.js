"use client";

import { motion } from "framer-motion";
import { useDesktopMotion } from "@/lib/use-desktop-motion";

export default function DashboardTemplate({ children }) {
  const isDesktop = useDesktopMotion();

  if (!isDesktop) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
