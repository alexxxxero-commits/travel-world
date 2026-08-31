"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Journal = {
  id: string;
  place_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
};

type Place = {
  id: string;
  city: string;
  country: string;
};

type Photo = {
  id: string;
  place_id: string;
  journal_id: string | null;
  url: string;
  caption: string | null;
  created_at: string;
};

export default function EditMemory() {
  const supabase = createClient();

  const router = useRouter();

  const params = useParams();

  const journalId = params.id as string;

  const [journal, setJournal] =
    useState<Journal | null>(null);

  const [place, setPlace] =
    useState<Place | null>(null);

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [title, setTitle] = useState("");

  const [content, setContent] = useState("");

  const [newPhotos, setNewPhotos] =
    useState<File[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // ==========================================
  // LOAD MEMORY
  // ==========================================

  useEffect(() => {
    async function loadMemory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const {
        data: journalData,
        error: journalError,
      } = await supabase
        .from("journals")
        .select("*")
        .eq("id", journalId)
        .eq("user_id", user.id)
        .single();

      if (journalError || !journalData) {
        console.error(
          "LOAD JOURNAL ERROR:",
          journalError
        );

        setMessage("Memory not found.");
        setLoading(false);
        return;
      }

      setJournal(journalData);

      setTitle(journalData.title);

      setContent(journalData.content);

      // ========================================
      // LOAD PLACE
      // ========================================

      const {
        data: placeData,
      } = await supabase
        .from("places")
        .select(
          "id, city, country"
        )
        .eq("id", journalData.place_id)
        .eq("user_id", user.id)
        .single();

      setPlace(placeData);

      // ========================================
      // LOAD PHOTOS
      // ========================================

      const {
        data: photoData,
        error: photoError,
      } = await supabase
        .from("photos")
        .select("*")
        .eq("journal_id", journalId)
        .order("created_at");

      if (photoError) {
        console.error(
          "LOAD PHOTOS ERROR:",
          photoError
        );
      }

      setPhotos(photoData ?? []);

      setLoading(false);
    }

    loadMemory();
  }, [journalId, router, supabase]);

  // ==========================================
  // DELETE EXISTING PHOTO
  // ==========================================

  async function deletePhoto(
    photo: Photo
  ) {
    const confirmed = window.confirm(
      "Delete this photo?"
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const marker =
        "/storage/v1/object/public/photos/";

      let storagePath = "";

      const index =
        photo.url.indexOf(marker);

      if (index !== -1) {
        storagePath = photo.url.slice(
          index + marker.length
        );
      }

      // Delete storage file
      if (storagePath) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("photos")
          .remove([storagePath]);

        if (storageError) {
          console.error(
            "DELETE PHOTO STORAGE ERROR:",
            storageError
          );
        }
      }

      // Delete database record
      const {
        error: databaseError,
      } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (databaseError) {
        throw databaseError;
      }

      setPhotos((current) =>
        current.filter(
          (item) => item.id !== photo.id
        )
      );
    } catch (error) {
      console.error(
        "DELETE PHOTO ERROR:",
        error
      );

      setMessage(
        "Could not delete this photo."
      );
    }
  }

  // ==========================================
  // SAVE
  // ==========================================

  async function saveChanges() {
    if (!journal) return;

    if (!title.trim()) {
      setMessage("Please enter a title.");
      return;
    }

    if (!content.trim()) {
      setMessage(
        "Please write something in your story."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // ========================================
      // UPDATE JOURNAL
      // ========================================

      const {
        error: journalError,
      } = await supabase
        .from("journals")
        .update({
          title: title.trim(),
          content: content.trim(),
        })
        .eq("id", journal.id);

      if (journalError) {
        throw journalError;
      }

      // ========================================
      // UPLOAD NEW PHOTOS
      // ========================================

      for (const photo of newPhotos) {
        const extension =
          photo.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const uniqueName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${extension}`;

        const filePath =
          `journals/${journal.user_id}/${uniqueName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("photos")
          .upload(
            filePath,
            photo,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: photo.type,
            }
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);

        const publicUrl =
          publicUrlData.publicUrl;

        // ======================================
        // INSERT PHOTO RECORD
        // ======================================

        const {
          error: photoError,
        } = await supabase
          .from("photos")
          .insert({
            place_id: journal.place_id,
            journal_id: journal.id,
            url: publicUrl,
          });

        if (photoError) {
          throw photoError;
        }
      }

      setNewPhotos([]);

      setMessage(
        "Memory updated ✨"
      );

      // Give the user a moment
      // to see the success message.
      setTimeout(() => {
        router.push(
          `/places/${journal.place_id}`
        );

        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "SAVE EDIT ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save changes."
      );

      setSaving(false);
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/40">
          Loading memory...
        </p>
      </main>
    );
  }

  // ==========================================
  // NOT FOUND
  // ==========================================

  if (!journal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-white/50">
            Memory not found.
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 text-sm text-white/60 underline underline-offset-4"
          >
            ← Back to the world
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl">

        <button
          type="button"
          onClick={() =>
            router.push(
              `/places/${journal.place_id}`
            )
          }
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Back to memory
        </button>

        <p className="mt-16 text-sm uppercase tracking-[0.4em] text-white/40">
          The World Of Mine
        </p>

        <h1 className="mt-4 text-5xl font-light">
          Edit Memory
        </h1>

        {place && (
          <p className="mt-4 text-white/40">
            {place.city}, {place.country}
          </p>
        )}

        {/* TITLE */}

        <div className="mt-12">
          <label className="text-sm text-white/60">
            Title
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none"
          />
        </div>

        {/* CONTENT */}

        <div className="mt-8">
          <label className="text-sm text-white/60">
            Your story
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            rows={10}
            className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none"
          />
        </div>

        {/* EXISTING PHOTOS */}

        <div className="mt-10">
          <label className="text-sm text-white/60">
            Existing photos
          </label>

          {photos.length === 0 ? (
            <p className="mt-4 text-sm text-white/30">
              No photos attached.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img
                    src={photo.url}
                    alt={
                      photo.caption ??
                      title
                    }
                    className="aspect-square w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      deletePhoto(photo)
                    }
                    className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white/70 backdrop-blur transition hover:bg-black hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD PHOTOS */}

        <div className="mt-10">
          <label className="text-sm text-white/60">
            Add photos
          </label>

          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center transition hover:bg-white/10">
            <span className="text-3xl">
              📷
            </span>

            <span className="mt-3 text-sm text-white/60">
              {newPhotos.length > 0
                ? `${newPhotos.length} new photo${
                    newPhotos.length > 1
                      ? "s"
                      : ""
                  } selected`
                : "Add photos"}
            </span>

            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files =
                  Array.from(
                    e.target.files ?? []
                  );

                setNewPhotos(files);
              }}
            />
          </label>

          {newPhotos.length > 0 && (
            <div className="mt-4 space-y-2">
              {newPhotos.map(
                (photo, index) => (
                  <div
                    key={`${photo.name}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                  >
                    <span className="truncate text-sm text-white/60">
                      {photo.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setNewPhotos(
                          newPhotos.filter(
                            (_, i) =>
                              i !== index
                          )
                        )
                      }
                      className="ml-4 text-white/40 transition hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* SAVE */}

        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          className="mt-10 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>

        {/* MESSAGE */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}