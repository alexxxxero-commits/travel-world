"use client";

import { useEffect, useState } from "react";
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
  const supabase = createClient();
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>([]);

  // Existing place selected from database
  const [placeId, setPlaceId] = useState("");

  // New place selected from search, but NOT saved to database yet
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<SearchResult | null>(null);

  const [citySearch, setCitySearch] = useState("");
  const [searchingCity, setSearchingCity] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // HELPER: CALCULATE DISTANCE BETWEEN PLACES
  // ==========================================

  function distanceBetweenPlaces(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const toRad = (value: number) =>
      (value * Math.PI) / 180;

    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c =
      2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

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
        .select(
          "id, city, country, latitude, longitude"
        )
        .eq("user_id", user.id)
        .order("city");

      if (error) {
        console.error("LOAD PLACES ERROR:", error);

        setMessage(
          `Could not load places: ${error.message}`
        );

        return;
      }

      setPlaces(data ?? []);
    }

    loadPlaces();
  }, [supabase]);

  // ==========================================
  // 2. SEARCH CITY
  // ==========================================

  async function searchCity() {
    if (!citySearch.trim()) return;

    setSearchingCity(true);
    setSearchResults([]);
    setMessage("");

    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?format=jsonv2` +
        `&addressdetails=1` +
        `&limit=5` +
        `&q=${encodeURIComponent(citySearch.trim())}`;

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

      // Remove duplicate search results
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

      setMessage("Could not find that place.");
    } finally {
      setSearchingCity(false);
    }
  }

  // ==========================================
  // 3. SELECT SEARCH RESULT
  // IMPORTANT:
  // DO NOT CREATE A PLACE HERE
  // ==========================================

  function selectSearchResult(result: SearchResult) {
    setMessage("");

    /*
     * First check whether this search result matches
     * an existing place.
     *
     * We use both:
     *
     * 1. city + country
     * 2. geographic distance
     *
     * The distance check helps prevent:
     *
     * Nanjing
     * 南京
     *
     * from becoming two different places.
     */

    const existingPlace = places.find((place) => {
      const sameName =
        place.city.toLowerCase() ===
          result.city.toLowerCase() &&
        place.country.toLowerCase() ===
          result.country.toLowerCase();

      if (sameName) {
        return true;
      }

      if (
        place.latitude === undefined ||
        place.longitude === undefined
      ) {
        return false;
      }

      const distance = distanceBetweenPlaces(
        place.latitude,
        place.longitude,
        result.latitude,
        result.longitude
      );

      /*
       * Less than 20 km = treat as the same place.
       *
       * This is especially useful for:
       * Nanjing / 南京
       * Santiago / Santiago de Chile
       * Beijing / 北京
       */
      return distance < 20;
    });

    if (existingPlace) {
      setPlaceId(existingPlace.id);
      setSelectedSearchPlace(null);

      setCitySearch("");
      setSearchResults([]);

      setMessage(
        `${existingPlace.city}, ${existingPlace.country} selected ✨`
      );

      return;
    }

    /*
     * This is a NEW place.
     *
     * We only store it in React state.
     *
     * NOTHING is inserted into Supabase yet.
     */

    setPlaceId("");

    setSelectedSearchPlace(result);

    setCitySearch("");
    setSearchResults([]);

    setMessage(
      `${result.city}, ${result.country} selected ✨`
    );
  }

  // ==========================================
  // 4. SAVE JOURNAL + PHOTOS
  // ==========================================

  async function saveMemory() {
    // ==========================================
    // VALIDATION
    // ==========================================

    const missingFields: string[] = [];

    if (!placeId && !selectedSearchPlace) {
      missingFields.push("Place");
    }

    if (!title.trim()) {
      missingFields.push("Title");
    }

    if (!content.trim()) {
      missingFields.push("Your story");
    }

    if (missingFields.length > 0) {
      setMessage(
        `Please fill in: ${missingFields.join(", ")}.`
      );

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
    // RESOLVE PLACE
    // ==========================================

    let finalPlaceId = placeId;
    let createdNewPlace = false;

    /*
     * If user selected an existing place,
     * use it directly.
     */

    if (!finalPlaceId && selectedSearchPlace) {
      const result = selectedSearchPlace;

      /*
       * Before creating a new place, check the database
       * again.
       *
       * This protects against duplicates if the user
       * searched for the same city in another language.
       */

      const { data: existingPlaces, error: placesError } =
        await supabase
          .from("places")
          .select(
            "id, city, country, latitude, longitude"
          )
          .eq("user_id", user.id);

      if (placesError) {
        console.error(
          "CHECK EXISTING PLACES ERROR:",
          placesError
        );

        setMessage(
          `Could not check places: ${placesError.message}`
        );

        setSaving(false);
        return;
      }

      const existingPlace = (
        existingPlaces ?? []
      ).find((place: Place) => {
        const sameName =
          place.city.toLowerCase() ===
            result.city.toLowerCase() &&
          place.country.toLowerCase() ===
            result.country.toLowerCase();

        if (sameName) {
          return true;
        }

        if (
          place.latitude === undefined ||
          place.longitude === undefined
        ) {
          return false;
        }

        const distance = distanceBetweenPlaces(
          place.latitude,
          place.longitude,
          result.latitude,
          result.longitude
        );

        return distance < 20;
      });

      if (existingPlace) {
        /*
         * Reuse existing place.
         */

        finalPlaceId = existingPlace.id;

        setPlaceId(existingPlace.id);

        setPlaces((current) => {
          const alreadyExists = current.some(
            (place) =>
              place.id === existingPlace.id
          );

          return alreadyExists
            ? current
            : [...current, existingPlace];
        });
      } else {
        /*
         * NEW PLACE
         *
         * This is the ONLY point where we create
         * a row in the places table.
         *
         * Therefore:
         *
         * SEARCH ≠ CREATE PLACE
         *
         * SAVE MEMORY = CREATE PLACE
         */

        const { data: newPlace, error: placeError } =
          await supabase
            .from("places")
            .insert({
              user_id: user.id,
              city: result.city,
              country: result.country,
              latitude: result.latitude,
              longitude: result.longitude,
            })
            .select()
            .single();

        if (placeError || !newPlace) {
          console.error(
            "CREATE PLACE ERROR:",
            placeError
          );

          setMessage(
            `Place could not be saved: ${
              placeError?.message ??
              "Unknown error"
            }`
          );

          setSaving(false);
          return;
        }

        finalPlaceId = newPlace.id;
        createdNewPlace = true;

        setPlaces((current) => [
          ...current,
          newPlace,
        ]);

        setPlaceId(newPlace.id);
      }
    }

    // ==========================================
    // SAFETY CHECK
    // ==========================================

    if (!finalPlaceId) {
      setMessage("Please select a Place.");
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
        place_id: finalPlaceId,
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

      /*
       * If this was a brand-new place and the journal
       * failed, remove the place again.
       *
       * This prevents an empty/orphan place from being
       * left in the database.
       */

      if (createdNewPlace) {
        const { error: deletePlaceError } =
          await supabase
            .from("places")
            .delete()
            .eq("id", finalPlaceId);

        if (deletePlaceError) {
          console.error(
            "ROLLBACK PLACE ERROR:",
            deletePlaceError
          );
        }

        setPlaces((current) =>
          current.filter(
            (place) =>
              place.id !== finalPlaceId
          )
        );
      }

      setMessage(
        `Journal could not be saved: ${
          journalError?.message ??
          "Unknown error"
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

    const uploadedFilePaths: string[] = [];

    for (const photo of photos) {
      const extension =
        photo.name.split(".").pop()?.toLowerCase() ||
        "jpg";

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

        /*
         * Clean up already uploaded files.
         */

        if (uploadedFilePaths.length > 0) {
          const { error: removeError } =
            await supabase.storage
              .from("photos")
              .remove(uploadedFilePaths);

          if (removeError) {
            console.error(
              "STORAGE ROLLBACK ERROR:",
              removeError
            );
          }
        }

        /*
         * Delete journal because memory wasn't
         * successfully saved.
         */

        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        /*
         * Delete newly created place.
         */

        if (createdNewPlace) {
          await supabase
            .from("places")
            .delete()
            .eq("id", finalPlaceId);

          setPlaces((current) =>
            current.filter(
              (place) =>
                place.id !== finalPlaceId
            )
          );
        }

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

      uploadedFilePaths.push(filePath);

      // ==========================================
      // CREATE PUBLIC URL
      // ==========================================

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      if (!publicUrl) {
        setMessage(
          "Photo uploaded, but the public URL could not be created."
        );

        setSaving(false);
        return;
      }

      photoRows.push({
        place_id: finalPlaceId,
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

        /*
         * Remove uploaded files.
         */

        if (uploadedFilePaths.length > 0) {
          const { error: removeError } =
            await supabase.storage
              .from("photos")
              .remove(uploadedFilePaths);

          if (removeError) {
            console.error(
              "STORAGE ROLLBACK ERROR:",
              removeError
            );
          }
        }

        /*
         * Delete journal.
         */

        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        /*
         * Delete newly created place.
         */

        if (createdNewPlace) {
          await supabase
            .from("places")
            .delete()
            .eq("id", finalPlaceId);

          setPlaces((current) =>
            current.filter(
              (place) =>
                place.id !== finalPlaceId
            )
          );
        }

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
    setSelectedSearchPlace(null);
    setPhotos([]);
    setCitySearch("");
    setSearchResults([]);

    setMessage(
      photos.length > 0
        ? `Memory saved ✨ ${photos.length} photo${
            photos.length > 1 ? "s" : ""
          } added.`
        : "Memory saved ✨"
    );

    setSaving(false);

    // Return to homepage
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

        {/* ==========================================
            PLACE
        ========================================== */}

        <div className="mt-12">

          <label className="text-sm text-white/60">
            Place
          </label>

          {/* SEARCH */}

          <div className="mt-3">

            <div className="flex gap-3">

              <input
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);

                  /*
                   * If user starts typing again,
                   * remove previous temporary selection.
                   */

                  if (selectedSearchPlace) {
                    setSelectedSearchPlace(null);
                  }

                  if (placeId) {
                    setPlaceId("");
                  }

                  setSearchResults([]);
                  setMessage("");
                }}
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
                disabled={
                  searchingCity ||
                  !citySearch.trim()
                }
                className="rounded-2xl bg-white px-5 py-4 text-sm text-black transition hover:bg-white/80 disabled:opacity-50"
              >
                {searchingCity
                  ? "Searching..."
                  : "Search"}
              </button>

            </div>

            {/* SEARCH RESULTS */}

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

          {/* ==========================================
              CURRENTLY SELECTED SEARCH PLACE
          ========================================== */}

          {selectedSearchPlace && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">

              <div className="text-xs uppercase tracking-widest text-white/30">
                Selected place
              </div>

              <div className="mt-2 text-white">
                {selectedSearchPlace.city},{" "}
                {selectedSearchPlace.country}
              </div>

              <div className="mt-1 text-xs text-white/30">
                This place will be added to your records
                only when you save this memory.
              </div>

            </div>
          )}

          {/* EXISTING PLACES */}

          <div className="mt-4">

            <label className="text-xs text-white/30">
              Or choose an existing place
            </label>

            <select
              value={placeId}
              onChange={(e) => {
                setPlaceId(e.target.value);
                setSelectedSearchPlace(null);
                setCitySearch("");
                setSearchResults([]);
                setMessage("");
              }}
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

        {/* ==========================================
            TITLE
        ========================================== */}

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

        {/* ==========================================
            CONTENT
        ========================================== */}

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

        {/* ==========================================
            PHOTOS
        ========================================== */}

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

          {/* SELECTED PHOTOS */}

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
              ))}

            </div>
          )}

        </div>

        {/* ==========================================
            SAVE
        ========================================== */}

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

        {/* ==========================================
            MESSAGE
        ========================================== */}

        {message && (
          <p className="mt-6 text-center text-sm text-white/60">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}