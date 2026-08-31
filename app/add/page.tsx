"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in.");
        return;
      }

      const { data, error } = await supabase
        .from("places")
        .select("id, city, country, latitude, longitude")
        .eq("user_id", user.id)
        .order("city");

      if (error) {
        console.error("LOAD PLACES ERROR:", error);
        setMessage(`Could not load places: ${error.message}`);
        return;
      }

      setPlaces(data ?? []);
    }

    loadPlaces();
  }, [supabase]);

  // ==========================================
  // 2. SEARCH CITY
  // ==========================================

  async function searchCity(query?: string) {
    const searchText = (query ?? citySearch).trim();

    if (!searchText) {
      setSearchResults([]);
      return;
    }

    setSearchingCity(true);
    setMessage("");

    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?format=jsonv2` +
        `&addressdetails=1` +
        `&limit=8` +
        `&accept-language=en` +
        `&q=${encodeURIComponent(searchText)}`;

      const response = await fetch(url);

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
            item.address?.county ||
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

      // Remove duplicate city + country combinations
      const uniqueResults = results.filter(
        (result, index, array) =>
          index ===
          array.findIndex(
            (item) =>
              item.city.toLowerCase() ===
                result.city.toLowerCase() &&
              item.country.toLowerCase() ===
                result.country.toLowerCase()
          )
      );

      setSearchResults(uniqueResults);

      if (uniqueResults.length === 0) {
        setMessage("No places found.");
      }
    } catch (error) {
      console.error("CITY SEARCH ERROR:", error);
      setSearchResults([]);
      setMessage("Could not find that place.");
    } finally {
      setSearchingCity(false);
    }
  }

  // ==========================================
  // 3. AUTO SEARCH WHILE TYPING
  // ==========================================

  useEffect(() => {
    const query = citySearch.trim();

    // Don't search when the input is empty
    if (!query) {
      setSearchResults([]);
      setSearchingCity(false);
      return;
    }

    // Wait a little before searching so we don't
    // send a request for every single keystroke.
    const timeout = setTimeout(() => {
      searchCity(query);
    }, 400);

    return () => clearTimeout(timeout);
  }, [citySearch]);

  // ==========================================
  // 4. SELECT SEARCH RESULT
  // ==========================================

  async function selectSearchResult(result: SearchResult) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    // Check if place already exists
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

    // Create new place
    const { data, error } = await supabase
      .from("places")
      .insert({
        user_id: user.id,
        city: result.city,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      })
      .select("id, city, country, latitude, longitude")
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

    // Add newly-created place to local state
    setPlaces((current) => {
      const alreadyExists = current.some(
        (place) => place.id === data.id
      );

      if (alreadyExists) {
        return current;
      }

      return [...current, data];
    });

    // IMPORTANT:
    // This is what makes the place actually selected.
    setPlaceId(data.id);

    setCitySearch("");
    setSearchResults([]);

    setMessage(`${data.city}, ${data.country} selected ✨`);
  }

  // ==========================================
  // 5. SELECT EXISTING PLACE
  // ==========================================

  function selectExistingPlace(id: string) {
    setPlaceId(id);
    setCitySearch("");
    setSearchResults([]);
    setMessage("");
  }

  // ==========================================
  // 6. SAVE JOURNAL + PHOTOS
  // ==========================================

  async function saveMemory() {
    // ==========================================
    // VALIDATION
    // ==========================================

    if (!placeId) {
      setMessage("Please select a place.");
      return;
    }

    if (!title.trim()) {
      setMessage("Please enter a title.");
      return;
    }

    if (!content.trim()) {
      setMessage("Please write something in your story.");
      return;
    }

    setSaving(true);
    setMessage("");

    // ==========================================
    // GET USER
    // ==========================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in.");
      setSaving(false);
      return;
    }

    // ==========================================
    // VERIFY PLACE
    // ==========================================

    const {
      data: verifiedPlace,
      error: placeError,
    } = await supabase
      .from("places")
      .select("id")
      .eq("id", placeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (placeError) {
      console.error("VERIFY PLACE ERROR:", placeError);

      setMessage(
        `Could not verify place: ${placeError.message}`
      );

      setSaving(false);
      return;
    }

    if (!verifiedPlace) {
      setMessage(
        "The selected place could not be found. Please select the place again."
      );

      setSaving(false);
      return;
    }

    // ==========================================
    // CREATE JOURNAL
    // ==========================================

    const {
      data: journal,
      error: journalError,
    } = await supabase
      .from("journals")
      .insert({
        user_id: user.id,
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

      const uniqueName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      const filePath =
        `journals/${user.id}/${uniqueName}`;

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
        console.error(
          "PHOTO INSERT ERROR:",
          photoError
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
    // SUCCESS
    // ==========================================

    const photoCount = photos.length;

    setTitle("");
    setContent("");
    setPlaceId("");
    setCitySearch("");
    setSearchResults([]);
    setPhotos([]);

    setMessage(
      photoCount > 0
        ? `Memory saved ✨ ${photoCount} photo${
            photoCount > 1 ? "s" : ""
          } added.`
        : "Memory saved ✨"
    );

    setSaving(false);

    // Return to homepage after saving
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 700);
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl">
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

          <div className="mt-3">
            <div className="flex gap-3">
              <input
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);

                  // If the user starts typing again,
                  // the previous place selection should
                  // no longer be considered active.
                  if (placeId) {
                    setPlaceId("");
                  }

                  setMessage("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchCity();
                  }
                }}
                placeholder="Search for a city..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />

              <button
                type="button"
                onClick={() => searchCity()}
                disabled={searchingCity}
                className="rounded-2xl bg-white px-5 py-4 text-sm text-black transition hover:bg-white/80 disabled:opacity-50"
              >
                {searchingCity
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>

            {/* ==================================
                SEARCH RESULTS
            ================================== */}

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

            {/* Searching indicator */}

            {searchingCity &&
              citySearch.trim() && (
                <p className="mt-3 px-2 text-xs text-white/30">
                  Searching places...
                </p>
              )}
          </div>

          {/* ==================================
              SELECTED PLACE
          ================================== */}

          {placeId && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="text-xs uppercase tracking-widest text-white/30">
                Selected place
              </div>

              <div className="mt-2 text-white">
                {places.find(
                  (place) => place.id === placeId
                )?.city ?? "Selected place"}
                {places.find(
                  (place) => place.id === placeId
                )?.country
                  ? `, ${
                      places.find(
                        (place) =>
                          place.id === placeId
                      )?.country
                    }`
                  : ""}
              </div>
            </div>
          )}

          {/* ==================================
              EXISTING PLACES
          ================================== */}

          <div className="mt-4">
            <label className="text-xs text-white/30">
              Or choose an existing place
            </label>

            <select
              value={placeId}
              onChange={(e) =>
                selectExistingPlace(e.target.value)
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
                    photos.length > 1 ? "s" : ""
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

          {/* Selected Photos */}

          {photos.length > 0 && (
            <div className="mt-4 space-y-2">
              {photos.map((photo, index) => (
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
                          (_, i) => i !== index
                        )
                      );
                    }}
                    className="ml-4 text-white/40 transition hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================
            SAVE
        ====================================== */}

        <button
          type="button"
          onClick={saveMemory}
          disabled={saving}
          className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm uppercase tracking-widest text-black transition hover:bg-white/80 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Memory"}
        </button>

        {/* ======================================
            MESSAGE
        ====================================== */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}