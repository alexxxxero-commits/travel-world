"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  city: string;
  country: string;
};

export default function AddMemory() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlaces() {
      const { data, error } = await supabase
        .from("places")
        .select("id, city, country")
        .order("city");

      if (error) {
        console.error("LOAD PLACES ERROR:", error);
        return;
      }

      setPlaces(data ?? []);
    }

    loadPlaces();
  }, []);

  async function saveMemory() {
    if (!placeId || !title.trim() || !content.trim()) {
      setMessage("Please fill in everything.");
      return;
    }

    setSaving(true);
    setMessage("");

    /*
     * ==========================================
     * 1. CREATE JOURNAL
     * ==========================================
     */

    const {
      data: journal,
      error: journalError,
    } = await supabase
      .from("journals")
      .insert({
        place_id: placeId,
        title: title.trim(),
        content: content.trim(),
      })
      .select()
      .single();

    if (journalError || !journal) {
      console.error(
        "JOURNAL ERROR:",
        journalError
      );

      setMessage(
        `Journal could not be saved: ${
          journalError?.message ?? "Unknown error"
        }`
      );

      setSaving(false);
      return;
    }

    /*
     * ==========================================
     * 2. UPLOAD PHOTOS
     * ==========================================
     */

    const photoRows: {
      place_id: string;
      journal_id: string;
      url: string;
    }[] = [];

    for (const photo of photos) {
      /*
       * Generate ONE unique path.
       *
       * This exact path is used for:
       *
       * Storage upload
       *        ↓
       * Public URL
       *        ↓
       * photos.url
       */

      const extension =
        photo.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const uniqueName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      const filePath =
        `journals/${uniqueName}`;

      console.log(
        "UPLOADING PHOTO:",
        filePath
      );

      /*
       * Upload to Storage
       */

      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
        .from("photos")
        .upload(filePath, photo, {
          cacheControl: "3600",
          upsert: false,
          contentType: photo.type,
        });

      if (uploadError) {
        console.error(
          "STORAGE UPLOAD ERROR:",
          uploadError
        );

        setMessage(
          `Photo upload failed: ${uploadError.message}`
        );

        setSaving(false);
        return;
      }

      console.log(
        "UPLOAD SUCCESS:",
        uploadData
      );

      /*
       * ==========================================
       * 3. CREATE PUBLIC URL
       * ==========================================
       */

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      console.log(
        "PUBLIC PHOTO URL:",
        publicUrl
      );

      /*
       * ==========================================
       * 4. VERIFY THE URL
       * ==========================================
       *
       * We don't want to save a broken URL
       * into the database.
       */

      if (!publicUrl) {
        console.error(
          "PUBLIC URL WAS EMPTY"
        );

        setMessage(
          "Photo uploaded, but the public URL could not be created."
        );

        setSaving(false);
        return;
      }

      /*
       * Add this photo to the rows
       * that will be inserted into photos.
       */

      photoRows.push({
        place_id: placeId,
        journal_id: journal.id,
        url: publicUrl,
      });
    }

    /*
     * ==========================================
     * 5. SAVE PHOTO RECORDS
     * ==========================================
     */

    if (photoRows.length > 0) {
      const {
        data: insertedPhotos,
        error: photoError,
      } = await supabase
        .from("photos")
        .insert(photoRows)
        .select();

      if (photoError) {
        console.error(
          "PHOTO INSERT ERROR:",
          {
            message: photoError.message,
            details: photoError.details,
            hint: photoError.hint,
            code: photoError.code,
          }
        );

        setMessage(
          `Photos could not be saved: ${
            photoError.message
          }`
        );

        setSaving(false);
        return;
      }

      console.log(
        "PHOTOS INSERTED:",
        insertedPhotos
      );
    }

    /*
     * ==========================================
     * 6. SUCCESS
     * ==========================================
     */

    setTitle("");
    setContent("");
    setPlaceId("");
    setPhotos([]);

    setMessage(
      photos.length > 0
        ? `Memory saved ✨ ${photos.length} photo${
            photos.length > 1 ? "s" : ""
          } added.`
        : "Memory saved ✨"
    );

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl">

        {/* Header */}

        <p className="text-sm uppercase tracking-[0.4em] text-white/40">
          The World Of Mine
        </p>

        <h1 className="mt-4 text-5xl font-light">
          New Memory
        </h1>

        <p className="mt-4 text-white/50">
          Save a little piece of your journey.
        </p>

        {/* Place */}

        <div className="mt-12">
          <label className="text-sm text-white/60">
            Place
          </label>

          <select
            value={placeId}
            onChange={(e) =>
              setPlaceId(e.target.value)
            }
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none"
          >
            <option
              value=""
              className="bg-black"
            >
              Select a place
            </option>

            {places.map((place) => (
              <option
                key={place.id}
                value={place.id}
                className="bg-black"
              >
                {place.city}, {place.country}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}

        <div className="mt-8">
          <label className="text-sm text-white/60">
            Title
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="My first day in Santiago..."
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
          />
        </div>

        {/* Content */}

        <div className="mt-8">
          <label className="text-sm text-white/60">
            Your story
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            placeholder="Tell your story..."
            rows={8}
            className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
          />
        </div>

        {/* Photos */}

        <div className="mt-8">
          <label className="text-sm text-white/60">
            Photos
          </label>

          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center transition hover:bg-white/10">

            <span className="text-3xl">
              📷
            </span>

            <span className="mt-3 text-sm text-white/60">
              {photos.length > 0
                ? `${photos.length} photo${
                    photos.length > 1
                      ? "s"
                      : ""
                  } selected`
                : "Add photos"}
            </span>

            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(
                  e.target.files ?? []
                );

                setPhotos(files);
              }}
            />
          </label>

          {/* Selected photos */}

          {photos.length > 0 && (
            <div className="mt-4 space-y-2">

              {photos.map(
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
                      onClick={() => {
                        setPhotos(
                          photos.filter(
                            (_, i) =>
                              i !== index
                          )
                        );
                      }}
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

        {/* Save */}

        <button
          onClick={saveMemory}
          disabled={saving}
          className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Memory"}
        </button>

        {/* Message */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}