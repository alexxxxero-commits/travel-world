
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
};

type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default function PeoplePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please log in to discover people.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [profileResult, requestResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username")
        .order("username", { ascending: true }),

      supabase
        .from("friend_requests")
        .select("id, sender_id, recipient_id, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }

    if (requestResult.error) {
      setError(requestResult.error.message);
      setLoading(false);
      return;
    }

    setProfiles(profileResult.data ?? []);
    setRequests((requestResult.data ?? []) as FriendRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function sendRequest(recipientId: string) {
    if (!userId) return;

    setBusyIds((ids) => [...ids, recipientId]);
    setNotice("");
    setError("");

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: userId,
        recipient_id: recipientId,
      });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "You have already sent a request to this person."
          : insertError.message
      );
    } else {
      setNotice("Friend request sent!");
      await loadData();
    }

    setBusyIds((ids) => ids.filter((id) => id !== recipientId));
  }

  async function respondToRequest(
    request: FriendRequest,
    decision: "accepted" | "declined"
  ) {
    setBusyIds((ids) => [...ids, request.id]);
    setNotice("");
    setError("");

    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "respond_friend_request",
      {
        request_id: request.id,
        decision,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice(
        decision === "accepted"
          ? "Friend request accepted!"
          : "Friend request declined."
      );
      await loadData();
    }

    setBusyIds((ids) => ids.filter((id) => id !== request.id));
  }

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.id !== userId &&
      profile.username.toLowerCase().includes(search.trim().toLowerCase())
  );

  const incomingRequests = requests.filter(
    (request) =>
      request.recipient_id === userId && request.status === "pending"
  );

  function getRelationship(profileId: string) {
    const outgoing = requests.find(
      (request) =>
        request.sender_id === userId &&
        request.recipient_id === profileId
    );

    const incoming = requests.find(
      (request) =>
        request.sender_id === profileId &&
        request.recipient_id === userId
    );

    if (
      outgoing?.status === "accepted" ||
      incoming?.status === "accepted"
    ) {
      return "friends";
    }

    if (outgoing?.status === "pending") return "sent";
    if (incoming?.status === "pending") return "received";
    if (outgoing?.status === "declined") return "declined";

    return "none";
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Back to Globe
        </Link>

        <header className="mt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            The World Of Mine
          </p>
          <h1 className="mt-3 text-4xl font-light">Discover people</h1>
          <p className="mt-3 text-sm text-white/50">
            Find people and connect your worlds.
          </p>
        </header>

        {notice && (
          <p className="mt-6 rounded-xl border border-white/15 p-3 text-sm text-white/80">
            {notice}
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-red-400/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {incomingRequests.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-medium">
              Friend requests ({incomingRequests.length})
            </h2>

            <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 px-4">
              {incomingRequests.map((request) => {
                const sender = profiles.find(
                  (profile) => profile.id === request.sender_id
                );

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <span className="truncate text-sm">
                      @{sender?.username ?? "Unknown user"}
                    </span>

                    <div className="flex shrink-0 gap-2">
                      <button
                        disabled={busyIds.includes(request.id)}
                        onClick={() =>
                          respondToRequest(request, "accepted")
                        }
                        className="rounded-full bg-white px-3 py-2 text-xs text-black disabled:opacity-40"
                      >
                        Accept
                      </button>
                      <button
                        disabled={busyIds.includes(request.id)}
                        onClick={() =>
                          respondToRequest(request, "declined")
                        }
                        className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/70 disabled:opacity-40"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username..."
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/40"
          />

          {loading ? (
            <p className="mt-6 text-sm text-white/50">Loading people...</p>
          ) : error && profiles.length === 0 ? (
            <Link
              href="/login"
              className="mt-6 inline-block text-sm underline underline-offset-4"
            >
              Go to login
            </Link>
          ) : filteredProfiles.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm text-white/50">
              No other users found.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-white/10">
              {filteredProfiles.map((profile) => {
                const relationship = getRelationship(profile.id);
                const busy = busyIds.includes(profile.id);

                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-4 py-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base">
                        @{profile.username}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        The World Of Mine member
                      </p>
                    </div>

                    {relationship === "friends" ? (
                      <span className="shrink-0 text-xs text-white/50">
                        Friends
                      </span>
                    ) : relationship === "sent" ? (
                      <span className="shrink-0 text-xs text-white/50">
                        Request sent
                      </span>
                    ) : relationship === "received" ? (
                      <span className="shrink-0 text-xs text-white/50">
                        Request received
                      </span>
                    ) : relationship === "declined" ? (
                      <span className="shrink-0 text-xs text-white/50">
                        Declined
                      </span>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => sendRequest(profile.id)}
                        className="shrink-0 rounded-full border border-white/25 px-4 py-2 text-xs transition hover:bg-white hover:text-black disabled:opacity-40"
                      >
                        {busy ? "Sending..." : "Add friend"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
