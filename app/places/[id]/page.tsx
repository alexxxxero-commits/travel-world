import { supabase } from "@/lib/supabase";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
  place_id: string;
  title: string;
  content: string;
  created_at: string;
};

export default async function PlacePage({
  params,
}: PageProps) {
  const { id } = await params;

  // ==========================================
  // 1. GET PLACE
  // ==========================================

  const {
    data: place,
    error: placeError,
  } = await supabase
    .from("places")
    .select("*")
    .eq("id", id)
    .single();

  // ==========================================
  // 2. GET JOURNALS
  // ==========================================

  const {
    data: journals,
    error: journalError,
  } = await supabase
    .from("journals")
    .select("*")
    .eq("place_id", id)
    .order("created_at", {
      ascending: false,
    });

  // ==========================================
  // 3. GET PHOTOS
  // ==========================================

  const {
    data: photos,
    error: photoError,
  } = await supabase
    .from("photos")
    .select("*")
    .eq("place_id", id)
    .order("created_at", {
      ascending: false,
    });

  // ==========================================
  // ERROR LOGGING
  // ==========================================

  if (placeError) {
    console.error("PLACE ERROR:", placeError);
  }

  if (journalError) {
    console.error("JOURNAL ERROR:", journalError);
  }

  if (photoError) {
    console.error("PHOTO ERROR:", photoError);
  }

  // ==========================================
  // PLACE NOT FOUND
  // ==========================================

  if (!place) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-white/50">
          Place not found.
        </p>
      </main>
    );
  }

  const journalList: Journal[] = journals ?? [];
  const photoList: Photo[] = photos ?? [];

  // ==========================================
  // 4. GROUP PHOTOS BY JOURNAL
  // ==========================================

  const photosByJournal =
    photoList.reduce<Record<string, Photo[]>>(
      (acc, photo) => {
        if (!acc[photo.journal_id]) {
          acc[photo.journal_id] = [];
        }

        acc[photo.journal_id].push(photo);

        return acc;
      },
      {}
    );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-20">

        {/* ====================================== */}
        {/* BACK */}
        {/* ====================================== */}

        <a
          href="/"
          className="text-sm text-white/40 transition hover:text-white"
        >
          ← Back to the world
        </a>

        {/* ====================================== */}
        {/* HEADER */}
        {/* ====================================== */}

        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            My Journey
          </p>

          <h1 className="mt-4 text-6xl font-light md:text-8xl">
            {place.city}
          </h1>

          <p className="mt-3 text-xl text-white/40">
            {place.country}
          </p>

          {place.description && (
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60">
              {place.description}
            </p>
          )}
        </section>

        {/* ====================================== */}
        {/* STATS */}
        {/* ====================================== */}

        <section className="mt-12 grid grid-cols-3 gap-4">

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-light">
              {journalList.length}
            </p>

            <p className="mt-2 text-sm text-white/40">
              {journalList.length === 1
                ? "Journal"
                : "Journals"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-light">
              {photoList.length}
            </p>

            <p className="mt-2 text-sm text-white/40">
              {photoList.length === 1
                ? "Photo"
                : "Photos"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-3xl font-light">
              1
            </p>

            <p className="mt-2 text-sm text-white/40">
              City
            </p>
          </div>

        </section>

        {/* ====================================== */}
        {/* PHOTO GALLERY */}
        {/* ====================================== */}

        {photoList.length > 0 && (
          <section className="mt-20">

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                Visual memories
              </p>

              <h2 className="mt-3 text-3xl font-light">
                Photos
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">

              {photoList.map((photo) => (
                <div
                  key={photo.id}
                  className="group overflow-hidden rounded-2xl bg-white/5"
                >
                  <img
                    src={photo.url}
                    alt={
                      photo.caption ??
                      `${place.city} memory`
                    }
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  {photo.caption && (
                    <p className="p-3 text-xs text-white/40">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}

            </div>

          </section>
        )}

        {/* ====================================== */}
        {/* JOURNALS */}
        {/* ====================================== */}

        <section className="mt-24">

          <div className="flex items-end justify-between">

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                Memories
              </p>

              <h2 className="mt-3 text-3xl font-light">
                Journal
              </h2>
            </div>

            <a
              href="/add"
              className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest transition hover:bg-white hover:text-black"
            >
              + New
            </a>

          </div>

          {/* ==================================== */}
          {/* JOURNAL LIST */}
          {/* ==================================== */}

          <div className="mt-10 space-y-8">

            {journalList.length > 0 ? (

              journalList.map((journal) => {

                const journalPhotos =
                  photosByJournal[journal.id] ?? [];

                return (
                  <article
                    key={journal.id}
                    className="rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:bg-white/[0.08]"
                  >

                    {/* DATE */}

                    <p className="text-xs text-white/30">
                      {new Date(
                        journal.created_at
                      ).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>

                    {/* TITLE */}

                    <h3 className="mt-3 text-3xl font-light">
                      {journal.title}
                    </h3>

                    {/* PHOTOS */}

                    {journalPhotos.length > 0 && (
                      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

                        {journalPhotos.map(
                          (photo) => (
                            <img
                              key={photo.id}
                              src={photo.url}
                              alt={
                                photo.caption ??
                                journal.title
                              }
                              className="max-h-[500px] w-full rounded-2xl object-cover"
                            />
                          )
                        )}

                      </div>
                    )}

                    {/* CONTENT */}

                    <p className="mt-6 whitespace-pre-line text-sm leading-8 text-white/60">
                      {journal.content}
                    </p>

                  </article>
                );
              })

            ) : (

              <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">

                <p className="text-white/30">
                  No memories yet.
                </p>

                <a
                  href="/add"
                  className="mt-5 inline-block text-sm text-white/60 underline underline-offset-4"
                >
                  Write your first memory →
                </a>

              </div>

            )}

          </div>

        </section>

        {/* ====================================== */}
        {/* FOOTER */}
        {/* ====================================== */}

        <div className="mt-24 border-t border-white/10 pt-8 text-center text-xs tracking-widest text-white/20">
          THE WORLD OF MINE · {place.city.toUpperCase()}
        </div>

      </div>
    </main>
  );
}