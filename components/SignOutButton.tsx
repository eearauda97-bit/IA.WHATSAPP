// components/SignOutButton.tsx
"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-inkSecondary transition-colors hover:bg-surfaceMuted"
    >
      Sair
    </button>
  );
}