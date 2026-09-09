"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTrip({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setFailed(false);
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/trips");
      router.refresh();
    } else {
      setDeleting(false);
      setFailed(true);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
        Delete
      </button>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5">
      <span className="text-sm text-red-900">Delete this trip?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded bg-red-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={deleting}
        className="rounded px-2 py-1 text-sm text-red-900 transition-colors hover:bg-red-100 disabled:opacity-50"
      >
        Cancel
      </button>
      {failed && (
        <span className="text-sm text-red-900">Couldn&apos;t delete. Try again.</span>
      )}
    </div>
  );
}