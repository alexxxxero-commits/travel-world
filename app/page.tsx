import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl">
        Server Auth Test
      </h1>

      <div className="mt-10 space-y-4 text-lg">
        <p>
          User:
          {" "}
          {user ? "LOGGED IN" : "NOT LOGGED IN"}
        </p>

        <p>
          User ID:
          {" "}
          {user?.id ?? "NULL"}
        </p>

        <p>
          Email:
          {" "}
          {user?.email ?? "NULL"}
        </p>

        <p>
          Auth Error:
          {" "}
          {userError?.message ?? "none"}
        </p>
      </div>
    </main>
  );
}