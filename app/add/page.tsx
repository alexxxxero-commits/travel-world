"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  user_id: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longtitude: number | null;
  description: string | null;
};

export default function AddMemory() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState("");

  const [showNewPlace, setShowNewPlace] = useState(false);

  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingPlace, setCreatingPlace] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // LOAD PLACES
  // ==========================================

  useEffect(() => {
    async function loadPlaces() {
      const { data, error } = await supabase
        .from("places")
        .select(
          "id, user_id, city, country, latitude, longtitude, description"
        )
        .order("city");

      if (error) {
        console.error("LOAD PLACES ERROR:", error);
        setMessage(`Could not load places: ${error.message}`);
        return;
      }

      setPlaces(data ?? []);
    }

    loadPlaces();
  }, []);

  // ==========================================
  // CREATE NEW PLACE
  // ==========================================

  async function createPlace() {
    if (!newCity.trim() || !newCountry.trim()) {
      setMessage("Please enter at least a city and country.");
      return;
    }

    setCreatingPlace(true);
    setMessage("");

    const latitude =
      newLatitude.trim() === ""
        ? null
        : Number(newLatitude);

    const longtitude =
      newLongitude.trim() === ""
        ? null
        : Number(newLongitude);

    if (
      (latitude !== null && Number.isNaN(latitude)) ||
      (longtitude !== null && Number.isNaN(longtitude))
    ) {
      setMessage("Latitude and longitude must be numbers.");
      setCreatingPlace(false);
      return;
    }

    const { data, error } = await supabase
      .from("places")
      .insert({
        user_id: null,
        city: newCity.trim(),
        country: newCountry.trim(),
        latitude,
        longtitude,
        description: newDescription.trim() || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("CREATE PLACE ERROR:", error);

      setMessage(
        `Place could not be created: ${
          error?.message ?? "Unknown error"
        }`
      );

      setCreatingPlace(false);
      return;
    }

    // Add the new place to the dropdown
    setPlaces((current) =>
      [...current, data].sort((a, b) =>
        a.city.localeCompare(b.city)
      )
    );

    // Automatically select the new place
    setPlaceId(data.id);

    // Reset new-place form
    setNewCity("");
    setNewCountry("");
    setNewLatitude("");
    setNewLongitude("");
    setNewDescription("");

    setShowNewPlace(false);
    setCreatingPlace(false);

    setMessage(
      `Place created ✨ ${data.city}, ${data.country}`
    );
  }

  // ==========================================
  // SAVE MEMORY
  // ==========================================

  async function saveMemory() {
    if (!placeId || !title.trim() || !content.trim()) {
      setMessage("Please fill in everything.");
      return;
    }

    setSaving(true);
    setMessage("");

    // ==========================================
    // 1. CREATE JOURNAL
    // ==========================================

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
      console.error("JOURNAL ERROR:", journalError);

      setMessage(
        `Journal could not be saved: ${
          journalError?.message ?? "Unknown error"
        }`
      );

      setSaving(false);
      return;
    }

    // ==========================================
    // 2. UPLOAD PHOTOS
    // ==========================================

    const photoRows: {
      place_id: string;
      journal_id: string;
      url: string;
    }[] = [];

    for (const photo of photos) {
      const extension =
        photo.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const filePath = `journals/${uniqueName}`;

      console.log("UPLOADING PHOTO:", filePath);

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

      console.log("UPLOAD SUCCESS:", uploadData);

      // ==========================================
      // 3. CREATE PUBLIC URL
      // ==========================================

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      console.log(
        "PUBLIC PHOTO URL:",
        publicUrl
      );

      if (!publicUrl) {
        console.error("PUBLIC URL WAS EMPTY");

        setMessage(
          "Photo uploaded, but the public URL could not be created."
        );

        setSaving(false);
        return;
      }

      // ==========================================
      // 4. ADD PHOTO RECORD
      // ==========================================

      photoRows.push({
        place_id: placeId,
        journal_id: journal.id,
        url: publicUrl,
      });
    }

    // ==========================================
    // 5. SAVE PHOTO RECORDS
    // ==========================================

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
          `Photos could not be saved: ${photoError.message}`
        );

        setSaving(false);
        return;
      }

      console.log(
        "PHOTOS INSERTED:",
        insertedPhotos
      );
    }

    // ==========================================
    // 6. SUCCESS
    // ==========================================

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

  // ==========================================
  // UI
  // ==========================================

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

        {/* ======================================
            PLACE
        ====================================== */}

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

          {/* Add new place button */}

          <button
            type="button"
            onClick={() => {
              setShowNewPlace(!showNewPlace);
              setMessage("");
            }}
            className="mt-4 text-sm text-white/50 transition hover:text-white"
          >
            {showNewPlace
              ? "− Cancel new place"
              : "+ Add a new place"}
          </button>
        </div>

        {/* ======================================
            NEW PLACE FORM
        ====================================== */}

        {showNewPlace && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-sm uppercase tracking-[0.3em] text-white/40">
              New Place
            </p>

            {/* City */}

            <div className="mt-6">
              <label className="text-sm text-white/60">
                City
              </label>

              <input
                value={newCity}
                onChange={(e) =>
                  setNewCity(e.target.value)
                }
                placeholder="San Pedro de Atacama"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />
            </div>

            {/* Country */}

            <div className="mt-5">
              <label className="text-sm text-white/60">
                Country
              </label>

              <input
                value={newCountry}
                onChange={(e) =>
                  setNewCountry(e.target.value)
                }
                placeholder="Chile"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />
            </div>

            {/* Coordinates */}

            <div className="mt-5 grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-white/60">
                  Latitude
                </label>

                <input
                  value={newLatitude}
                  onChange={(e) =>
                    setNewLatitude(e.target.value)
                  }
                  placeholder="-22.9087"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/60">
                  Longitude
                </label>

                <input
                  value={newLongitude}
                  onChange={(e) =>
                    setNewLongitude(e.target.value)
                  }
                  placeholder="-67.9236"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
                />
              </div>

            </div>

            {/* Description */}

            <div className="mt-5">
              <label className="text-sm text-white/60">
                Description
              </label>

              <textarea
                value={newDescription}
                onChange={(e) =>
                  setNewDescription(e.target.value)
                }
                placeholder="A desert town surrounded by incredible landscapes..."
                rows={4}
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />
            </div>

            {/* Create */}

            <button
              type="button"
              onClick={createPlace}
              disabled={creatingPlace}
              className="mt-6 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
            >
              {creatingPlace
                ? "Creating..."
                : "Create Place"}
            </button>
          </div>
        )}

        {/* ======================================
            TITLE
        ====================================== */}

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

        {/* ======================================
            CONTENT
        ====================================== */}

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

        {/* ======================================
            PHOTOS
        ====================================== */}

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

        {/* ======================================
            SAVE
        ====================================== */}

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