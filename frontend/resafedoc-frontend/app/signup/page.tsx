import AuthBackdrop from "@/components/auth/AuthBackdrop";
import AuthModal from "@/components/auth/AuthModal";

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <AuthBackdrop />
      <AuthModal initialMode="signup" />
    </div>
  );
}
