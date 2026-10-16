'use client';

import ToastProvider from "./ToastProvider";
import { toast, useToast } from "@/lib/use-toast";

export default function Toast() {
  return <ToastProvider />;
}

export { toast, useToast };
