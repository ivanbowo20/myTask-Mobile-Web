'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, AtSign, Lock, ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "@/lib/use-toast";

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

  function handleSubmit(e) {
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

    setTimeout(() => {
      setIsLoading(false);
      toast.success("Akun berhasil dibuat! Silakan masuk.");
      router.push("/login");
    }, 400);
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
          disabled={isLoading}
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
