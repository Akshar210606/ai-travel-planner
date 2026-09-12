import { z } from "zod";

/* ---------- 0. Option lists, shared with the UI ---------- */

export const DIETARY = [
  "vegetarian", "vegan", "halal", "kosher",
  "no beef", "no pork", "gluten free",
] as const;

export const CUISINES = [
  "local", "indian", "chinese", "japanese", "italian",
  "thai", "middle eastern", "mexican", "korean",
] as const;

export const GROUPS = ["solo", "couple", "family", "friends"] as const;

/* ---------- 1. What the user asks for ---------- */

export const TripRequestSchema = z.object({
  destination: z.string().min(2).max(100),
  days: z.number().int().min(1).max(6),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  budget: z.number().positive(),
  currency: z.enum(["CAD", "USD", "EUR", "GBP"]),
  pace: z.enum(["relaxed", "balanced", "packed"]),
  interests: z.array(
    z.enum(["food", "history", "art", "nature", "nightlife", "shopping", "architecture"])
  ).min(1).max(5),
  group: z.enum(GROUPS).default("solo"),
  dietary: z.array(z.enum(DIETARY)).max(4).default([]),
  cuisines: z.array(z.enum(CUISINES)).max(3).default([]),
});

/* ---------- 2. What the model plans ---------- */

export const PlaceCategory = z.enum([
  "restaurant", "cafe", "bar", "museum",
  "attraction", "park", "viewpoint", "shopping",
]);

export const PlannedStopSchema = z.object({
  timeOfDay: z.enum(["morning", "afternoon", "evening"]),
  title: z.string(),
  description: z.string(),
  placeQuery: z.string(),
  category: PlaceCategory,
  estimatedCost: z.number(),
  durationMinutes: z.number(),
});

export const PlannedDaySchema = z.object({
  dayNumber: z.number(),
  theme: z.string(),
  neighborhood: z.string(),
  stops: z.array(PlannedStopSchema),
});

export const TripPlanSchema = z.object({
  summary: z.string(),
  days: z.array(PlannedDaySchema),
});

/* ---------- 3. What Google gives back ---------- */

export const ResolvedPlaceSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
  priceLevel: z.number().nullable(),
  photoRef: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  openDays: z.array(z.number()).nullable().default(null),
  hoursText: z.array(z.string()).nullable().default(null),
});

/* ---------- 4. The finished thing ---------- */

export const StopSchema = PlannedStopSchema.extend({
  place: ResolvedPlaceSchema.nullable(),
  closedOnDay: z.boolean().default(false),
});

export const DaySchema = PlannedDaySchema.omit({ stops: true }).extend({
  stops: z.array(StopSchema),
});

export const TripSchema = z.object({
  destination: z.string(),
  days: z.array(DaySchema),
  startDate: z.string().nullable().default(null),
  summary: z.string(),
  totalEstimatedCost: z.number(),
  currency: z.string(),
});

/* ---------- 5. Types, for free ---------- */

export type TripRequest = z.infer<typeof TripRequestSchema>;
export type TripPlan = z.infer<typeof TripPlanSchema>;
export type ResolvedPlace = z.infer<typeof ResolvedPlaceSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Trip = z.infer<typeof TripSchema>;