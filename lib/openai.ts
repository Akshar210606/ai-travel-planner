import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { TripPlanSchema, type TripRequest, type TripPlan } from "@/lib/schema";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-5.6-luna";

const SYSTEM_PROMPT =
  "You are an experienced travel planner. You produce realistic, " +
  "well-paced itineraries. You never invent business names. " +
  "Never state totals or per-day costs in the summary — describe the trip only.";

const GROUP_NOTE = {
  solo: "Travelling alone. Favour places that are comfortable to visit solo.",
  couple: "Travelling as a couple.",
  family:
    "Travelling with children. Keep stops under two hours, avoid late nights, " +
    "and include places children actually enjoy.",
  friends:
    "Travelling as a group of friends. Favour shared plates, lively venues " +
    "and some nightlife.",
} as const;

function buildPrompt(req: TripRequest): string {
  const perDay = Math.floor(req.budget / req.days);
  const stopsPerDay = { relaxed: 3, balanced: 4, packed: 6 }[req.pace];

  const dietary = req.dietary.length
    ? `

DIETARY REQUIREMENTS — hard constraints, not preferences:
${req.dietary.join(", ")}.
Every food stop must comply. Put the requirement INSIDE the placeQuery,
for example "vegetarian Portuguese restaurant in Alfama Lisbon Portugal"
or "halal restaurant in Baixa Lisbon Portugal". Mentioning it only in the
description is not enough — it must be in the search text itself.`
    : "";

  const cuisines = req.cuisines.length
    ? `

Preferred cuisines: ${req.cuisines.join(", ")}. Work at least one into each
day, but keep some local food in the trip too.`
    : "";

  return `Plan a ${req.days}-day trip to ${req.destination}.

Budget: ${req.budget} ${req.currency} total, about ${perDay} ${req.currency} per day.
Interests: ${req.interests.join(", ")}.
Pace: ${req.pace} — aim for ${stopsPerDay} stops per day.
${GROUP_NOTE[req.group]}${dietary}${cuisines}

Rules:
- Each day must include lunch and dinner. Breakfast optional.
- List stops in chronological order within each day.
- Each day should stay in one neighborhood to minimise travel time.
- Do NOT name specific restaurants, cafes, bars or hotels. Write a
  placeQuery that a maps search would resolve, e.g. "seafood restaurant
  in Alfama Lisbon Portugal". Named landmarks and museums ARE allowed.
- Always include the city name in every placeQuery.
- Match the neighborhood in each placeQuery to that day's actual
  neighborhood.
- estimatedCost is per person in ${req.currency}. Use 0 for free things.
- Spend 70-90% of the ${perDay} ${req.currency} daily budget. Prefer
  well-regarded local places over the most expensive options.
- placeQuery must be plain and factual. Do NOT use words like "upscale",
  "fine dining", "high-quality", "best" or "authentic". Write what the
  place IS, not how good it is.`;
}

export async function generateTripPlan(req: TripRequest): Promise<TripPlan> {
  const response = await client.responses.parse({
    model: MODEL,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(req) },
    ],
    text: { format: zodTextFormat(TripPlanSchema, "trip_plan") },
  });

  if (response.status !== "completed") {
    throw new Error(`Generation did not complete: ${response.status}`);
  }

  const plan = response.output_parsed;
  if (!plan) throw new Error("Model returned no parsed output");

  if (plan.days.length !== req.days) {
    plan.days = plan.days.slice(0, req.days);
  }

  return plan;
}