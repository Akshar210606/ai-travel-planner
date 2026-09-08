import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Itinerary from "@/components/Itinerary";
import { TripSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function SavedTrip({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("trips")
    .select("data, budget, created_at")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const parsed = TripSchema.safeParse(data.data);
  if (!parsed.success) notFound();

  const saved = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data.created_at));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-6">
        <Link
          href="/trips"
          className="text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          All trips
        </Link>
        <span className="text-sm text-neutral-500">Saved {saved}</span>
      </div>

      <Itinerary trip={parsed.data} budget={Number(data.budget)} />
    </div>
  );
}