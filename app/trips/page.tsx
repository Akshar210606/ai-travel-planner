import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dayColor } from "@/lib/colors";
import DeleteTrip from "@/components/DeleteTrip";

export const dynamic = "force-dynamic";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function savedOn(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function Trips() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Your trips
        </h1>
        <p className="mt-3 max-w-sm text-neutral-600">
          Sign in and every trip you plan gets kept here, with its map and prices.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: trips } = await supabase
    .from("trips")
    .select("id, destination, days, budget, currency, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Your trips
          </h1>
          {trips?.length ? (
            <p className="mt-1 text-neutral-500">
              {trips.length} saved
            </p>
          ) : null}
        </div>
        <Link
          href="/"
          className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
        >
          Plan a new trip
        </Link>
      </div>

      {!trips?.length ? (
        <div className="mt-16 rounded-lg border border-dashed border-neutral-300 px-8 py-16 text-center">
          <p className="text-lg font-medium text-neutral-900">
            No trips yet
          </p>
          <p className="mx-auto mt-2 max-w-xs text-neutral-600">
            Tell us a city and a budget, and we&apos;ll build you something to save.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white"
          >
            Plan your first trip
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="group block overflow-hidden rounded-lg border border-neutral-200 transition-colors hover:border-neutral-900"
              >
                <div className="flex h-1.5">
                  {Array.from({ length: t.days }).map((_, i) => (
                    <span
                      key={i}
                      className="flex-1"
                      style={{ background: dayColor(i + 1) }}
                    />
                  ))}
                </div>

                <div className="p-5">
                  <h2 className="text-lg font-medium capitalize text-neutral-900">
                    {t.destination}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t.days} {t.days === 1 ? "day" : "days"} ·{" "}
                    {money(Number(t.budget), t.currency)} budget
                  </p>
                  <p className="mt-4 text-sm text-neutral-400">
                    Saved {savedOn(t.created_at)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}