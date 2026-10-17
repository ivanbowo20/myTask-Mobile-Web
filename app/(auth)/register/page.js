import AuthSlider from "@/components/auth/AuthSlider";

export const metadata = {
  title: "Daftar Akun — MyTask",
  description: "Daftar akun baru di MyTask untuk mengelola tugas dan meningkatkan produktivitas harian.",
};

export default function RegisterPage() {
  return <AuthSlider initialMode="register" />;
}
