import type { Trip } from "@/lib/schema";
import TripMap from "@/components/TripMap";
import { dayColor } from "@/lib/colors";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const TIME_LABEL = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
} as const;

function dayDate(startDate: string | null, dayNumber: number) {
  if (!startDate) return null;
  const d = new Date(startDate + "T12:00:00");
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function Itinerary({ trip, budget }: { trip: Trip; budget: number }) {
  const spent = trip.totalEstimatedCost;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;

  return (
    <div className="mt-16">
      <div className="border-t border-neutral-200 pt-10">
        <h2 className="text-3xl font-semibold capitalize tracking-tight text-neutral-900">
          {trip.destination}
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-neutral-600">
          {trip.summary}
        </p>

        <div className="mt-6 max-w-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-neutral-900">
              {money(spent, trip.currency)}
            </span>
            <span className="text-sm text-neutral-500">
              of {money(budget, trip.currency)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className={"h-full rounded-full " + (over ? "bg-red-700" : "bg-neutral-900")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {over
              ? `${money(spent - budget, trip.currency)} over budget`
              : `${money(budget - spent, trip.currency)} left for transport and extras`}
          </p>
        </div>
      </div>

      <TripMap trip={trip} />

      {trip.days.map((day) => {
        const color = dayColor(day.dayNumber);
        return (
          <section key={day.dayNumber} className="mt-14">
            <div className="flex items-center gap-3">
              <span
                className="h-6 w-1.5 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              <h3 className="text-xl font-semibold text-neutral-900">
                Day {day.dayNumber}
              </h3>
              <span className="text-neutral-500">{day.neighborhood}</span>
              {dayDate(trip.startDate, day.dayNumber) && (
                <span className="text-sm text-neutral-400">
                  {dayDate(trip.startDate, day.dayNumber)}
                </span>
              )}
            </div>
            <p className="ml-[1.125rem] mt-1 text-neutral-600">{day.theme}</p>

            <ol className="ml-[0.3rem] mt-6 border-l border-neutral-200 pl-8">
              {day.stops.map((stop, i) => (
                <li key={i} className="relative pb-10 last:pb-0">
                  <span
                    className="absolute -left-[2.15rem] top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>

                  <div className="flex items-baseline justify-between gap-4">
                    <h4 className="font-medium text-neutral-900">{stop.title}</h4>
                    <span className="shrink-0 tabular-nums text-neutral-900">
                      {stop.estimatedCost > 0
                        ? money(stop.estimatedCost, trip.currency)
                        : "Free"}
                    </span>
                  </div>

                  <p className="mt-0.5 text-sm text-neutral-500">
                    {TIME_LABEL[stop.timeOfDay]}, about {stop.durationMinutes} minutes
                  </p>

                  <p className="mt-3 leading-relaxed text-neutral-700">
                    {stop.description}
                  </p>

                  {stop.place ? (
                    <div className="mt-4">
                      {stop.place.photoRef && (
                        <img
                          src={`/api/photo?ref=${encodeURIComponent(stop.place.photoRef)}`}
                          alt={stop.place.name}
                          className="mb-3 h-48 w-full rounded-md bg-neutral-100 object-cover"
                          loading="lazy"
                        />
                      )}

                      <a
                        href={stop.place.mapsUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
                      >
                        {stop.place.name}
                      </a>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {stop.place.address}
                      </p>
                      {stop.place.rating && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {stop.place.rating} stars from {stop.place.ratingCount?.toLocaleString()} reviews
                        </p>
                      )}

                      {stop.closedOnDay && (
                        <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Google lists this as closed on this day. Check before you
                          go, or move this stop.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-neutral-500">
                      No venue matched this one. Worth searching when you arrive.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}