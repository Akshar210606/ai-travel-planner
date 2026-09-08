import { createClient } from "@/lib/supabase/server";
import { TripSchema } from "@/lib/schema";
import { z } from "zod";

const SaveSchema = z.object({
  trip: TripSchema,
  budget: z.number().positive(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Sign in to save trips" }, { status: 401 });
  }

  const parsed = SaveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid trip" }, { status: 400 });
  }

  const { trip, budget } = parsed.data;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      destination: trip.destination,
      days: trip.days.length,
      budget,
      currency: trip.currency,
      data: trip,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save failed:", error.message);
    return Response.json({ error: "Could not save trip" }, { status: 500 });
  }

  return Response.json({ id: data.id });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ trips: [] });

  const { data, error } = await supabase
    .from("trips")
    .select("id, destination, days, budget, currency, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List failed:", error.message);
    return Response.json({ error: "Could not load trips" }, { status: 500 });
  }

  return Response.json({ trips: data });
}