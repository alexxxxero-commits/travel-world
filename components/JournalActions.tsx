"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JournalActionsProps = {
  journalId: string;
};

export default function JournalActions({
  journalId,
}: JournalActionsProps) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  async function deleteMemory() {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/journals/${journalId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not delete memory."
        );
      }

      router.refresh();
    } catch (error) {
      console.error("DELETE MEMORY ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Could not delete memory."
      );

      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(`/edit/${journalId}`)
          }
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/40 transition hover:border-white/30 hover:text-white"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/40 transition hover:border-red-400/30 hover:text-red-300"
        >
          Delete
        </button>
      </div>

      {showConfirm && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-white/10 bg-black p-5 shadow-2xl">
          <p className="text-sm text-white">
            Delete this memory?
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            This will permanently delete the journal
            and its associated photos.
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="rounded-full px-4 py-2 text-xs text-white/40 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={deleteMemory}
              disabled={deleting}
              className="rounded-full bg-white px-4 py-2 text-xs text-black transition hover:bg-white/80 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}