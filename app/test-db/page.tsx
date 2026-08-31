import { createClient } from "@/lib/supabase/server";

export default async function TestDatabase() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("places")
    .select("*");

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>
          <h1 className="text-3xl">
            Database Error
          </h1>

          <pre className="mt-4 text-red-400">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-12 text-white">
      <h1 className="text-4xl font-light">
        Database Connected 🌎
      </h1>

      <p className="mt-4 text-white/50">
        Supabase returned:
      </p>

      <pre className="mt-8 rounded-2xl bg-white/10 p-6">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}