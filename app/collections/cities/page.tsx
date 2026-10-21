
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Place = {
  id: string;
  city: string;
  country: string;
  description?: string | null;
};

type Journal = {
  id: string;
  place_id: string;
};

type Photo = {
  id: string;
  place_id: string;
  url: string;
};

export default async function CitiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/login"
            className="text-sm text-white/40 transition hover:text-white"
          >
            Please log in to view your cities →
          </Link>
        </div>
      </main>
    );
  }

  const [
    { data: places, error: placesError },
    { data: journals, error: journalsError },
    { data: photos, error: photosError },
  ] = await Promise.all([
    supabase
      .from("places")
      .select("id, city, country, description")
      .eq("user_id", user.id)
      .order("city", { ascending: true }),

    supabase
      .from("journals")
      .select("id, place_id")
      .eq("user_id", user.id),

    supabase
      .from("photos")
      .select("id, place_id, url")
      .order("created_at", { ascending: false }),
  ]);

  if (placesError) console.error("PLACES ERROR:", placesError);
  if (journalsError) console.error("JOURNALS ERROR:", journalsError);
  if (photosError) console.error("PHOTOS ERROR:", photosError);

  const placeList: Place[] = places ?? [];
  const journalList: Journal[] = journals ?? [];
  const photoList: Photo[] = photos ?? [];

  const journalCountByPlace = new Map<string, number>();
  for (const journal of journalList) {
    journalCountByPlace.set(
      journal.place_id,
      (journalCountByPlace.get(journal.place_id) ?? 0) + 1
    );
  }

  const photoCountByPlace = new Map<string, number>();
  for (const photo of photoList) {
    photoCountByPlace.set(
      photo.place_id,
      (photoCountByPlace.get(photo.place_id) ?? 0) + 1
    );
  }

  const countryCount = new Set(
    placeList.map((place) => place.country)
  ).size;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <Link
          href="/"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Back to the world
        </Link>

        <header className="mt-16">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Places I have been
          </p>

          <h1 className="mt-4 text-6xl font-light md:text-8xl">
            Cities
          </h1>

          <p className="mt-5 text-sm text-white/40">
            {placeList.length}{" "}
            {placeList.length === 1 ? "city" : "cities"} across{" "}
            {countryCount}{" "}
            {countryCount === 1 ? "country" : "countries"}.
          </p>
        </header>

        <nav className="mt-12 flex flex-wrap gap-3 text-sm">
          <Link
            href="/collections/countries"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Countries
          </Link>

          <span className="rounded-full border border-white/30 px-4 py-2 text-white">
            Cities
          </span>

          <Link
            href="/collections/memories"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Memories
          </Link>
        </nav>

        {placeList.length > 0 ? (
          <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {placeList.map((place) => {
              const journalCount =
                journalCountByPlace.get(place.id) ?? 0;

              const photoCount =
                photoCountByPlace.get(place.id) ?? 0;

              return (
                <Link
                  key={place.id}
                  href={`/places/${place.id}`}
                  className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/30">
                        {place.country}
                      </p>

                      <h2 className="mt-3 text-3xl font-light transition group-hover:text-white/80">
                        {place.city}
                      </h2>
                    </div>

                    <span className="text-white/30 transition group-hover:translate-x-1 group-hover:text-white">
                      ↗
                    </span>
                  </div>

                  {place.description && (
                    <p className="mt-4 line-clamp-2 text-sm leading-7 text-white/40">
                      {place.description}
                    </p>
                  )}

                  <div className="mt-8 flex gap-6 border-t border-white/10 pt-5 text-xs text-white/40">
                    <span>
                      {journalCount}{" "}
                      {journalCount === 1 ? "memory" : "memories"}
                    </span>

                    <span>
                      {photoCount}{" "}
                      {photoCount === 1 ? "photo" : "photos"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="mt-12 rounded-3xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-white/40">
              Your journey starts with one place.
            </p>

            <Link
              href="/add"
              className="mt-5 inline-block text-sm text-white/70 underline underline-offset-4 transition hover:text-white"
            >
              Add your first place →
            </Link>
          </section>
        )}

        <footer className="mt-24 border-t border-white/10 pt-8 text-center text-xs tracking-widest text-white/20">
          THE WORLD OF MINE · PLACES THAT STAY
        </footer>
      </div>
    </main>
  );
}
