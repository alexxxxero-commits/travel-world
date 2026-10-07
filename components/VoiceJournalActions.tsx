"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type VoiceJournalActionsProps = {
  voiceId: string;
  currentTitle: string;
};

export default function VoiceJournalActions({
  voiceId,
  currentTitle,
}: VoiceJournalActionsProps) {
  const supabase = createClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  async function saveTitle() {
    const newTitle = title.trim();

    if (!newTitle) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("voice_journals")
      .update({
        title: newTitle,
      })
      .eq("id", voiceId);

    if (error) {
      console.error("VOICE TITLE UPDATE ERROR:", error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);

    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          autoFocus
        />

        <button
          type="button"
          onClick={saveTitle}
          disabled={saving}
          className="text-xs text-white/60 transition hover:text-white disabled:opacity-30"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => {
            setTitle(currentTitle);
            setEditing(false);
          }}
          className="text-xs text-white/30 transition hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-xs text-white/30 underline underline-offset-4 transition hover:text-white"
    >
      Rename
    </button>
  );
}