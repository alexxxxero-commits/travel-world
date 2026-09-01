"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";

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

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  namedetails?: {
    name?: string;
    "name:en"?: string;
    "name:zh"?: string;
    "name:es"?: string;
  };
};

// ==========================================
// DISTANCE
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
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

// ==========================================
// NORMALIZE CITY NAME
// ==========================================

function getEnglishCity(
  item: NominatimResult
): string {
  const address = item.address;
  const names = item.namedetails;

  // Best option: explicit English name
  if (names?.["name:en"]) {
    return names["name:en"];
  }

  const city =
    address?.city ||
    address?.town ||
    address?.municipality ||
    address?.village ||
    "";

  const chineseCityMap: Record<string, string> = {
    北京: "Beijing",
    上海: "Shanghai",
    南京: "Nanjing",
    杭州: "Hangzhou",
    苏州: "Suzhou",
    成都: "Chengdu",
    重庆: "Chongqing",
    西安: "Xi'an",
    武汉: "Wuhan",
    广州: "Guangzhou",
    深圳: "Shenzhen",
    天津: "Tianjin",
    厦门: "Xiamen",
    青岛: "Qingdao",
    大连: "Dalian",
    沈阳: "Shenyang",
    长沙: "Changsha",
    郑州: "Zhengzhou",
    济南: "Jinan",
    福州: "Fuzhou",
    昆明: "Kunming",
    哈尔滨: "Harbin",
    台北: "Taipei",
    高雄: "Kaohsiung",
    澳门: "Macau",
    香港: "Hong Kong",
  };

  if (chineseCityMap[city]) {
    return chineseCityMap[city];
  }

  return city;
}

// ==========================================
// NORMALIZE COUNTRY NAME
// ==========================================

function getEnglishCountry(
  item: NominatimResult
): string {
  const country = item.address?.country || "";

  const countryMap: Record<string, string> = {
    中国: "China",
    台湾: "Taiwan",
    智利: "Chile",
    美国: "United States",
    英国: "United Kingdom",
    法国: "France",
    德国: "Germany",
    西班牙: "Spain",
    意大利: "Italy",
    葡萄牙: "Portugal",
    日本: "Japan",
    韩国: "South Korea",
    泰国: "Thailand",
    越南: "Vietnam",
    新加坡: "Singapore",
    澳大利亚: "Australia",
    加拿大: "Canada",
    墨西哥: "Mexico",
    阿根廷: "Argentina",
    巴西: "Brazil",
    秘鲁: "Peru",
    玻利维亚: "Bolivia",
    哥伦比亚: "Colombia",
    委内瑞拉: "Venezuela",
    乌拉圭: "Uruguay",
    巴拉圭: "Paraguay",
    厄瓜多尔: "Ecuador",
    古巴: "Cuba",
    摩洛哥: "Morocco",
    印度: "India",
  };

  if (countryMap[country]) {
    return countryMap[country];
  }

  return country;
}

