import Globe from "@/components/Globe";
import UserMenu from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("AUTH ERROR:", userError);
  }

  console.log("CURRENT USER:", user?.id);

  // ==========================================
  // 3. GET USER PROFILE
  // ==========================================

  let username = "";

  if (user) {
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);
    }

    username = profile?.username ?? "";
  }

  // ==========================================
  // 4. LOAD PLACES + JOURNALS + PHOTOS
  // ==========================================

  const { data: places, error: placesError } =
    await supabase
      .from("places")
      .select(`
        *,
        journals (
          id,
          title,
          content,
          created_at,
          user_id,
          photos (
            id,
            url,
            caption,
            created_at
          )
        )
      `)
      .order("city");

  if (placesError) {
    console.error("PLACES ERROR:", placesError);
  }

  const safePlaces = places ?? [];

  // ==========================================
  // 5. CALCULATE STATS
  // ==========================================

  const countryCount = new Set(
    safePlaces.map((place) => place.country)
  ).size;

  const cityCount = safePlaces.length;

  const memoryCount = safePlaces.reduce(
    (total, place) =>
      total + (place.journals?.length ?? 0),
    0
  );

  // ==========================================
  // 6. HOME PAGE
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
          <Globe places={safePlaces} />
        </div>

        {/* Stats */}

        <div className="flex justify-center gap-12 text-center text-sm text-white/50">

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

        {/* User info */}

        {user && (
          <p className="mt-8 text-sm text-white/30">
            Welcome back, @{username || "user"}
          </p>
        )}

        {/* Add Memory */}

        {user && (
          <a
            href="/add"
            className="mt-8 rounded-full border border-white/20 px-8 py-3 text-sm uppercase tracking-widest transition hover:bg-white hover:text-black"
          >
            Add Memory
          </a>
        )}

      </div>
    </main>
  );
}