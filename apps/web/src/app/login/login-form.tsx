"use client";

import { useActionState } from "react";
import { ArrowRight, AtSign, KeyRound, LoaderCircle } from "lucide-react";

import { signIn, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const formErrorId = state.message ? "login-form-error" : undefined;

  return (
    <form action={formAction} className="space-y-5" aria-describedby={formErrorId}>
      <div className="animate-fade-in-up delay-200">
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-[var(--ink-soft)]"
        >
          Email address
        </label>
        <div className="group relative">
          <AtSign className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--ink-muted)] transition-colors duration-300 group-focus-within:text-[var(--coral)]" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            className="login-input"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            required
            disabled={isPending}
          />
        </div>
        {state.fieldErrors?.email ? (
          <p id="email-error" className="mt-2 text-xs font-medium text-[var(--coral)]">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="animate-fade-in-up delay-300">
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-[var(--ink-soft)]"
        >
          Password
        </label>
        <div className="group relative">
          <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--ink-muted)] transition-colors duration-300 group-focus-within:text-[var(--coral)]" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="login-input"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
            required
            disabled={isPending}
          />
        </div>
        {state.fieldErrors?.password ? (
          <p id="password-error" className="mt-2 text-xs font-medium text-[var(--coral)]">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <div
          id="login-form-error"
          role="alert"
          className="rounded-2xl border border-[var(--coral)]/18 bg-[var(--coral)]/6 px-4 py-3 text-sm font-medium text-[var(--coral)]"
        >
          {state.message}
        </div>
      ) : null}

      <div className="animate-fade-in-up delay-400 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="login-submit group flex items-center justify-center gap-3 disabled:cursor-wait disabled:opacity-70"
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              <span>Signing in securely</span>
            </>
          ) : (
            <>
              <span>Sign in to dispatch</span>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
