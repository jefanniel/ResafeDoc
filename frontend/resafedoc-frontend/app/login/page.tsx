import AuthBackdrop from "@/components/auth/AuthBackdrop";
import AuthModal from "@/components/auth/AuthModal";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <AuthBackdrop />
      <AuthModal initialMode="login" />
    </div>
  );
}
