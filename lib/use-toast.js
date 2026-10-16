'use client';

import { useState, useEffect } from "react";

// In-memory subscriber registry for decoupled global toast calls
const listeners = new Set();
let toastCount = 0;

function createToast(type, title, options = {}) {
  const id = ++toastCount;
  const description =
    typeof options === "string"
      ? options
      : options && options.description
      ? options.description
      : undefined;

  const duration =
    typeof options === "object" && options.duration !== undefined
      ? options.duration
      : 4000;

  const toastItem = {
    id,
    type,
    title: String(title || ""),
    description,
    duration,
  };

  listeners.forEach((listener) => {
    if (typeof listener.add === "function") {
      listener.add(toastItem);
    }
  });

  return id;
}

export const toast = {
  success: (title, options) => createToast("success", title, options),
  error: (title, options) => createToast("error", title, options),
  warning: (title, options) => createToast("warning", title, options),
  info: (title, options) => createToast("info", title, options),
  dismiss: (id) => {
    listeners.forEach((listener) => {
      if (typeof listener.dismiss === "function") {
        listener.dismiss(id);
      }
    });
  },
};

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToast({
      add: (item) => setToasts((prev) => [item, ...prev].slice(0, 3)),
      dismiss: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    });
    return unsubscribe;
  }, []);

  return {
    toast,
    toasts,
    dismiss: toast.dismiss,
  };
}
