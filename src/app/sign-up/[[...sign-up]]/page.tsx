import Link from "next/link";

// Clerk muted for local dev — auth pages are disabled.
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-2">Auth disabled</h1>
        <p className="text-foreground/60 mb-6">
          Clerk is muted in this dev build. Head to the dashboard to test synop.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-[13px] font-bold rounded-full px-6 h-10 leading-10 bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
