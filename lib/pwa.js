"use client";

// Utility Frontend PWA & Web Push Notification

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      return registration;
    } catch (error) {
      console.error("SW registration failed:", error);
      return null;
    }
  }
  return null;
}

export async function subscribeToPush() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    console.warn("Push notification tidak didukung pada browser ini.");
    return { success: false, reason: "unsupported" };
  }

  try {
    // 1. Pastikan Service Worker terdaftar terlebih dahulu
    await registerServiceWorker();

    // 2. Minta izin notifikasi browser
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: permission };
    }

    // 3. Dapatkan service worker yang siap
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY belum dikonfigurasi.");
      return { success: false, reason: "missing_vapid_key" };
    }

    // Cek apakah sudah ada subscription sebelumnya
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // 4. Kirim data subscription ke backend
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, reason: errData.error || "failed_to_save" };
    }

    return { success: true, subscription };
  } catch (error) {
    console.error("Gagal melakukan subscribe push notification:", error);
    return { success: false, reason: error.message };
  }
}

export async function sendTestPush() {
  try {
    const res = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return { ok: res.ok, ...data };
  } catch (error) {
    return { ok: false, error: "Gagal memanggil endpoint tes notifikasi." };
  }
}

// Helper function urlBase64ToUint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
