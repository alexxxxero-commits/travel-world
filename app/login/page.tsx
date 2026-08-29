"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setMessage("Please fill in everything.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ==========================================
      // LOGIN
      // ==========================================

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("LOGIN ERROR:", error);

        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setMessage("Could not log in.");
        setLoading(false);
        return;
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      console.log("LOGGED IN USER:", data.user);

      setMessage("Welcome back ✨");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 700);

    } catch (error) {
      console.error("UNEXPECTED LOGIN ERROR:", error);

      setMessage(
        "Something went wrong. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-md">

        {/* Header */}

        <p className="text-sm uppercase tracking-[0.4em] text-white/40">
          The World Of Mine
        </p>

        <h1 className="mt-4 text-5xl font-light">
          Welcome back
        </h1>

        <p className="mt-4 text-white/50">
          Enter your world again.
        </p>

        {/* Email */}

        <div className="mt-12">
          <label className="text-sm text-white/60">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-white/30"
          />
        </div>

        {/* Password */}

        <div className="mt-6">
          <label className="text-sm text-white/60">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Your password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-white/30"
          />
        </div>

        {/* Login */}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
        >
          {loading
            ? "Logging in..."
            : "Log in"}
        </button>

        {/* Message */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}

        {/* Sign Up */}

        <p className="mt-8 text-center text-sm text-white/40">
          Don't have an account?{" "}

          <button
            type="button"
            onClick={() =>
              router.push("/signup")
            }
            className="text-white transition hover:text-white/70"
          >
            Sign up
          </button>
        </p>

      </div>
    </main>
  );
}