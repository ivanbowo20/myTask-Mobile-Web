'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, AtSign, Lock, ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/use-toast";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (err) {
      setError(err?.message || "Gagal mendaftar dengan Google. Silakan coba lagi.");
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nama.trim() || !email.trim() || !password) {
      setError("Semua kolom formulir wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal terdiri dari 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: nama,
        callbackURL: "/dashboard",
      });

      if (signUpError) {
        setError(signUpError.message || "Gagal membuat akun. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      toast.success("Akun berhasil dibuat! Selamat datang di TaskFlow.");
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat mendaftar.");
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl glass-card p-6 sm:p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-bold text-[#FAFAFA]">Buat Akun Baru</h1>
        <p className="text-xs text-[#A1A1AA]">
          Mulai atur dan selesaikan tugas-tugas penting Anda dengan efisien.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#E88B8B]/15 border border-[#E88B8B]/30 text-[#E88B8B] text-xs flex items-center gap-2.5 font-medium backdrop-blur-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-[#E88B8B]" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign-up Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isLoading}
        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.12] hover:border-white/[0.24] text-sm font-medium text-[#FAFAFA] flex items-center justify-center gap-3 transition-all duration-200 backdrop-blur-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span>{isGoogleLoading ? "Menghubungkan ke Google..." : "Daftar dengan Google"}</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/[0.08] w-full" />
        <span className="px-3 text-[11px] text-[#71717A] uppercase tracking-wider shrink-0 bg-transparent">
          atau isi formulir
        </span>
        <div className="border-t border-white/[0.08] w-full" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Lengkap */}
        <Input
          id="register-name"
          label="Nama Lengkap"
          type="text"
          placeholder="Contoh: Budi Santoso"
          icon={User}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          autoFocus
        />

        {/* Email */}
        <Input
          id="register-email"
          label="Alamat Email"
          type="email"
          placeholder="nama@email.com"
          icon={AtSign}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 backdrop-blur-sm"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#FAFAFA] min-h-[44px] min-w-[44px] justify-center transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-confirm"
            className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]"
          >
            Konfirmasi Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <input
              id="register-confirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Ulangi kata sandi"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 backdrop-blur-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Lihat konfirmasi kata sandi"}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#FAFAFA] min-h-[44px] min-w-[44px] justify-center transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? "Mendaftarkan..." : "Daftar Akun"}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center pt-2 border-t border-white/[0.08]">
        <p className="text-xs text-[#A1A1AA]">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="text-[#FAFAFA] font-semibold hover:underline"
          >
            Masuk sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
