"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-2xl font-semibold text-neutral-900">Check your email</h1>
        <p className="mt-3 text-neutral-600">
          We sent a sign-in link to {email}. It expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        Sign in to save your trips
      </h1>
      <p className="mt-3 text-neutral-600">
        Enter your email and we&apos;ll send you a link. No password needed.
      </p>

      <div className="mt-8 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && email.includes("@") && handleSubmit()}
          placeholder="you@example.com"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
        <button
          onClick={handleSubmit}
          disabled={!email.includes("@") || loading}
          className="w-full rounded-md bg-neutral-900 py-3 font-medium text-white disabled:opacity-40"
        >
          {loading ? "Sending…" : "Send me a link"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}