
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Journal = {
  id: string;
  place_id: string;
  title: string;
  content: string;
  created_at: string;
};

type Place = {
  id: string;
  city: string;
  country: string;
};

type Photo = {
  id: string;
  journal_id: string | null;
  url: string;
  caption: string | null;
};

export default async function MemoriesPage() {
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
            className="text-sm text-white/40 hover:text-white"
          >
            Please log in to view your memories →
          </Link>
        </div>
      </main>
    );
  }

  const [
    { data: journals, error: journalError },
    { data: places, error: placeError },
    { data: photos, error: photoError },
  ] = await Promise.all([
    supabase
      .from("journals")
      .select("id, place_id, title, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("places")
      .select("id, city, country")
      .eq("user_id", user.id),

    supabase
      .from("photos")
      .select("id, journal_id, url, caption")
      .order("created_at", { ascending: false }),
  ]);

  if (journalError) console.error("JOURNALS ERROR:", journalError);
  if (placeError) console.error("PLACES ERROR:", placeError);
  if (photoError) console.error("PHOTOS ERROR:", photoError);

  const journalList: Journal[] = journals ?? [];
  const placeList: Place[] = places ?? [];
  const photoList: Photo[] = photos ?? [];

  const placeMap = new Map(
    placeList.map((place) => [place.id, place])
  );

  const photosByJournal = new Map<string, Photo[]>();

  for (const photo of photoList) {
    if (!photo.journal_id) continue;

    const existing = photosByJournal.get(photo.journal_id) ?? [];
    existing.push(photo);
    photosByJournal.set(photo.journal_id, existing);
  }

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
            The archive of my life
          </p>

          <h1 className="mt-4 text-6xl font-light md:text-8xl">
            Memories
          </h1>

          <p className="mt-5 text-sm text-white/40">
            {journalList.length}{" "}
            {journalList.length === 1 ? "memory" : "memories"} collected
            across your journey.
          </p>
        </header>

        <div className="mt-12 flex flex-wrap gap-3 text-sm">
          <Link
            href="/collections/countries"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Countries
          </Link>

          <Link
            href="/collections/cities"
            className="rounded-full border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/40 hover:text-white"
          >
            Cities
          </Link>

          <span className="rounded-full border border-white/30 px-4 py-2 text-white">
            Memories
          </span>
        </div>

        {journalList.length > 0 ? (
          <section className="mt-12 space-y-6">
            {journalList.map((journal) => {
              const place = placeMap.get(journal.place_id);
              const journalPhotos =
                photosByJournal.get(journal.id) ?? [];

              return (
                <article
                  key={journal.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07] md:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-white/30">
                        {new Date(journal.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>

                      <h2 className="mt-3 text-2xl font-light md:text-3xl">
                        {journal.title}
                      </h2>

                      {place && (
                        <Link
                          href={`/places/${place.id}`}
                          className="mt-3 inline-block text-sm text-white/40 transition hover:text-white"
                        >
                          {place.city}, {place.country} ↗
                        </Link>
                      )}
                    </div>
                  </div>

                  {journalPhotos.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {journalPhotos.slice(0, 3).map((photo) => (
                        <div
                          key={photo.id}
                          className="overflow-hidden rounded-2xl"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption ?? journal.title}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-6 whitespace-pre-line text-sm leading-8 text-white/60">
                    {journal.content}
                  </p>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-12 rounded-3xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-white/40">
              Your story is just beginning.
            </p>

            <Link
              href="/add"
              className="mt-5 inline-block text-sm text-white/70 underline underline-offset-4 transition hover:text-white"
            >
              Write your first memory →
            </Link>
          </section>
        )}

        <footer className="mt-24 border-t border-white/10 pt-8 text-center text-xs tracking-widest text-white/20">
          THE WORLD OF MINE · A LIFE IN PLACES
        </footer>
      </div>
    </main>
  );
}