export default function AddMemory() {
  const supabase = createClient();
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>([]);

  // Existing place selected from database
  const [placeId, setPlaceId] = useState("");

  // Temporary search result
  const [selectedSearchPlace, setSelectedSearchPlace] =
    useState<SearchResult | null>(null);

  const [citySearch, setCitySearch] = useState("");
  const [searchingCity, setSearchingCity] =
    useState(false);

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);

  // ==========================================
  // VOICE JOURNAL
  // ==========================================

  const [voiceFile, setVoiceFile] =
    useState<File | null>(null);

  const [voiceDuration, setVoiceDuration] =
    useState(0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // LOAD EXISTING PLACES
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

      // Only load places that have journals.
      const {
        data: journals,
        error: journalsError,
      } = await supabase
        .from("journals")
        .select("place_id")
        .eq("user_id", user.id);

      if (journalsError) {
        console.error(
          "LOAD JOURNALS ERROR:",
          journalsError
        );

        setMessage(
          `Could not load memories: ${journalsError.message}`
        );

        return;
      }

      const placeIds = Array.from(
        new Set(
          (journals ?? [])
            .map((journal) => journal.place_id)
            .filter(Boolean)
        )
      );

      if (placeIds.length === 0) {
        setPlaces([]);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("places")
        .select(
          "id, city, country, latitude, longitude"
        )
        .eq("user_id", user.id)
        .in("id", placeIds)
        .order("city");

      if (error) {
        console.error(
          "LOAD PLACES ERROR:",
          error
        );

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
  // SEARCH CITY
  // ==========================================

  const searchCity = useCallback(
    async (query?: string) => {
      const searchText =
        query !== undefined
          ? query.trim()
          : citySearch.trim();

      if (!searchText) {
        setSearchResults([]);
        return;
      }

      setSearchingCity(true);

      try {
        const url =
          "https://nominatim.openstreetmap.org/search" +
          `?format=jsonv2` +
          `&addressdetails=1` +
          `&namedetails=1` +
          `&accept-language=en` +
          `&limit=10` +
          `&q=${encodeURIComponent(searchText)}`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("City search failed");
        }

        const data: NominatimResult[] =
          await response.json();

        const results: SearchResult[] = data
          .map((item) => ({
            city: getEnglishCity(item),
            country: getEnglishCountry(item),
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }))
          .filter(
            (item) =>
              item.city &&
              item.country &&
              !Number.isNaN(item.latitude) &&
              !Number.isNaN(item.longitude)
          );

        // ==========================================
        // REMOVE DUPLICATES
        // ==========================================

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

        // ==========================================
        // SORT
        // Existing places first
        // ==========================================

        const sortedResults = [
          ...uniqueResults,
        ].sort((a, b) => {
          const aExisting = places.some((place) => {
            const sameName =
              place.city.toLowerCase() ===
                a.city.toLowerCase() &&
              place.country.toLowerCase() ===
                a.country.toLowerCase();

            if (sameName) {
              return true;
            }

            if (
              place.latitude === undefined ||
              place.longitude === undefined
            ) {
              return false;
            }

            return (
              distanceBetweenPlaces(
                place.latitude,
                place.longitude,
                a.latitude,
                a.longitude
              ) < 20
            );
          });

          const bExisting = places.some((place) => {
            const sameName =
              place.city.toLowerCase() ===
                b.city.toLowerCase() &&
              place.country.toLowerCase() ===
                b.country.toLowerCase();

            if (sameName) {
              return true;
            }

            if (
              place.latitude === undefined ||
              place.longitude === undefined
            ) {
              return false;
            }

            return (
              distanceBetweenPlaces(
                place.latitude,
                place.longitude,
                b.latitude,
                b.longitude
              ) < 20
            );
          });

          if (aExisting && !bExisting) {
            return -1;
          }

          if (!aExisting && bExisting) {
            return 1;
          }

          return a.city.localeCompare(b.city);
        });

        setSearchResults(sortedResults);

        if (sortedResults.length === 0) {
          setMessage("No places found.");
        } else {
          setMessage("");
        }
      } catch (error) {
        console.error(
          "CITY SEARCH ERROR:",
          error
        );

        setSearchResults([]);

        setMessage(
          "Could not find that place."
        );
      } finally {
        setSearchingCity(false);
      }
    },
    [citySearch, places]
  );

  // ==========================================
  // LIVE SEARCH
  // ==========================================

  useEffect(() => {
    const query = citySearch.trim();

    if (!query) {
      return;
    }

    const timer = setTimeout(() => {
      searchCity(query);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [citySearch, searchCity]);

  // ==========================================
  // SELECT SEARCH RESULT
  // ==========================================

  function selectSearchResult(
    result: SearchResult
  ) {
    setMessage("");

    // Check existing places first.
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

      const distance =
        distanceBetweenPlaces(
          place.latitude,
          place.longitude,
          result.latitude,
          result.longitude
        );

      return distance < 20;
    });

    // ==========================================
    // EXISTING PLACE
    // ==========================================

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

    // ==========================================
    // NEW PLACE
    // ==========================================

    setPlaceId("");
    setSelectedSearchPlace(result);
    setCitySearch("");
    setSearchResults([]);

    setMessage(
      `${result.city}, ${result.country} selected ✨`
    );
  }

  // ==========================================
  // SAVE MEMORY
  // ==========================================

  async function saveMemory() {
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

    if (!finalPlaceId && selectedSearchPlace) {
      const result = selectedSearchPlace;

      // Re-check database.
      const {
        data: existingPlaces,
        error: placesError,
      } = await supabase
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

        const distance =
          distanceBetweenPlaces(
            place.latitude,
            place.longitude,
            result.latitude,
            result.longitude
          );

        return distance < 20;
      });

      // ==========================================
      // REUSE EXISTING PLACE
      // ==========================================

      if (existingPlace) {
        finalPlaceId = existingPlace.id;

        setPlaceId(existingPlace.id);

        setPlaces((current) => {
          const alreadyExists =
            current.some(
              (place) =>
                place.id === existingPlace.id
            );

          return alreadyExists
            ? current
            : [...current, existingPlace];
        });
      }

      // ==========================================
      // CREATE NEW PLACE
      // ==========================================

      else {
        const {
          data: newPlace,
          error: placeError,
        } = await supabase
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
      setMessage(
        "Please select a Place."
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
        place_id: finalPlaceId,
        title: title.trim(),
        content: content.trim(),
      })
      .select()
      .single();

    // ==========================================
    // JOURNAL FAILED
    // ==========================================

    if (journalError || !journal) {
      console.error(
        "JOURNAL ERROR:",
        journalError
      );

      if (createdNewPlace) {
        const {
          error: deletePlaceError,
        } = await supabase
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
        photo.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

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

        // Remove already uploaded files
        if (uploadedFilePaths.length > 0) {
          const {
            error: removeError,
          } = await supabase.storage
            .from("photos")
            .remove(uploadedFilePaths);

          if (removeError) {
            console.error(
              "STORAGE ROLLBACK ERROR:",
              removeError
            );
          }
        }

        // Delete journal
        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        // Delete new place
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
      // PUBLIC URL
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

        // Remove uploaded files
        if (uploadedFilePaths.length > 0) {
          const {
            error: removeError,
          } = await supabase.storage
            .from("photos")
            .remove(uploadedFilePaths);

          if (removeError) {
            console.error(
              "STORAGE ROLLBACK ERROR:",
              removeError
            );
          }
        }

        // Delete journal
        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        // Delete new place
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
    // UPLOAD VOICE JOURNAL
    // ==========================================

    let uploadedVoicePath: string | null = null;

    if (voiceFile) {
      const extension =
        voiceFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "webm";

      const uniqueName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      uploadedVoicePath =
        `voices/${user.id}/${uniqueName}`;

      const {
        error: voiceUploadError,
      } = await supabase.storage
        .from("voice-journals")
        .upload(
          uploadedVoicePath,
          voiceFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              voiceFile.type || "audio/webm",
          }
        );

      if (voiceUploadError) {
        console.error(
          "VOICE UPLOAD ERROR:",
          voiceUploadError
        );

        // Remove uploaded voice file
        if (uploadedVoicePath) {
          const {
            error: removeVoiceError,
          } = await supabase.storage
            .from("voice-journals")
            .remove([uploadedVoicePath]);

          if (removeVoiceError) {
            console.error(
              "VOICE ROLLBACK ERROR:",
              removeVoiceError
            );
          }
        }

        // Remove uploaded photo files
        if (uploadedFilePaths.length > 0) {
          const {
            error: removePhotoError,
          } = await supabase.storage
            .from("photos")
            .remove(uploadedFilePaths);

          if (removePhotoError) {
            console.error(
              "PHOTO ROLLBACK ERROR:",
              removePhotoError
            );
          }
        }

        // Delete journal
        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        // Delete new place
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
          `Voice upload failed: ${voiceUploadError.message}`
        );

        setSaving(false);
        return;
      }

      console.log(
        "VOICE UPLOAD SUCCESS:",
        uploadedVoicePath
      );

      // ==========================================
      // SAVE VOICE JOURNAL RECORD
      // ==========================================

      const {
        data: voiceJournal,
        error: voiceInsertError,
      } = await supabase
        .from("voice_journals")
        .insert({
          user_id: user.id,
          place_id: finalPlaceId,
          journal_id: journal.id,
          storage_path: uploadedVoicePath,
          duration: voiceDuration,
        })
        .select()
        .single();

      if (voiceInsertError || !voiceJournal) {
        console.error(
          "VOICE JOURNAL INSERT ERROR:",
          voiceInsertError
        );

        // Remove voice file
        if (uploadedVoicePath) {
          const {
            error: removeVoiceError,
          } = await supabase.storage
            .from("voice-journals")
            .remove([uploadedVoicePath]);

          if (removeVoiceError) {
            console.error(
              "VOICE ROLLBACK ERROR:",
              removeVoiceError
            );
          }
        }

        // Remove photo files
        if (uploadedFilePaths.length > 0) {
          const {
            error: removePhotoError,
          } = await supabase.storage
            .from("photos")
            .remove(uploadedFilePaths);

          if (removePhotoError) {
            console.error(
              "PHOTO ROLLBACK ERROR:",
              removePhotoError
            );
          }
        }

        // Delete journal
        await supabase
          .from("journals")
          .delete()
          .eq("id", journal.id);

        // Delete new place
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
          `Voice journal could not be saved: ${
            voiceInsertError?.message ??
            "Unknown error"
          }`
        );

        setSaving(false);
        return;
      }

      console.log(
        "VOICE JOURNAL INSERTED:",
        voiceJournal
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

    // Clear voice state
    setVoiceFile(null);
    setVoiceDuration(0);

    setMessage(
      photos.length > 0 && voiceFile
        ? `Memory saved ✨ ${photos.length} photo${
            photos.length > 1 ? "s" : ""
          } and voice journal added.`
        : photos.length > 0
          ? `Memory saved ✨ ${photos.length} photo${
              photos.length > 1 ? "s" : ""
            } added.`
          : voiceFile
            ? "Memory saved ✨ Voice journal added."
            : "Memory saved ✨"
    );

    setSaving(false);

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
                  const value =
                    e.target.value;

                  setCitySearch(value);

                  if (selectedSearchPlace) {
                    setSelectedSearchPlace(null);
                  }

                  if (placeId) {
                    setPlaceId("");
                  }

                  setMessage("");

                  if (!value.trim()) {
                    setSearchResults([]);
                    setSearchingCity(false);
                  }
                }}
                placeholder="Search for a city..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-white/20"
              />

              <button
                type="button"
                onClick={() => searchCity()}
                disabled={
                  searchingCity ||
                  !citySearch.trim()
                }
                className="rounded-2xl bg-white px-5 py-4 text-sm text-black transition hover:bg-white/80 disabled:opacity-50"
              >
                {searchingCity
                  ? "..."
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
                        selectSearchResult(
                          result
                        )
                      }
                      className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                    >
                      <div className="text-white">
                        {result.city},{" "}
                        {result.country}
                      </div>

                      <div className="mt-1 text-xs text-white/30">
                        {result.latitude.toFixed(
                          4
                        )}
                        ,{" "}
                        {result.longitude.toFixed(
                          4
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* SELECTED SEARCH PLACE */}

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
                This place will be added to
                your records only when you
                save this memory.
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
                  {place.city},{" "}
                  {place.country}
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
            VOICE JOURNAL
        ========================================== */}

        <div className="mt-8">
          <label className="text-sm text-white/60">
            Voice Journal
          </label>

          <div className="mt-3">
            <VoiceRecorder
              onRecordingComplete={(
                file,
                duration
              ) => {
                setVoiceFile(file);
                setVoiceDuration(duration);
              }}
            />
          </div>
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
                const files =
                  Array.from(
                    e.target.files ?? []
                  );

                setPhotos(files);
              }}
            />
          </label>

          {/* SELECTED PHOTOS */}

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