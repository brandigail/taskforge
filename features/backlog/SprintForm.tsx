"use client";

import { useState, type FormEvent } from "react";
import { useBoard } from "@/features/board/BoardStoreProvider";

const day = (offset: number): string => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const field = "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3";

export function SprintForm({ nextName, onDone }: { nextName: string; onDone: () => void }) {
  const createSprint = useBoard((s) => s.createSprint);
  const [name, setName] = useState(nextName);
  const [goal, setGoal] = useState("");
  const [startsAt, setStartsAt] = useState(day(0));
  const [endsAt, setEndsAt] = useState(day(13));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (endsAt < startsAt) return setError("The end date must not be before the start date.");
    setError(null);
    setBusy(true);
    const ok = await createSprint({ name: name.trim(), goal: goal.trim(), startsAt, endsAt });
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </label>
        <label className="block text-sm font-medium">
          Goal (optional)
          <input className={field} value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} />
        </label>
        <label className="block text-sm font-medium">
          Starts
          <input className={field} type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Ends
          <input className={field} type="date" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} required />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong disabled:opacity-60 dark:text-[#0c1020]">
          Create sprint
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-border px-4 font-medium hover:bg-surface-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
