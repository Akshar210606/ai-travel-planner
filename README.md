# AI Travel Planner

Give it a city, a budget, and some dates. It returns a day-by-day itinerary
where every restaurant, museum, and viewpoint is a real place that exists
today — with an address, a rating, a photo, and a pin on a map.

**Live:** https://ai-travel-planner-peach-phi.vercel.app

## The problem this solves

Ask a language model to plan a trip and it will confidently recommend a
charming café that closed in 2019. The model is good at structure — pacing,
neighbourhood logic, what belongs in a morning versus an evening — and
unreliable at facts about specific businesses.

So the model never names a restaurant. It produces a *search query*:

```json
{
  "title": "Traditional Portuguese lunch",
  "placeQuery": "seafood restaurant in Alfama Lisbon Portugal",
  "category": "restaurant",
  "estimatedCost": 35
}
```

Google Places then resolves that query into a real venue. The schema makes
hallucination structurally impossible — there is no field for a business
name, so the model has nowhere to invent one.

## How it works

1. **Plan** — OpenAI returns a trip skeleton constrained by a JSON schema
   (structured outputs, so malformed responses can't happen)
2. **Geocode** — each day's neighbourhood becomes a coordinate, so searches
   stay local instead of scattering across the metro area
3. **Resolve** — every `placeQuery` hits Places Text Search, filtered for a
   minimum review count and deduplicated across the whole trip
4. **Price** — costs are computed in TypeScript from Google's price levels,
   never taken from the model's arithmetic
5. **Check** — with real dates, each stop is compared against the venue's
   opening days and flagged if it's closed
6. **Stream** — days are sent to the browser as they finish, so you read
   day one while day four is still building

## Features

- Budget enforced in code, with a spend meter against your stated budget
- Dates drive seasonal advice (daylight hours, weather, what to book ahead),
  weekday labels, and closure warnings
- Dietary requirements written into the search query itself, not just the
  prompt — a vegetarian search returns vegetarian restaurants
- Cuisine preferences and group type (solo, couple, family, friends) shape
  pacing and venue choice
- Interactive map, colour-coded by day, numbered in visit order
- Trip photos proxied server-side so the API key never reaches the browser
- Save, browse and delete trips behind passwordless auth, protected by
  Postgres row-level security

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Zod · OpenAI ·
Google Places API (New) · Supabase · Vercel

## Design decisions worth explaining

**Two Google API keys, not one.** The Maps JavaScript key must ship to the
browser, so it's restricted by HTTP referrer — copying it gets you nothing.
The Places and Geocoding key stays server-side and is restricted by API, so
a leak has a bounded blast radius.

**Zod as the single source of truth.** One schema generates the JSON schema
sent to OpenAI, the TypeScript types across the app, and the runtime
validation gate. Types alone vanish at compile time; when your data comes
from a language model, you want a real check.

**Authorisation in the database.** Trip queries contain no `where user_id`
clause. Postgres RLS adds it before the query runs, so a bug in application
code can't leak another user's trips.

**Errors inside the stream, not as status codes.** Once the response starts
streaming the 200 is committed, so a failure halfway through arrives as an
event the client handles rather than a status it can no longer change.

**Warn rather than auto-fix.** When Google says a venue is closed, the app
flags it instead of silently swapping in an alternative. Hours data is
often stale, and confidently wrong behaviour is worse than an honest flag.

## Known limitations

- **Generation takes 30–45 seconds.** The OpenAI call plans the whole trip
  in one request, so streaming reveals days progressively but can't shorten
  the initial wait. Longer trips approach Vercel's 60-second function limit.
- **Fixed 3km search radius.** Works in dense old towns like Alfama;
  spreads badly in low-density suburbs like Karen, Nairobi, where stops end
  up kilometres apart.
- **Cuisine terms aren't enforced.** A request for Portuguese food in Belém
  once returned a French bistro — Google weighted location over the cuisine
  word. Fixing this properly needs the Places `includedType` parameter.
- **Activity queries resolve poorly.** "Street art walking route" matched a
  place literally named "Street art" with one review. Routes and walks
  aren't venues. Mitigated by a 20-review floor, not solved.
- **Neighbourhood labels drift.** A stop tagged Baixa can sit in Cais do
  Sodré. The location bias keeps things close, not correct.
- **Price-level fallbacks are CAD-shaped.** Selecting EUR still uses a
  hardcoded cost table calibrated in Canadian dollars.
- **In-memory cache.** Dies on restart and isn't shared across serverless
  instances in production.
- **Dietary matching is search, not certification.** The app finds places
  whose listings match the term. It cannot verify halal or kosher status,
  and says so in the UI.
- **Magic links must be opened on the device that requested them.**
  A known trade-off of the flow.
- **Schema changes break old saved trips** unless new fields carry
  defaults. There's no migration layer.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Requires an OpenAI key, two Google Maps keys (see above), and a Supabase
project built from `supabase/schema.sql`.