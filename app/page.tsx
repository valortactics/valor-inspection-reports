import { supabase } from "../lib/supabase";

export default async function HomePage() {
  const { data, error } = await supabase
    .from("reports")
    .select("*");

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-10 text-[#252b2e]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 inline-flex rounded-full border border-[#b9a16a] bg-[#252b2e] px-5 py-2 text-sm tracking-[0.3em] text-[#d8c995]">
          VALOR HOME INSPECTIONS
        </div>

        <h1 className="font-serif text-5xl leading-tight md:text-7xl">
          Interactive Home Inspection Reports
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#394146]">
          Mobile-first inspection reporting with expandable photos,
          client-friendly navigation, and modern web-based presentation.
        </p>

        <div className="mt-10 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">
            Supabase Connection Test
          </h2>

          {error ? (
            <pre className="overflow-auto rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {JSON.stringify(error, null, 2)}
            </pre>
          ) : (
            <pre className="overflow-auto rounded-xl bg-stone-100 p-4 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}

