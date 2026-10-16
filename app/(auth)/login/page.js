'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("budi@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Silakan lengkapi email dan kata sandi Anda.");
      return;
    }

    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Berhasil masuk! Selamat datang kembali.");
      router.push("/dashboard");
    }, 400);
  }

  return (
    <div className="rounded-2xl glass-card p-6 sm:p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-bold text-[#FAFAFA]">Selamat Datang Kembali</h1>
        <p className="text-xs text-[#A1A1AA]">
          Masuk ke akun Anda untuk mengelola seluruh tugas harian.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <Input
          id="login-email"
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
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-all duration-200 backdrop-blur-sm"
              required
              autoComplete="current-password"
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

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border border-white/[0.16] bg-white/[0.04] text-[#FAFAFA] focus:ring-1 focus:ring-white/30 cursor-pointer accent-white"
            />
            <span className="text-xs text-[#A1A1AA]">Ingat saya</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={isLoading}
        >
          {isLoading ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      {/* Register Link */}
      <div className="text-center pt-2 border-t border-white/[0.08]">
        <p className="text-xs text-[#A1A1AA]">
          Belum memiliki akun?{" "}
          <Link
            href="/register"
            className="text-[#FAFAFA] font-semibold hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
