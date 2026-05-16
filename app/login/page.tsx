"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    setMessage("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#252b2e] p-6 text-[#f7f4ec]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <div className="rounded-3xl bg-[#f7f4ec] p-8 text-[#252b2e] shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="font-serif text-4xl">Valor Login</h1>
            <p className="mt-2 text-sm text-[#394146]">
              Sign in to edit inspection reports.
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-xl border border-black/10 bg-white p-3 text-sm">
              {message}
            </div>
          )}

          <div className="grid gap-4">
            <input
              className="rounded-xl border p-3"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={login}
              className="rounded-full bg-[#252b2e] px-6 py-3 font-semibold text-[#f7f4ec]"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}