
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
};

export default async function CountriesPage() {
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
            Please log in to view your countries →
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
      .order("country", { ascending: true }),

    supabase
      .from("journals")
      .select("id, place_id")
      .eq("user_id", user.id),

    supabase
      .from("photos")
      .select("id, place_id"),
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

  const countryMap = new Map<
    string,
    {
      places: Place[];
      memoryCount: number;
      photoCount: number;
    }
  >();

  for (const place of placeList) {
    const country = place.country || "Unknown";

    if (!countryMap.has(country)) {
      countryMap.set(country, {
        places: [],
        memoryCount: 0,
        photoCount: 0,
      });
    }

    const group = countryMap.get(country)!;

    group.places.push(place);
    group.memoryCount +=
      journalCountByPlace.get(place.id) ?? 0;
    group.photoCount +=
      photoCountByPlace.get(place.id) ?? 0;
  }

  const countries = Array.from(countryMap.entries()).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const totalMemories = journalList.length;

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
            A world of memories
          </p>

          <h1 className="mt-4 text-6xl font-light md:text-8xl">
            Countries
          </h1>

          <p className="mt-5 text-sm text-white/40">
            {countries.length}{" "}
            {countries.length === 1 ? "country" : "countries"},{" "}
            {placeList.length}{" "}
            {placeList.length === 1 ? "city" : "cities"},{" "}
            {totalMemories}{" "}
            {totalMemories === 1 ? "memory" : "memories"}.
          </p>
        </header>

        <nav className="mt-12 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-white/30 px-4 py-2 text-white">
            Countries
          </span>

          <Link
            href="/collections/cities"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Cities
          </Link>

          <Link
            href="/collections/memories"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Memories
          </Link>
        </nav>

        {countries.length > 0 ? (
          <section className="mt-12 space-y-6">
            {countries.map(([country, group]) => (
              <article
                key={country}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/30">
                      Places explored
                    </p>

                    <h2 className="mt-3 text-3xl font-light md:text-4xl">
                      {country}
                    </h2>
                  </div>

                  <p className="text-sm text-white/40">
                    {group.places.length}{" "}
                    {group.places.length === 1 ? "city" : "cities"}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/10 py-5">
                  <div>
                    <p className="text-2xl font-light">
                      {group.memoryCount}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Memories
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-light">
                      {group.photoCount}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Photos
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {group.places.map((place) => (
                    <Link
                      key={place.id}
                      href={`/places/${place.id}`}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      {place.city} ↗
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-12 rounded-3xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-white/40">
              Every journey starts somewhere.
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
          THE WORLD OF MINE · A WORLD TO REMEMBER
        </footer>
      </div>
    </main>
  );
}
