import { generateTripPlan } from "@/lib/openai";
import { geocode, findPlace } from "@/lib/places";
import {
  TripSchema,
  type TripRequest,
  type Trip,
  type Stop,
  type Day,
} from "@/lib/schema";

/** Rough per-person meal cost by Google price level. */
const PRICE_LEVEL_COST: Record<number, number> = {
  0: 0, 1: 15, 2: 30, 3: 60, 4: 110,
};

const DINING = new Set(["restaurant", "cafe", "bar"]);

export type TripEvent =
  | {
      type: "meta";
      destination: string;
      summary: string;
      currency: string;
      startDate: string | null;
      totalDays: number;
    }
  | { type: "day"; day: Day }
  | { type: "done"; totalEstimatedCost: number }
  | { type: "error"; message: string };

/** Emits the trip piece by piece, so the UI can render as it arrives. */
export async function* streamTrip(req: TripRequest): AsyncGenerator<TripEvent> {
  const plan = await generateTripPlan(req);
  const cityCenter = await geocode(req.destination);

  yield {
    type: "meta",
    destination: req.destination,
    summary: plan.summary,
    currency: req.currency,
    startDate: req.startDate,
    totalDays: plan.days.length,
  };

  const used = new Set<string>();
  let total = 0;

  for (const day of plan.days) {
    const dayCenter =
      (await geocode(`${day.neighborhood}, ${req.destination}`)) ?? cityCenter;

    const weekday = weekdayFor(req.startDate, day.dayNumber);

    const stops: Stop[] = [];
    for (const stop of day.stops) {
      const place = await findPlace(stop.placeQuery, dayCenter, used);
      if (place) used.add(place.placeId);

      const closedOnDay =
        weekday !== null &&
        place?.openDays != null &&
        place.openDays.length > 0 &&
        !place.openDays.includes(weekday);

      const withPlace = { ...stop, place, closedOnDay };
      const finished = { ...withPlace, estimatedCost: realCost(withPlace) };
      total += finished.estimatedCost;
      stops.push(finished);
    }

    yield { type: "day", day: { ...day, stops } };
  }

  yield { type: "done", totalEstimatedCost: total };
}

/** Builds the whole trip at once. Used where a complete object is needed. */
export async function generateTrip(req: TripRequest): Promise<Trip> {
  const plan = await generateTripPlan(req);
  const cityCenter = await geocode(req.destination);

  const used = new Set<string>();
  const days = [];

  for (const day of plan.days) {
    const dayCenter =
      (await geocode(`${day.neighborhood}, ${req.destination}`)) ?? cityCenter;

    const weekday = weekdayFor(req.startDate, day.dayNumber);

    const stops: Stop[] = [];
    for (const stop of day.stops) {
      const place = await findPlace(stop.placeQuery, dayCenter, used);
      if (place) used.add(place.placeId);

      const closedOnDay =
        weekday !== null &&
        place?.openDays != null &&
        place.openDays.length > 0 &&
        !place.openDays.includes(weekday);

      const withPlace = { ...stop, place, closedOnDay };
      stops.push({ ...withPlace, estimatedCost: realCost(withPlace) });
    }

    days.push({ ...day, stops });
  }

  const totalEstimatedCost = days.reduce(
    (sum, day) => sum + day.stops.reduce((s, stop) => s + stop.estimatedCost, 0),
    0
  );

  return TripSchema.parse({
    destination: req.destination,
    days,
    startDate: req.startDate,
    summary: plan.summary,
    totalEstimatedCost,
    currency: req.currency,
  });
}

function realCost(stop: Stop): number {
  if (!DINING.has(stop.category) || stop.place?.priceLevel == null) {
    return stop.estimatedCost;
  }
  const fromLevel = PRICE_LEVEL_COST[stop.place.priceLevel] ?? stop.estimatedCost;
  // Trust Google's signal, but don't let it run away from the estimate.
  return Math.round((fromLevel + stop.estimatedCost) / 2);
}

/** Which weekday (0-6) does day N of the trip fall on? */
function weekdayFor(startDate: string | null, dayNumber: number): number | null {
  if (!startDate) return null;
  const d = new Date(startDate + "T12:00:00");
  d.setDate(d.getDate() + dayNumber - 1);
  return d.getDay();
}