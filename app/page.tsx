import Link from "next/link";
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
   <main className="min-h-[100svh] bg-black text-white lg:h-[100svh] lg:overflow-hidden">
     <UserMenu />
 
     <div className="mx-auto flex min-h-[100svh] w-full max-w-[1800px] flex-col items-center px-4 py-8 sm:px-6 sm:py-10 lg:h-full lg:min-h-0 lg:px-10 lg:py-5">
       {/* HEADER */}
       <header className="flex w-full shrink-0 flex-col items-center pt-14 text-center sm:pt-10 lg:pt-0">
         <p className="mb-3 max-w-full px-2 text-[10px] uppercase tracking-[0.18em] text-white/50 sm:mb-4 sm:text-sm sm:tracking-[0.4em]">
           My personal travel journal
         </p>
 
         <h1 className="text-4xl font-light tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
           The World Of Mine
         </h1>
 
         <p className="mt-3 max-w-xl px-2 text-sm text-white/60 sm:mt-4 sm:text-base lg:text-lg">
           A safe space of places, people and memories.
         </p>
       </header>
 
       {/* GLOBE */}
       <div className="my-4 flex w-full flex-1 justify-center sm:my-6 lg:my-1 lg:min-h-0">
         <Globe places={placesWithJournals} />
       </div>
 
       {/* STATS */}
       <div className="flex w-full shrink-0 justify-center gap-8 text-center text-sm text-white/50 sm:gap-12 lg:gap-16">
         <Link
           href="/collections/countries"
           className="transition hover:text-white"
         >
           <p className="text-2xl font-light text-white sm:text-3xl">
             {countryCount}
           </p>
           <p className="mt-2">
             {countryCount === 1 ? "Country" : "Countries"}
           </p>
         </Link>
 
         <Link
           href="/collections/cities"
           className="transition hover:text-white"
         >
           <p className="text-2xl font-light text-white sm:text-3xl">
             {cityCount}
           </p>
           <p className="mt-2">
             {cityCount === 1 ? "City" : "Cities"}
           </p>
         </Link>
 
         <Link
           href="/collections/memories"
           className="transition hover:text-white"
         >
           <p className="text-2xl font-light text-white sm:text-3xl">
             {memoryCount}
           </p>
           <p className="mt-2">
             {memoryCount === 1 ? "Memory" : "Memories"}
           </p>
         </Link>
       </div>

       {/* ADD MEMORY */}
       {user && (
         <a
           href="/add"
           className="mt-8 shrink-0 rounded-full border border-white/20 px-7 py-3 text-xs uppercase tracking-widest transition hover:bg-white hover:text-black sm:mt-10 sm:text-sm lg:mt-6"
         >
           Add Memory
         </a>
       )}
     </div>
   </main>
 );

}