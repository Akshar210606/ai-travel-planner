"use client";

import { useState } from "react";
import type { Trip, TripRequest } from "@/lib/schema";
import { DIETARY, CUISINES, GROUPS } from "@/lib/schema";
import Itinerary from "@/components/Itinerary";

const INTERESTS = [
  "food", "history", "art", "nature", "nightlife", "shopping", "architecture",
] as const;

const PACES = [
  { value: "relaxed", label: "Take it slow", detail: "3 stops a day" },
  { value: "balanced", label: "Steady", detail: "4 stops a day" },
  { value: "packed", label: "See everything", detail: "6 stops a day" },
] as const;

const CURRENCIES = ["CAD", "USD", "EUR", "GBP"] as const;

const GROUP_LABEL = {
  solo: "On my own",
  couple: "With a partner",
  family: "With kids",
  friends: "With friends",
} as const;

export default function Planner() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("3");
  const [budget, setBudget] = useState("600");
  const [currency, setCurrency] = useState<TripRequest["currency"]>("CAD");
  const [pace, setPace] = useState<TripRequest["pace"]>("balanced");
  const [interests, setInterests] = useState<string[]>(["food"]);
  const [group, setGroup] = useState<TripRequest["group"]>("solo");
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const daysNum = Number(days);
  const budgetNum = Number(budget);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setTrip(null);
    setSavedId(null);
    setTotalDays(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days: daysNum,
          budget: budgetNum,
          currency, pace, interests,
          group, dietary, cuisines,
          startDate: startDate || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(text);
          message = parsed.issues?.[0]?.message ?? parsed.error ?? message;
        } catch {
          console.error("Non-JSON response:", text.slice(0, 200));
        }
        throw new Error(message);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let partial: Trip = {
        destination: "",
        days: [],
        startDate: null,
        summary: "",
        totalEstimatedCost: 0,
        currency,
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "meta") {
            partial = {
              ...partial,
              destination: event.destination,
              summary: event.summary,
              currency: event.currency,
              startDate: event.startDate,
            };
            setTotalDays(event.totalDays);
          } else if (event.type === "day") {
            partial = { ...partial, days: [...partial.days, event.day] };
          } else if (event.type === "done") {
            partial = { ...partial, totalEstimatedCost: event.totalEstimatedCost };
          } else if (event.type === "error") {
            throw new Error(event.message);
          }

          setTrip({ ...partial });
        }
      }

      setSubmitted(budgetNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!trip) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, budget: submitted ?? budgetNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setSavedId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const tooManyInterests = interests.length > 5;
  const tooManyDietary = dietary.length > 4;
  const tooManyCuisines = cuisines.length > 3;

  const canSubmit =
    destination.trim().length >= 2 &&
    daysNum >= 1 &&
    daysNum <= 10 &&
    budgetNum >= 50 &&
    interests.length > 0 &&
    !tooManyInterests &&
    !tooManyDietary &&
    !tooManyCuisines &&
    !loading;

  const field =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 " +
    "text-neutral-900 outline-none transition-colors " +
    "focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <header className="max-w-lg">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          Where are you going?
        </h1>
        <p className="mt-3 text-neutral-600">
          Tell us the city and what you have to spend. You&apos;ll get real
          places, real prices, and a plan for each day.
        </p>
      </header>

      <div className="mt-10 space-y-7">
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-neutral-800">
            Destination
          </label>
          <input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Lisbon, Portugal"
            className={field + " mt-2 text-lg"}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                    <div className="col-span-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-neutral-800">
              First day <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setStartDate(e.target.value)}
              className={field + " mt-2"}
            />
          </div>

          <div>
            <label htmlFor="days" className="block text-sm font-medium text-neutral-800">
              Days
            </label>
            <input
              id="days"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onBlur={() => {
                const n = Number(days);
                if (!days || n < 1) setDays("1");
                else if (n > 6) setDays("6");
                else setDays(String(n));
              }}
              className={field + " mt-2"}
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="budget" className="block text-sm font-medium text-neutral-800">
              Total budget
            </label>
            <input
              id="budget"
              type="number"
              inputMode="numeric"
              min={50}
              step={50}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onBlur={() => {
                const n = Number(budget);
                if (!budget || n < 50) setBudget("50");
                else setBudget(String(n));
              }}
              className={field + " mt-2"}
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-neutral-800">
              Currency
            </label>
            <select
              id="currency" value={currency}
              onChange={(e) => setCurrency(e.target.value as TripRequest["currency"])}
              className={field + " mt-2"}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-neutral-800">Who&apos;s going?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const on = group === g;
              return (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  aria-pressed={on}
                  className={
                    "rounded-md border px-4 py-2 text-sm transition-colors " +
                    (on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500")
                  }
                >
                  {GROUP_LABEL[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-neutral-800">How busy?</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {PACES.map((p) => {
              const on = pace === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPace(p.value)}
                  aria-pressed={on}
                  className={
                    "rounded-md border px-4 py-3 text-left transition-colors " +
                    (on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-500")
                  }
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className={"block text-sm " + (on ? "text-neutral-300" : "text-neutral-500")}>
                    {p.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-800">
              What do you want to see?
            </span>
            <span className={"text-sm " + (tooManyInterests ? "text-red-700" : "text-neutral-500")}>
              {interests.length} of 5
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = interests.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggle(interests, setInterests, i)}
                  aria-pressed={on}
                  className={
                    "rounded-full border px-4 py-2 text-sm capitalize transition-colors " +
                    (on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500")
                  }
                >
                  {i}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-800">
              Any dietary requirements?
            </span>
            <span className={"text-sm " + (tooManyDietary ? "text-red-700" : "text-neutral-500")}>
              {dietary.length} of 4
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            We&apos;ll search for places that serve this. Confirm with the
            restaurant before you eat.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIETARY.map((d) => {
              const on = dietary.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggle(dietary, setDietary, d)}
                  aria-pressed={on}
                  className={
                    "rounded-full border px-4 py-2 text-sm capitalize transition-colors " +
                    (on
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500")
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-800">
              Cuisines you&apos;d like
            </span>
            <span className={"text-sm " + (tooManyCuisines ? "text-red-700" : "text-neutral-500")}>
              {cuisines.length} of 3
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {CUISINES.map((c) => {
              const on = cuisines.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggle(cuisines, setCuisines, c)}
                  aria-pressed={on}
                  className={
                    "rounded-full border px-4 py-2 text-sm capitalize transition-colors " +
                    (on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500")
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="w-full rounded-md bg-neutral-900 py-3.5 font-medium text-white transition-opacity hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Building your trip…" : "Plan my trip"}
          </button>
                    {loading && !trip?.days.length && (
            <p className="mt-2 text-center text-sm text-neutral-500">
              Planning your route…
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>

                  {trip && trip.destination && (
        <>
          <Itinerary
            trip={trip}
            budget={submitted ?? budgetNum}
            totalDays={totalDays}
          />

          {!loading && (
            <div className="mt-16 border-t border-neutral-200 pt-8">
              <p className="text-neutral-600">
                Happy with this one? Save it and it&apos;ll be here when you come back.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving || savedId !== null}
                  className="rounded-md bg-neutral-900 px-6 py-3 font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                >
                  {savedId ? "Saved" : saving ? "Saving…" : "Save this trip"}
                </button>
                                {savedId && (
                  <a
                    href="/trips"
                    className="text-sm text-neutral-600 underline underline-offset-4"
                  >
                    View all saved trips
                  </a>
                )}
              </div>
            </div>
          )}
               </>
      )}
    </div>
  );
}