'use client';

import { createAuthClient } from "better-auth/react";
import { purgeUserData } from "./local/db.js";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
});

export const { signIn, signUp, useSession } = authClient;

/**
 * Wrapper signOut yang membersihkan basis data lokal Dexie dan cache Service Worker
 * untuk mencegah kebocoran data multi-tenant saat pergantian akun.
 *
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function signOut(options = {}) {
  try {
    if (typeof window !== "undefined") {
      // 1. Bersihkan cache Service Worker
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "MYTASK_PURGE_CACHES" });
      }

      // 2. Bersihkan snapshot session dan data Dexie
      try {
        const rawSession = localStorage.getItem("better-auth.session_data");
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed?.user?.id) {
            await purgeUserData(parsed.user.id);
          }
        }
      } catch (e) {
        console.warn("[offline-auth] Gagal membersihkan data lokal saat signOut:", e);
      }
    }
  } catch (err) {
    console.warn("[offline-auth] Error pra-logout:", err);
  }

  return await authClient.signOut(options);
}

export default authClient;
