"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      if (!mounted) return;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "GET USER ERROR:",
          userError
        );

        if (mounted) {
          setUsername(null);
          setLoading(false);
        }

        return;
      }

      if (!user) {
        if (mounted) {
          setUsername(null);
          setLoading(false);
        }

        return;
      }

      console.log("CURRENT USER:", user);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(
          "PROFILE LOAD ERROR:",
          profileError
        );

        if (mounted) {
          setUsername(null);
          setLoading(false);
        }

        return;
      }

      if (mounted) {
        setUsername(
          profile?.username ?? null
        );

        setLoading(false);
      }
    }

    async function initialize() {
      await loadUser();

      if (!mounted) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log(
            "AUTH EVENT:",
            event
          );

          if (!mounted) return;

          if (!session?.user) {
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
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error(
              "PROFILE LOAD ERROR:",
              error
            );

            if (mounted) {
              setUsername(null);
              setLoading(false);
            }

            return;
          }

          if (mounted) {
            setUsername(
              profile?.username ?? null
            );

            setLoading(false);
          }
        }
      );

      return subscription;
    }

    let subscription:
      | ReturnType<
          typeof supabase.auth.onAuthStateChange
        >["data"]["subscription"]
      | null = null;

    initialize().then((result) => {
      if (result) {
        subscription = result;
      }
    });

    return () => {
      mounted = false;

      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  async function handleLogout() {
    setLoading(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

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
          onClick={() =>
            router.push("/login")
          }
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