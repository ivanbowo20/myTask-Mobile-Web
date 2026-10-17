import AuthSlider from "@/components/auth/AuthSlider";

export const metadata = {
  title: "Masuk — MyTask",
  description: "Masuk ke akun MyTask Anda untuk mengelola seluruh tugas harian.",
};

export default function LoginPage() {
  return <AuthSlider initialMode="login" />;
}
