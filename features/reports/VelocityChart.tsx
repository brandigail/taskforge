"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VelocityBar } from "@/lib/sprint-math";

export function VelocityChart({ bars }: { bars: VelocityBar[] }) {
  const data = bars.map((b) => ({ name: b.name, Committed: b.committed, Completed: b.completed }));
  return (
    <div role="img" aria-label={`Velocity: ${bars.map((b) => `${b.name} completed ${b.completed} of ${b.committed} points`).join(". ")}`} className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} stroke="var(--border)" />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} stroke="var(--border)" />
          <Tooltip cursor={{ fill: "var(--surface-muted)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
          <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 13 }} />
          <Bar dataKey="Committed" fill="var(--muted)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Completed" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
