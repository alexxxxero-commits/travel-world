import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL("/", request.url)
      );
    }

    console.error(
      "AUTH CONFIRM ERROR:",
      error
    );
  }

  return NextResponse.redirect(
    new URL("/login?error=auth", request.url)
  );
}