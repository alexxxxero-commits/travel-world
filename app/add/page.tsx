"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

type SearchResult = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export default function AddMemory() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState("");

  const [citySearch, setCitySearch] = useState("");
  const [searchingCity, setSearchingCity] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // 1. LOAD EXISTING PLACES
  // ==========================================

  useEffect(() => {
    async function loadPlaces() {
      const { data, error } = await supabase
        .from("places")
        .select("id, city, country, latitude, longitude")
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
  // 2. SEARCH CITY
  // ==========================================

  async function searchCity() {
    if (!citySearch.trim()) return;

    setSearchingCity(true);
    setSearchResults([]);
    setMessage("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
          citySearch.trim()
        )}`
      );

      if (!response.ok) {
        throw new Error("City search failed");
      }

      const data = await response.json();

      const results: SearchResult[] = data
        .map((item: any) => ({
          city:
            item.address?.city ||
            item.address?.town ||
            item.address?.municipality ||
            item.address?.village ||
            item.display_name?.split(",")[0] ||
            "",

          country: item.address?.country || "",

          latitude: Number(item.lat),
          longitude: Number(item.lon),
        }))
        .filter(
          (item: SearchResult) =>
            item.city &&
            item.country &&
            !Number.isNaN(item.latitude) &&
            !Number.isNaN(item.longitude)
        );

      setSearchResults(results);

      if (results.length === 0) {
        setMessage("No places found.");
      }
    } catch (error) {
      console.error("CITY SEARCH ERROR:", error);
      setMessage("Could not find that place.");
    } finally {
      setSearchingCity(false);
    }
  }

  // ==========================================
  // 3. SELECT SEARCH RESULT
  // ==========================================

  async function selectSearchResult(result: SearchResult) {
    setMessage("");

    // Check if this place already exists
    const existingPlace = places.find(
      (place) =>
        place.city.toLowerCase() === result.city.toLowerCase() &&
        place.country.toLowerCase() === result.country.toLowerCase()
    );

    if (existingPlace) {
      setPlaceId(existingPlace.id);
      setCitySearch("");
      setSearchResults([]);

      setMessage(
        `${existingPlace.city}, ${existingPlace.country} selected ✨`
      );

      return;
    }

    // Create new place in Supabase
    const { data, error } = await supabase
      .from("places")
      .insert({
        city: result.city,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("CREATE PLACE ERROR:", error);

      setMessage(
        `Could not create place: ${
          error?.message ?? "Unknown error"
        }`
      );

      return;
    }

    // Add the new place to local state
    setPlaces((current) => [...current, data]);

    // Automatically select it
    setPlaceId(data.id);

    // Clear search
    setCitySearch("");
    setSearchResults([]);

    setMessage(`${data.city}, ${data.country} added ✨`);
  }

  // ==========================================
  // 4. SAVE JOURNAL + PHOTOS
  // ==========================================

  async function saveMemory() {
    if (!placeId || !title.trim() || !content.trim()) {
      setMessage("Please fill in everything.");
      return;
    }

    setSaving(true);
    setMessage("");

    // ==========================================
    // CREATE JOURNAL
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
    // UPLOAD PHOTOS
    // ==========================================

    const photoRows: {
      place_id: string;
      journal_id: string;
      url: string;
    }[] = [];

    for (const photo of photos) {
      const extension =
        photo.name.split(".").pop()?.toLowerCase() || "jpg";

      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const filePath = `journals/${uniqueName}`;

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
      // CREATE PUBLIC URL
      // ==========================================

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
        setMessage(
          "Photo uploaded, but the public URL could not be created."
        );

        setSaving(false);
        return;
      }

      photoRows.push({
        place_id: placeId,
        journal_id: journal.id,
        url: publicUrl,
      });
    }

    // ==========================================
    // SAVE PHOTO RECORDS
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
        console.error("PHOTO INSERT ERROR:", photoError);

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
    // SUCCESS
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

        {/* Place */}

        <div className="mt-12">
          <label className="text-sm text-white/60">
            Place
          </label>

          {/* Search city */}

          <div className="mt-3">
            <div className="flex gap-3">
              <input
                value={citySearch}
                onChange={(e) =>
                  setCitySearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchCity();
                  }
                }}
                placeholder="Search for a city..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />

              <button
                type="button"
                onClick={searchCity}
                disabled={searchingCity}
                className="rounded-2xl bg-white px-5 py-4 text-sm text-black transition hover:bg-white/80 disabled:opacity-50"
              >
                {searchingCity
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>

            {/* Search results */}

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map(
                  (result, index) => (
                    <button
                      key={`${result.city}-${result.country}-${index}`}
                      type="button"
                      onClick={() =>
                        selectSearchResult(result)
                      }
                      className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                    >
                      <div className="text-white">
                        {result.city},{" "}
                        {result.country}
                      </div>

                      <div className="mt-1 text-xs text-white/30">
                        {result.latitude.toFixed(4)},{" "}
                        {result.longitude.toFixed(4)}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Existing places */}

          <div className="mt-4">
            <label className="text-xs text-white/30">
              Or choose an existing place
            </label>

            <select
              value={placeId}
              onChange={(e) =>
                setPlaceId(e.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none"
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
              className="hidden"
              onChange={(e) => {
                const files = Array.from(
                  e.target.files ?? []
                );

                setPhotos(files);
              }}
            />
          </label>

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