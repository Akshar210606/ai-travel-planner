import { type ResolvedPlace } from "@/lib/schema";

const KEY = process.env.GOOGLE_MAPS_SERVER_KEY!;

const cache = new Map<string, Promise<ResolvedPlace[]>>();

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.photos",
  "places.googleMapsUri",
].join(",");

/** Turn a place name into coordinates, so searches stay local. */
export async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", KEY);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    console.error("Geocode error", data.status, data.error_message);
    return null;
  }

  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

/** Resolve a placeQuery, skipping any place already used in this trip. */
export function findPlace(
  query: string,
  center: { lat: number; lng: number } | null,
  exclude?: Set<string>
): Promise<ResolvedPlace | null> {
  const cacheKey = `${query}|${center?.lat ?? ""},${center?.lng ?? ""}`;

  let candidates = cache.get(cacheKey);
  if (!candidates) {
    candidates = fetchPlaces(query, center);
    cache.set(cacheKey, candidates);
  }

  return pickUnused(candidates, exclude);
}

async function pickUnused(
  candidates: Promise<ResolvedPlace[]>,
  exclude?: Set<string>
): Promise<ResolvedPlace | null> {
  const list = await candidates;
  const usable = list.filter(
    (p) => (p.ratingCount ?? 0) >= 20 && !exclude?.has(p.placeId)
  );
  return usable[0] ?? list.find((p) => !exclude?.has(p.placeId)) ?? list[0] ?? null;
}

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: { name: string }[];
  googleMapsUri?: string;
};

async function fetchPlaces(
  query: string,
  center: { lat: number; lng: number } | null
): Promise<ResolvedPlace[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 5,
  };

  if (center) {
    body.locationBias = {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: 3000,
      },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Places error", res.status, await res.text());
    return [];
  }

  const data = await res.json();
    const places: GooglePlace[] = data.places ?? [];

    return places.map(
    (p: GooglePlace): ResolvedPlace => ({
      placeId: p.id,
      name: p.displayName?.text ?? query,
      address: p.formattedAddress ?? "",
      lat: p.location.latitude,
      lng: p.location.longitude,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? null,
      priceLevel: p.priceLevel ? PRICE_LEVELS[p.priceLevel] ?? null : null,
      photoRef: p.photos?.[0]?.name ?? null,
      mapsUrl: p.googleMapsUri ?? null,
    })
  );
}