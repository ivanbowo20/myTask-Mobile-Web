'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  UserPlus,
  LogIn,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/use-toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * SSR-safe, zero-hydration-mismatch mobile viewport hook (< 640px)
 */
function subscribeMobile(callback) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

function getServerSnapshot() {
  return false;
}

// Social SVG Icon (Google only)
function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function AuthSlider({ initialMode = "login" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const isRegister = mode === "register";

  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);
  const shouldReduceMotion = useReducedMotion();

  // Login form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form states
  const [nama, setNama] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Shared social auth state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Switch mode with shallow URL and document title synchronization
  const switchMode = useCallback(
    (targetMode) => {
      if (mode === targetMode) return;
      setMode(targetMode);
      setLoginError("");
      setRegisterError("");

      if (typeof window !== "undefined") {
        const targetPath = targetMode === "register" ? "/register" : "/login";
        if (window.location.pathname !== targetPath) {
          window.history.replaceState(null, "", targetPath);
        }
      }

      if (typeof document !== "undefined") {
        document.title =
          targetMode === "register" ? "Daftar Akun — MyTask" : "Masuk — MyTask";
      }
    },
    [mode]
  );

  // Sync mode with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.includes("/register")) {
          setMode("register");
          if (typeof document !== "undefined") {
            document.title = "Daftar Akun — MyTask";
          }
        } else if (path.includes("/login")) {
          setMode("login");
          if (typeof document !== "undefined") {
            document.title = "Masuk — MyTask";
          }
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync with initialMode prop updates
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Check query parameter error on client mount (e.g. auth_callback_failed)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryError = params.get("error");
      if (queryError === "auth_callback_failed") {
        setLoginError("Proses verifikasi masuk dibatalkan atau gagal. Silakan coba kembali.");
      }
    }
  }, []);

  // Google Social Sign-in
  async function handleGoogleSignIn() {
    setLoginError("");
    setRegisterError("");
    setIsGoogleLoading(true);

    // 15-second safety watchdog to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setIsGoogleLoading(false);
      setLoginError("Koneksi ke Google membutuhkan waktu terlalu lama. Silakan periksa jaringan dan coba lagi.");
    }, 15000);

    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      clearTimeout(timeoutId);

      if (res?.error) {
        const msg = res.error.message || "Gagal menghubungkan ke Google. Silakan coba lagi.";
        setLoginError(msg);
        setRegisterError(msg);
        setIsGoogleLoading(false);
        return;
      }

      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err?.message || "Gagal menghubungkan ke Google. Silakan coba lagi.";
      setLoginError(msg);
      setRegisterError(msg);
      setIsGoogleLoading(false);
    }
  }

  // Handle Login submission
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Silakan lengkapi email dan kata sandi Anda.");
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email: loginEmail.trim(),
        password: loginPassword,
        rememberMe,
        callbackURL: "/dashboard",
      });

      if (signInError) {
        setLoginError(signInError.message || "Email atau kata sandi tidak cocok.");
        setLoginLoading(false);
        return;
      }

      toast.success("Berhasil masuk! Selamat datang kembali.");
      router.push("/dashboard");
    } catch (err) {
      setLoginError(err?.message || "Terjadi kendala koneksi saat masuk.");
      setLoginLoading(false);
    }
  }

  // Handle Register submission
  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setRegisterError("");

    if (!nama.trim() || !registerEmail.trim() || !registerPassword) {
      setRegisterError("Semua kolom formulir wajib diisi.");
      return;
    }

    if (registerPassword.length < 8) {
      setRegisterError("Kata sandi minimal terdiri dari 8 karakter.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setRegisterError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setRegisterLoading(true);

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        email: registerEmail.trim(),
        password: registerPassword,
        name: nama.trim(),
        callbackURL: "/dashboard",
      });

      if (signUpError) {
        setRegisterError(signUpError.message || "Gagal membuat akun. Silakan coba lagi.");
        setRegisterLoading(false);
        return;
      }

      toast.success("Akun berhasil dibuat! Selamat datang di MyTask.");
      router.push("/dashboard");
    } catch (err) {
      setRegisterError(err?.message || "Terjadi kesalahan saat mendaftar.");
      setRegisterLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md sm:max-w-4xl mx-auto p-1.5 sm:p-2 rounded-[2rem] bg-white/[0.03] border border-white/[0.08] shadow-2xl backdrop-blur-xl auth-card-outer">
      <div className="relative rounded-[calc(2rem-0.5rem)] bg-[var(--glass-bg,rgba(22,17,14,0.65))] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] overflow-hidden auth-card-inner">
        {/* Mobile Segmented Switcher Capsule (< 640px) */}
        <div className="sm:hidden p-4 pb-0">
          <div className="relative p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md flex items-center">
            <motion.div
              className="absolute top-1 bottom-1 rounded-xl bg-white/[0.12] border border-white/[0.18] shadow-sm pointer-events-none"
              initial={false}
              animate={{
                left: isRegister ? "calc(50% + 2px)" : "4px",
                width: "calc(50% - 6px)",
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 350, damping: 30 }
              }
            />
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-xs font-semibold rounded-xl text-center transition-colors min-h-[44px] flex items-center justify-center cursor-pointer",
                !isRegister ? "text-[#FAFAFA]" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={cn(
                "flex-1 relative z-10 py-2.5 text-xs font-semibold rounded-xl text-center transition-colors min-h-[44px] flex items-center justify-center cursor-pointer",
                isRegister ? "text-[#FAFAFA]" : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Daftar
            </button>
          </div>
        </div>

        {/* Form Container: Dual-column grid on desktop, horizontal sliding track with Framer Motion on mobile */}
        <motion.div
          className="relative flex w-[200%] sm:w-full sm:grid sm:grid-cols-2 min-h-[580px] sm:min-h-[640px]"
          animate={{ x: isMobile ? (isRegister ? "-50%" : "0%") : "0%" }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 30 }
          }
        >
          {/* ========================================================= */}
          {/* LEFT COLUMN: LOGIN FORM                                  */}
          {/* ========================================================= */}
          <div
            className={cn(
              "w-1/2 sm:w-full p-5 sm:p-10 flex flex-col justify-center transition-opacity duration-300",
              isRegister
                ? "sm:opacity-0 sm:pointer-events-none select-none"
                : "sm:opacity-100 sm:pointer-events-auto"
            )}
            inert={isRegister ? true : undefined}
            aria-hidden={isRegister}
          >
            <div className="space-y-6 max-w-sm mx-auto w-full">
              {/* Header */}
              <div className="space-y-1.5 text-center">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                  Selamat Datang Kembali
                </h1>
                <p className="text-xs text-[#A1A1AA]">
                  Masuk ke akun Anda untuk mengelola seluruh tugas harian.
                </p>
              </div>

              {/* Login Error Alert */}
              {loginError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#E88B8B]/15 border border-[#E88B8B]/30 text-[#E88B8B] text-xs flex items-center gap-2.5 font-medium backdrop-blur-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E88B8B]" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Social Logins */}
              <div className="space-y-2.5">
                {/* Primary Google Auth Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || loginLoading}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-xs sm:text-sm font-medium text-[#FAFAFA] flex items-center justify-center gap-3 transition-all duration-200 backdrop-blur-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-300 shrink-0" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {isGoogleLoading ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/[0.08] auth-divider-line w-full" />
                <span className="px-3 text-[11px] text-[#71717A] uppercase tracking-wider shrink-0 bg-transparent">
                  atau dengan email
                </span>
                <div className="border-t border-white/[0.08] auth-divider-line w-full" />
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Alamat Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 min-h-[44px] min-w-[44px] justify-center transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border border-white/[0.16] [html[data-theme='celestial-sky']_&]:border-sky-300 [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:accent-[#0284C7] bg-white/[0.04] text-[#FAFAFA] focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] cursor-pointer accent-white"
                    />
                    <span className="text-xs text-[#A1A1AA]">Ingat saya</span>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 auth-submit-btn"
                  disabled={loginLoading || isGoogleLoading}
                >
                  {loginLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Memproses...</span>
                    </span>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>

              {/* Mobile Switch Link */}
              <div className="text-center pt-2 border-t border-white/[0.08] sm:hidden">
                <p className="text-xs text-[#A1A1AA]">
                  Belum memiliki akun?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-[#FAFAFA] font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                  >
                    Daftar sekarang
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: REGISTER FORM                               */}
          {/* ========================================================= */}
          <div
            className={cn(
              "w-1/2 sm:w-full p-5 sm:p-10 flex flex-col justify-center transition-opacity duration-300",
              !isRegister
                ? "sm:opacity-0 sm:pointer-events-none select-none"
                : "sm:opacity-100 sm:pointer-events-auto"
            )}
            inert={!isRegister ? true : undefined}
            aria-hidden={!isRegister}
          >
            <div className="space-y-5 max-w-sm mx-auto w-full">
              {/* Header */}
              <div className="space-y-1.5 text-center">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                  Buat Akun Baru
                </h1>
                <p className="text-xs text-[#A1A1AA]">
                  Mulai atur dan selesaikan tugas-tugas penting dengan efisien.
                </p>
              </div>

              {/* Register Error Alert */}
              {registerError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-[#E88B8B]/15 border border-[#E88B8B]/30 text-[#E88B8B] text-xs flex items-center gap-2.5 font-medium backdrop-blur-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E88B8B]" />
                  <span>{registerError}</span>
                </div>
              )}

              {/* Social Logins */}
              <div className="space-y-2.5">
                {/* Primary Google Auth Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || registerLoading}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.22] text-xs sm:text-sm font-medium text-[#FAFAFA] flex items-center justify-center gap-3 transition-all duration-200 backdrop-blur-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-300 shrink-0" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {isGoogleLoading ? "Menghubungkan ke Google..." : "Daftar dengan Google"}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/[0.08] auth-divider-line w-full" />
                <span className="px-3 text-[11px] text-[#71717A] uppercase tracking-wider shrink-0 bg-transparent">
                  atau isi formulir
                </span>
                <div className="border-t border-white/[0.08] auth-divider-line w-full" />
              </div>

              {/* Register Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Nama Lengkap */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="register-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="register-name"
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="register-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Alamat Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      id="register-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="register-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      aria-label={showRegisterPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 min-h-[44px] min-w-[44px] justify-center transition-colors cursor-pointer"
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="w-full space-y-1.5">
                  <label
                    htmlFor="register-confirm"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Konfirmasi Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="register-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi kata sandi"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))] text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 auth-input-field"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Lihat konfirmasi kata sandi"}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 min-h-[44px] min-w-[44px] justify-center transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 auth-submit-btn"
                  disabled={registerLoading || isGoogleLoading}
                >
                  {registerLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Mendaftarkan...</span>
                    </span>
                  ) : (
                    "Daftar Akun"
                  )}
                </Button>
              </form>

              {/* Mobile Switch Link */}
              <div className="text-center pt-2 border-t border-white/[0.08] sm:hidden">
                <p className="text-xs text-[#A1A1AA]">
                  Sudah memiliki akun?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-[#FAFAFA] font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                  >
                    Masuk sekarang
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP SLIDING OVERLAY (>= 640px)                       */}
          {/* ========================================================= */}
          <motion.div
            className="hidden sm:flex absolute inset-y-0 w-1/2 z-20 flex-col items-center justify-center p-8 lg:p-12 text-center overflow-hidden bg-[var(--theme-nav-bg,rgba(16,12,10,0.94))] backdrop-blur-2xl border-x border-white/[0.12] shadow-[0_0_60px_rgba(0,0,0,0.7)]"
            style={{ left: 0 }}
            animate={{ x: isRegister ? "0%" : "100%" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 30, mass: 0.9 }
            }
          >
            {/* Luminous dynamic theme ambient orbs inside the overlay */}
            <div
              className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-35 transition-colors duration-500"
              style={{
                background:
                  "radial-gradient(circle, var(--theme-accent, #D97706) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-25 transition-colors duration-500"
              style={{
                background:
                  "radial-gradient(circle, var(--theme-accent-hover, #B45309) 0%, transparent 70%)",
              }}
            />

            {/* Directional Hero Content Animation */}
            <AnimatePresence mode="wait" initial={false}>
              {isRegister ? (
                <motion.div
                  key="hero-login"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm"
                >
                  {/* MyTask Brand Badge with Sidebar Icon */}
                  <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md mb-6 shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center font-bold shadow-xs">
                      <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="font-heading text-xs font-bold text-[#FAFAFA] tracking-tight">
                      MyTask
                    </span>
                  </div>

                  {/* Title (2-Line Iron Rule) */}
                  <h2 className="font-heading text-2xl lg:text-3xl font-bold text-[#FAFAFA] tracking-tight leading-snug">
                    Kembali ke Ruang Kerja
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-3 mb-8 max-w-xs">
                    Sudah memiliki akun terdaftar? Masuk kembali ke ruang kerja MyTask Anda dan lanjutkan ritme produktivitas terbaik hari ini.
                  </p>

                  {/* Island CTA Button */}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="group relative inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[#FAFAFA] text-[#0A0A0A] font-semibold text-sm transition-all duration-200 hover:bg-[#E4E4E7] active:scale-[0.98] shadow-lg shadow-black/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>Masuk Sekarang</span>
                    <span className="w-8 h-8 rounded-full bg-black/10 inline-flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-black/15">
                      <LogIn className="w-4 h-4 text-[#0A0A0A]" />
                    </span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-register"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm"
                >
                  {/* MyTask Brand Badge with Sidebar Icon */}
                  <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md mb-6 shadow-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center font-bold shadow-xs">
                      <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="font-heading text-xs font-bold text-[#FAFAFA] tracking-tight">
                      MyTask
                    </span>
                  </div>

                  {/* Title (2-Line Iron Rule) */}
                  <h2 className="font-heading text-2xl lg:text-3xl font-bold text-[#FAFAFA] tracking-tight leading-snug">
                    Mulai Perjalanan Fokus Anda
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mt-3 mb-8 max-w-xs">
                    Belum memiliki akun? Bergabunglah dengan ruang kerja MyTask untuk menata, memprioritaskan, dan menuntaskan setiap target hidup Anda.
                  </p>

                  {/* Island CTA Button */}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="group relative inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[#FAFAFA] text-[#0A0A0A] font-semibold text-sm transition-all duration-200 hover:bg-[#E4E4E7] active:scale-[0.98] shadow-lg shadow-black/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>Daftar Akun</span>
                    <span className="w-8 h-8 rounded-full bg-black/10 inline-flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-black/15">
                      <UserPlus className="w-4 h-4 text-[#0A0A0A]" />
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
