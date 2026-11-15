"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { loginAction, type LoginState } from "./actions";

interface DemoAccount {
  label: string;
  role: string;
  email: string;
  blurb: string;
}

interface Props {
  next: string;
  password: string;
  demos: DemoAccount[];
}

const initial: LoginState = { error: null };

export function LoginForm({ next, password: demoPassword, demos }: Props) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  /** One click: fill in the demo account and submit the real login form, so the demo path is the normal path. */
  function signInAs(demo: DemoAccount) {
    setEmail(demo.email);
    setPassword(demoPassword);
    // The inputs are controlled, so let React commit the new values before submitting.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="demo" className="rounded-2xl border border-border bg-surface p-4">
        <h2 id="demo" className="font-semibold">
          Try the demo
        </h2>
        <p className="mt-1 text-sm text-muted">Pick a role to see what each can and cannot do.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {demos.map((demo) => (
            <button key={demo.email} type="button" disabled={pending} onClick={() => signInAs(demo)} className="rounded-xl border border-border p-3 text-left transition-colors hover:bg-surface-muted disabled:opacity-60">
              <span className="block font-semibold">{demo.role}</span>
              <span className="block text-sm text-muted">{demo.label}</span>
              <span className="mt-1 block text-xs text-muted">{demo.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <form ref={formRef} action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input id="password" name="password" type={reveal ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-12" />
            <button type="button" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Hide password" : "Show password"} aria-pressed={reveal} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-foreground">
              {reveal ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
        </div>
        {state.error && (
          <p role="alert" className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-danger">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-accent font-semibold text-white hover:bg-accent-strong disabled:opacity-60 dark:text-[#0c1020]">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
