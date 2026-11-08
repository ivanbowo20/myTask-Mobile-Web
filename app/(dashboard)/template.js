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
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
