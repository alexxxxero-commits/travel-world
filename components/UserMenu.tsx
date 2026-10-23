
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

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

        // Count incoming friend requests that haven't been answered.
        const { count, error: requestError } = await supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("status", "pending");

        if (!mounted || currentRequest !== requestId) return;

        if (requestError) {
          console.error("FRIEND REQUEST COUNT ERROR:", requestError);
          return;
        }

        setPendingCount(count ?? 0);
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
        setPendingCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

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
    setPendingCount(0);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return null;
  }

  if (!username) {
    return (
      <div className="fixed right-3 top-3 z-50 sm:right-6 sm:top-6">
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
    <div className="fixed right-3 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-2 sm:right-6 sm:top-6 sm:gap-3">
      <button
        type="button"
        onClick={() => router.push("/people")}
        className="rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 backdrop-blur transition hover:bg-white hover:text-black sm:px-4 sm:text-sm"
      >
        People
      </button>

      <button
        type="button"
        onClick={() => router.push("/friend-requests")}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 backdrop-blur transition hover:bg-white hover:text-black sm:px-4 sm:text-sm"
      >
        Friend Requests
        {pendingCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      <div className="max-w-28 truncate rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur sm:max-w-none sm:px-5 sm:text-sm">
        @{username}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/60 backdrop-blur transition hover:bg-white hover:text-black sm:px-4 sm:text-sm"
      >
        Log out
      </button>
    </div>
  );
}
