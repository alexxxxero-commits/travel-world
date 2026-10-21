
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    async function loadProfile(userId: string) {
      const currentRequest = ++requestId;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single();

        if (!mounted || currentRequest !== requestId) return;

        if (error) {
          console.error("PROFILE LOAD ERROR:", error);
          setUsername(null);
          setLoading(false);
          return;
        }

        setUsername(profile?.username ?? null);
        setLoading(false);
      } catch (error) {
        if (!mounted || currentRequest !== requestId) return;

        console.error("PROFILE LOAD ERROR:", error);
        setUsername(null);
        setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH EVENT:", event);

      if (!mounted) return;

      const user = session?.user;

      if (!user) {
        requestId++;
        setUsername(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Run the profile query outside the auth callback.
      setTimeout(() => {
        if (mounted) {
          void loadProfile(user.id);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoading(false);
      return;
    }

    setUsername(null);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return null;
  }

  if (!username) {
    return (
      <div className="fixed right-6 top-6 z-50">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-full border border-white/20 bg-black/60 px-5 py-2 text-sm text-white backdrop-blur transition hover:bg-white hover:text-black"
        >
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-6 top-6 z-50 flex items-center gap-3">
      <div className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white backdrop-blur">
        @{username}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 backdrop-blur transition hover:bg-white hover:text-black"
      >
        Log out
      </button>
    </div>
  );
}
