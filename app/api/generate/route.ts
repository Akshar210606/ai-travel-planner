import { generateTrip } from "@/lib/generate";
import { TripRequestSchema } from "@/lib/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TripRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const trip = await generateTrip(parsed.data);
    return Response.json(trip);
  } catch (err) {
    console.error("Generation failed", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}