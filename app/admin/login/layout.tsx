// The login page renders without the admin chrome (no top nav).
// This layout overrides the parent /admin layout for /admin/login.
import "@/app/globals.css";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
