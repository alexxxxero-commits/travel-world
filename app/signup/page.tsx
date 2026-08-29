"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignUp() {
    if (!username.trim() || !email.trim() || !password) {
      setMessage("Please fill in everything.");
      return;
    }

    if (username.trim().length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ==========================================
      // CREATE AUTH USER
      // ==========================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,

        // Save username inside Auth metadata.
        // The database trigger will use this
        // to automatically create the profile.
        options: {
          data: {
            username: username.trim(),
          },
        },
      });

      if (authError) {
        console.error("SIGN UP ERROR:", authError);

        setMessage(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setMessage("Could not create account.");
        setLoading(false);
        return;
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      console.log("USER CREATED:", authData.user);

      setMessage(
        authData.session
          ? "Account created ✨"
          : "Account created ✨ Please check your email to confirm."
      );

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("UNEXPECTED SIGN UP ERROR:", error);

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
          Create account
        </h1>

        <p className="mt-4 text-white/50">
          Start building your world.
        </p>

        {/* Username */}

        <div className="mt-12">
          <label className="text-sm text-white/60">
            Username
          </label>

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="alex"
            autoComplete="username"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-white/30"
          />
        </div>

        {/* Email */}

        <div className="mt-6">
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
            placeholder="At least 6 characters"
            autoComplete="new-password"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20 focus:border-white/30"
          />
        </div>

        {/* Sign Up */}

        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
        >
          {loading
            ? "Creating account..."
            : "Sign Up"}
        </button>

        {/* Message */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}

        {/* Login */}

        <p className="mt-8 text-center text-sm text-white/40">
          Already have an account?{" "}

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="text-white transition hover:text-white/70"
          >
            Log in
          </button>
        </p>
      </div>
    </main>
  );
}