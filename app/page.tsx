import Globe from "@/components/Globe";
import UserMenu from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  // ==========================================
  // 1. CREATE SERVER SUPABASE CLIENT
  // ==========================================

  const supabase = await createSupabaseServerClient();

  // ==========================================
  // 2. GET CURRENT USER
  // ==========================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // 3. LOAD USER'S PLACES
  // ==========================================

  let places: any[] = [];

  if (user) {
    const { data, error } = await supabase
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
      places = data ?? [];
    }
  }

  // ==========================================
  // 4. LOAD USER'S JOURNALS
  // ==========================================

  let journals: any[] = [];

  if (user) {
    const { data, error } = await supabase
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
      journals = data ?? [];
    }
  }

  // ==========================================
  // 5. CONNECT JOURNALS TO PLACES
  // ==========================================

  const placesWithJournals = places.map(
    (place) => ({
      ...place,

      journals: journals.filter(
        (journal) =>
          journal.place_id === place.id
      ),
    })
  );

  // ==========================================
  // 6. CALCULATE STATS
  // ==========================================

  const countryCount = new Set(
    places.map((place) => place.country)
  ).size;

  const cityCount = places.length;

  const memoryCount = journals.length;

  // ==========================================
  // 7. HOME PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ==========================================
          TOP RIGHT USER MENU
      ========================================== */}

      <UserMenu />

      {/* ==========================================
          MAIN CONTENT
      ========================================== */}

      <div className="flex min-h-screen flex-col items-center px-6 py-20">

        {/* Header */}

        <p className="mb-6 text-sm uppercase tracking-[0.4em] text-white/50">
          My personal travel journal
        </p>

        <h1 className="text-center text-7xl font-light tracking-tight md:text-9xl">
          The World Of Mine
        </h1>

        <p className="mt-6 text-center text-lg text-white/60">
          A safe space of places, people and memories.
        </p>

        {/* Globe */}

        <div className="my-10 flex w-full justify-center">
          <Globe places={placesWithJournals} />
        </div>

        {/* Stats */}

        <div className="flex justify-center gap-12 text-center text-sm text-white/50">

          {/* Countries */}

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

          {/* Cities */}

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

          {/* Memories */}

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

        {/* Add Memory */}

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