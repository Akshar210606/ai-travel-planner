"use client";

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";
import type { Trip } from "@/lib/schema";
import { dayColor } from "@/lib/colors";

type Marker = {
  key: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  dayNumber: number;
  order: number;
};

export default function TripMap({ trip }: { trip: Trip }) {
  const [active, setActive] = useState<Marker | null>(null);

  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [];
    for (const day of trip.days) {
      let order = 0;
      for (const stop of day.stops) {
        if (!stop.place) continue;
        order++;
        out.push({
          key: `${day.dayNumber}-${order}`,
          lat: stop.place.lat,
          lng: stop.place.lng,
          name: stop.place.name,
          address: stop.place.address,
          dayNumber: day.dayNumber,
          order,
        });
      }
    }
    return out;
  }, [trip]);

  const center = useMemo(() => {
    if (!markers.length) return { lat: 0, lng: 0 };
    return {
      lat: markers.reduce((s, m) => s + m.lat, 0) / markers.length,
      lng: markers.reduce((s, m) => s + m.lng, 0) / markers.length,
    };
  }, [markers]);

  if (!markers.length) return null;

  return (
    <div className="mt-8">
      <div className="mb-2 flex flex-wrap gap-3 text-sm">
        {trip.days.map((day) => (
          <span key={day.dayNumber} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
                            style={{ background: dayColor(day.dayNumber) }}
            />
            Day {day.dayNumber}
          </span>
        ))}
      </div>

      <div className="h-96 w-full overflow-hidden rounded-lg border">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
          <Map
            defaultCenter={center}
            defaultZoom={12}
            mapId="TRIP_MAP"
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {markers.map((m) => (
              <AdvancedMarker
                key={m.key}
                position={{ lat: m.lat, lng: m.lng }}
                onClick={() => setActive(m)}
              >
                <Pin
                                    background={dayColor(m.dayNumber)}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  glyph={String(m.order)}
                />
              </AdvancedMarker>
            ))}

            {active && (
              <InfoWindow
                position={{ lat: active.lat, lng: active.lng }}
                onCloseClick={() => setActive(null)}
              >
                <div className="text-sm">
                  <p className="font-medium">{active.name}</p>
                  <p className="text-neutral-600">{active.address}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Day {active.dayNumber}, stop {active.order}
                  </p>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}