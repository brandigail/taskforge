"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, name, description: "" }) });
      const body: { project?: { key: string }; error?: string } = await res.json();
      if (!res.ok || !body.project) return setError(body.error ?? "Could not create the project");
      router.push(`/projects/${body.project.key}/board`);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong dark:text-[#0c1020]">
        <Plus className="size-4" aria-hidden /> New project
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="block text-sm font-medium">
          Key
          <input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} maxLength={5} placeholder="WEB" required className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 uppercase" />
        </label>
        <label className="block text-sm font-medium">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Marketing site" required className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3" />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong disabled:opacity-60 dark:text-[#0c1020]">
          Create project
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-border px-4 font-medium hover:bg-surface-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
