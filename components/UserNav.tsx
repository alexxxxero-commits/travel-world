"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserNav() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUsername(null);
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error,
      } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(
          "PROFILE LOAD ERROR:",
          error
        );

        setUsername(null);
      } else {
        setUsername(
          profile?.username ?? null
        );
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      () => {
        loadUser();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();

    setUsername(null);

    router.refresh();
    router.push("/");
  }

  if (loading) {
    return null;
  }

  return (
    <div className="absolute right-6 top-6 flex items-center gap-3">
      {username ? (
        <>
          <span className="text-sm text-white/60">
            Hi, {username}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/50 transition hover:border-white/30 hover:text-white"
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/50 transition hover:border-white/30 hover:text-white"
          >
            Log in
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/signup")
            }
            className="rounded-full bg-white px-4 py-2 text-xs uppercase tracking-widest text-black transition hover:bg-white/80"
          >
            Sign up
          </button>
        </>
      )}
    </div>
  );
}