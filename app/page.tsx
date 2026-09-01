import Globe from "@/components/Globe";
import UserMenu from "@/components/UserMenu";
import { createClient } from "@/lib/supabase/server";

type Photo = {
  id: string;
  place_id: string;
  journal_id: string;
  url: string;
  caption: string | null;
  created_at: string;
};

type Journal = {
  id: string;
  user_id: string;
  place_id: string;
  title: string;
  content: string;
  created_at: string;
  photos: Photo[];
};

type Place = {
  id: string;
  user_id: string | null;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string | null;
  journals: Journal[];
};

export default async function Home() {
  // ==========================================
  // 1. CREATE SERVER SUPABASE CLIENT
  // ==========================================

  const supabase = await createClient();

  // ==========================================
  // 2. GET CURRENT USER
  // ==========================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("HOME USER:", user);
  console.log("HOME USER ERROR:", userError);

  // ==========================================
  // 3. LOAD USER'S PLACES
  // ==========================================

  let places: Place[] = [];

  if (user) {
    const {
      data,
      error,
    } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", user.id)
      .order("city");

    if (error) {
      console.error(
        "SUPABASE PLACES ERROR:",
        error
      );
    } else {
      places = (data ?? []).map((place) => ({
        ...place,
        journals: [],
      })) as Place[];
    }
  }

  // ==========================================
  // 4. LOAD USER'S JOURNALS
  // ==========================================

  let journals: Journal[] = [];

  if (user) {
    const {
      data,
      error,
    } = await supabase
      .from("journals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "SUPABASE JOURNALS ERROR:",
        error
      );
    } else {
      journals = (data ?? []).map((journal) => ({
        ...journal,
        photos: [],
      })) as Journal[];
    }
  }

  // ==========================================
  // 5. LOAD PHOTOS
  // ==========================================
  //
  // photos 表没有 user_id。
  // 所以先获取属于当前用户 journals 的照片。
  //

  let photos: Photo[] = [];

  if (user && journals.length > 0) {
    const journalIds = journals.map(
      (journal) => journal.id
    );

    const {
      data,
      error,
    } = await supabase
      .from("photos")
      .select("*")
      .in("journal_id", journalIds);

    if (error) {
      console.error(
        "SUPABASE PHOTOS ERROR:",
        error
      );
    } else {
      photos = (data ?? []) as Photo[];
    }
  }

  // ==========================================
  // 6. CONNECT PHOTOS → JOURNALS
  // ==========================================

  const journalsWithPhotos = journals.map(
    (journal) => ({
      ...journal,
      photos: photos.filter(
        (photo) =>
          photo.journal_id === journal.id
      ),
    })
  );

  // ==========================================
  // 7. CONNECT JOURNALS → PLACES
  // ==========================================

  const placesWithJournals =
    places.map((place) => ({
      ...place,
      journals:
        journalsWithPhotos.filter(
          (journal) =>
            journal.place_id === place.id
        ),
    }));

  // ==========================================
  // 8. CALCULATE STATS
  // ==========================================

  const countryCount = new Set(
    places.map(
      (place) => place.country
    )
  ).size;

  const cityCount = places.length;

  const memoryCount =
    journals.length;

  // ==========================================
  // 9. HOME PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-black text-white">
      {/* USER MENU */}
      <UserMenu />

      {/* MAIN CONTENT */}
      <div className="flex min-h-screen flex-col items-center px-6 py-20">
        {/* HEADER */}
        <p className="mb-6 text-sm uppercase tracking-[0.4em] text-white/50">
          My personal travel journal
        </p>

        <h1 className="text-center text-7xl font-light tracking-tight md:text-9xl">
          The World Of Mine
        </h1>

        <p className="mt-6 text-center text-lg text-white/60">
          A safe space of places, people and memories.
        </p>

        {/* GLOBE */}
        <div className="my-10 flex w-full justify-center">
          <Globe
            places={placesWithJournals}
          />
        </div>

        {/* STATS */}
        <div className="flex justify-center gap-12 text-center text-sm text-white/50">
          {/* COUNTRIES */}
          <div>
            <p className="text-3xl font-light text-white">
              {countryCount}
            </p>

            <p className="mt-2">
              {countryCount === 1
                ? "Country"
                : "Countries"}
            </p>
          </div>

          {/* CITIES */}
          <div>
            <p className="text-3xl font-light text-white">
              {cityCount}
            </p>

            <p className="mt-2">
              {cityCount === 1
                ? "City"
                : "Cities"}
            </p>
          </div>

          {/* MEMORIES */}
          <div>
            <p className="text-3xl font-light text-white">
              {memoryCount}
            </p>

            <p className="mt-2">
              {memoryCount === 1
                ? "Memory"
                : "Memories"}
            </p>
          </div>
        </div>

        {/* ADD MEMORY */}
        {user && (
          <a
            href="/add"
            className="mt-16 rounded-full border border-white/20 px-8 py-3 text-sm uppercase tracking-widest transition hover:bg-white hover:text-black"
          >
            Add Memory
          </a>
        )}
      </div>
    </main>
  );
}