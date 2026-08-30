import Globe from "@/components/Globe";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  // ==========================================
  // 1. GET CURRENT USER
  // ==========================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // 2. GET USER PROFILE
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
  // 3. LOAD PLACES
  // ==========================================

  const { data: places, error } = await supabase
    .from("places")
    .select(`
      *,
      journals (
        id,
        title,
        content,
        created_at,
        photos (
          id,
          url,
          caption,
          created_at
        )
      )
    `);

  if (error) {
    console.error("Supabase error:", error);
  }

  const safePlaces = places ?? [];

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
  // 4. HOME PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ==========================================
          TOP RIGHT AUTH
      ========================================== */}

      <div className="fixed right-6 top-6 z-50">
        {user ? (
          <div className="flex items-center gap-3">

            {/* Username */}

            <div className="rounded-full border border-white/10 bg-black/70 px-5 py-2.5 text-sm backdrop-blur">
              @{username || "user"}
            </div>

            {/* Logout */}

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/60 transition hover:bg-white hover:text-black"
              >
                Log out
              </button>
            </form>

          </div>
        ) : (
          <div className="flex items-center gap-3">

            <a
              href="/login"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white hover:text-black"
            >
              Log in
            </a>

            <a
              href="/signup"
              className="rounded-full bg-white px-5 py-2.5 text-sm text-black transition hover:bg-white/80"
            >
              Sign up
            </a>

          </div>
        )}
      </div>

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