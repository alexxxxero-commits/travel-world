
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

type Profile = {
  id: string;
  username: string;
};

type RequestItem = {
  request: FriendRequest;
  person: Profile | null;
};

export default function FriendRequestsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<RequestItem[]>([]);
  const [sent, setSent] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"incoming" | "sent">(
    "incoming"
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setUserId(null);
        setIncoming([]);
        setSent([]);
        setError("Please log in to view your friend requests.");
        return;
      }

      setUserId(user.id);

      const { data: requests, error: requestError } = await supabase
        .from("friend_requests")
        .select("id, sender_id, recipient_id, status, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const allRequests = (requests ?? []) as FriendRequest[];

      const otherUserIds = [
        ...new Set(
          allRequests.map((request) =>
            request.sender_id === user.id
              ? request.recipient_id
              : request.sender_id
          )
        ),
      ];

      let profiles: Profile[] = [];

      if (otherUserIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", otherUserIds);

        if (profileError) throw profileError;

        profiles = (profileData ?? []) as Profile[];
      }

      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const toItems = (items: FriendRequest[]): RequestItem[] =>
        items.map((request) => ({
          request,
          person:
            profileById.get(
              request.sender_id === user.id
                ? request.recipient_id
                : request.sender_id
            ) ?? null,
        }));

      setIncoming(
        toItems(
          allRequests.filter(
            (request) =>
              request.recipient_id === user.id &&
              request.status === "pending"
          )
        )
      );

      setSent(
        toItems(
          allRequests.filter((request) => request.sender_id === user.id)
        )
      );
    } catch (err) {
      console.error("FRIEND REQUESTS LOAD ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load friend requests."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function respondToRequest(
    requestId: string,
    decision: "accepted" | "declined"
  ) {
    setBusyId(requestId);
    setError("");
    setMessage("");

    try {
      const { error: responseError } = await supabase.rpc(
        "respond_friend_request",
        {
          request_id: requestId,
          decision,
        }
      );

      if (responseError) throw responseError;

      setMessage(
        decision === "accepted"
          ? "Friend request accepted."
          : "Friend request declined."
      );

      await loadRequests();
    } catch (err) {
      console.error("FRIEND REQUEST RESPONSE ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not update this friend request."
      );
    } finally {
      setBusyId(null);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function statusLabel(status: FriendRequest["status"]) {
    if (status === "pending") return "Pending";
    if (status === "accepted") return "Accepted";
    return "Declined";
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Back to Globe
        </Link>

        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            The World Of Mine
          </p>

          <h1 className="mt-3 text-4xl font-light sm:text-5xl">
            Friend Requests
          </h1>

          <p className="mt-3 text-sm text-white/50 sm:text-base">
            Find your people, and bring your worlds closer.
          </p>
        </div>

        <div className="mt-9 flex gap-6 border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`border-b-2 pb-3 text-sm transition ${
              activeTab === "incoming"
                ? "border-white text-white"
                : "border-transparent text-white/45 hover:text-white"
            }`}
          >
            Incoming
            {incoming.length > 0 && (
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-black">
                {incoming.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`border-b-2 pb-3 text-sm transition ${
              activeTab === "sent"
                ? "border-white text-white"
                : "border-transparent text-white/45 hover:text-white"
            }`}
          >
            Sent
          </button>
        </div>

        {message && (
          <p className="mt-5 text-sm text-green-300">{message}</p>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            {error}
            {!userId && (
              <div className="mt-3">
                <Link href="/login" className="underline">
                  Go to login
                </Link>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-sm text-white/45">
            Loading friend requests...
          </p>
        ) : activeTab === "incoming" ? (
          incoming.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-light">No pending requests</p>
              <p className="mt-2 text-sm text-white/45">
                When someone wants to connect, their request will appear here.
              </p>
              <Link
                href="/people"
                className="mt-6 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:bg-white hover:text-black"
              >
                Discover people
              </Link>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-white/10">
              {incoming.map(({ request, person }) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base">
                      @{person?.username ?? "Unknown user"}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Sent {formatDate(request.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() =>
                        void respondToRequest(request.id, "accepted")
                      }
                      className="rounded-full bg-white px-4 py-2 text-sm text-black transition hover:bg-white/80 disabled:opacity-50"
                    >
                      {busyId === request.id ? "Please wait..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() =>
                        void respondToRequest(request.id, "declined")
                      }
                      className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : sent.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-light">No sent requests yet</p>
            <p className="mt-2 text-sm text-white/45">
              Find someone you know and invite them to connect.
            </p>
            <Link
              href="/people"
              className="mt-6 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm transition hover:bg-white hover:text-black"
            >
              Discover people
            </Link>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-white/10">
            {sent.map(({ request, person }) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-4 py-5"
              >
                <div>
                  <p className="text-base">
                    @{person?.username ?? "Unknown user"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Sent {formatDate(request.created_at)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                    request.status === "accepted"
                      ? "border-green-400/30 text-green-300"
                      : request.status === "declined"
                        ? "border-white/10 text-white/40"
                        : "border-white/20 text-white/65"
                  }`}
                >
                  {statusLabel(request.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 border-t border-white/10 pt-5">
          <Link
            href="/people"
            className="text-sm text-white/50 transition hover:text-white"
          >
            ← Discover people
          </Link>
        </div>
      </div>
    </main>
  );
}
