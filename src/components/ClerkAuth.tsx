"use client";

import { useUser, UserButton, SignInButton } from '@clerk/nextjs';

/**
 * Rendered only when Clerk is configured. Shows sign-in (signed out) or the
 * user menu (signed in).
 */
export default function ClerkAuth() {
  const { isSignedIn } = useUser();
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="modal">
      <button className="text-[13px] font-bold text-foreground border border-foreground/15 px-4 py-2 rounded-full hover:bg-foreground/5 transition-colors">
        Sign in
      </button>
    </SignInButton>
  );
}
