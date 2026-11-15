"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BurndownPoint } from "@/lib/sprint-math";

const short = (day: string): string => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function BurndownChart({ points, sprintName }: { points: BurndownPoint[]; sprintName: string }) {
  const latest = [...points].reverse().find((p) => p.remaining !== null);
  const data = points.map((p) => ({ day: p.day, Ideal: p.ideal, Remaining: p.remaining }));
  return (
    <div role="img" aria-label={`Burndown for ${sprintName}: ${latest?.remaining ?? 0} points remaining against an ideal of ${latest?.ideal ?? 0}.`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={short} tick={{ fill: "var(--muted)", fontSize: 12 }} stroke="var(--border)" minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} stroke="var(--border)" />
          <Tooltip labelFormatter={(d) => short(String(d))} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
          <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 13 }} />
          <Line type="linear" dataKey="Ideal" stroke="var(--muted)" strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="Remaining" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
