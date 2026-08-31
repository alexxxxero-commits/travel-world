import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const supabase = await createClient();

  const { id } = await params;

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "You must be logged in.",
      },
      {
        status: 401,
      }
    );
  }

  // ==========================================
  // GET JOURNAL
  // ==========================================

  const {
    data: journal,
    error: journalError,
  } = await supabase
    .from("journals")
    .select("id, place_id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (journalError || !journal) {
    return NextResponse.json(
      {
        error: "Memory not found.",
      },
      {
        status: 404,
      }
    );
  }

  // ==========================================
  // GET PHOTOS
  // ==========================================

  const {
    data: photos,
    error: photosError,
  } = await supabase
    .from("photos")
    .select("id, url")
    .eq("journal_id", journal.id);

  if (photosError) {
    console.error(
      "GET JOURNAL PHOTOS ERROR:",
      photosError
    );

    return NextResponse.json(
      {
        error: photosError.message,
      },
      {
        status: 500,
      }
    );
  }

  // ==========================================
  // REMOVE STORAGE FILES
  // ==========================================

  const storagePaths: string[] = [];

  for (const photo of photos ?? []) {
    const marker = "/storage/v1/object/public/photos/";

    const index = photo.url.indexOf(marker);

    if (index !== -1) {
      const path = photo.url.slice(
        index + marker.length
      );

      if (path) {
        storagePaths.push(path);
      }
    }
  }

  if (storagePaths.length > 0) {
    const {
      error: storageError,
    } = await supabase.storage
      .from("photos")
      .remove(storagePaths);

    if (storageError) {
      console.error(
        "DELETE STORAGE FILES ERROR:",
        storageError
      );

      // We don't stop here.
      // Database cleanup can still continue.
    }
  }

  // ==========================================
  // DELETE PHOTO DATABASE RECORDS
  // ==========================================

  const { error: photoDeleteError } =
    await supabase
      .from("photos")
      .delete()
      .eq("journal_id", journal.id);

  if (photoDeleteError) {
    console.error(
      "DELETE PHOTO RECORDS ERROR:",
      photoDeleteError
    );

    return NextResponse.json(
      {
        error: photoDeleteError.message,
      },
      {
        status: 500,
      }
    );
  }

  // ==========================================
  // DELETE JOURNAL
  // ==========================================

  const { error: deleteJournalError } =
    await supabase
      .from("journals")
      .delete()
      .eq("id", journal.id)
      .eq("user_id", user.id);

  if (deleteJournalError) {
    console.error(
      "DELETE JOURNAL ERROR:",
      deleteJournalError
    );

    return NextResponse.json(
      {
        error: deleteJournalError.message,
      },
      {
        status: 500,
      }
    );
  }

  // ==========================================
  // CHECK WHETHER PLACE IS NOW EMPTY
  // ==========================================

  const {
    data: remainingJournals,
    error: remainingError,
  } = await supabase
    .from("journals")
    .select("id")
    .eq("place_id", journal.place_id)
    .eq("user_id", user.id)
    .limit(1);

  if (!remainingError && !remainingJournals?.length) {
    // No memories remain in this place.
    // Remove the place too.

    const { error: placeDeleteError } =
      await supabase
        .from("places")
        .delete()
        .eq("id", journal.place_id)
        .eq("user_id", user.id);

    if (placeDeleteError) {
      console.error(
        "DELETE EMPTY PLACE ERROR:",
        placeDeleteError
      );
    }
  }

  // ==========================================
  // SUCCESS
  // ==========================================

  return NextResponse.json({
    success: true,
  });
}