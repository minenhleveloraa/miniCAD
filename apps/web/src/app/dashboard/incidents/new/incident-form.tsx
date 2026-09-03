"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LoaderCircle, RadioTower, Save } from "lucide-react";

import {
  createIncident,
  type IncidentFormState,
} from "@/app/dashboard/incidents/new/actions";
import { INCIDENT_PRIORITIES, INCIDENT_PRIORITY_LABELS } from "@/lib/incidents";

const initialState: IncidentFormState = {};
const inputClassName =
  "mt-2 w-full rounded-2xl border border-[var(--ink)]/10 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)]/70 hover:border-[var(--ink)]/20 focus:border-[var(--coral)] focus:ring-4 focus:ring-[var(--coral-glow)] disabled:cursor-wait disabled:opacity-65";

type FieldErrorProps = {
  id: string;
  message?: string;
};

function FieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <p id={id} className="mt-2 text-xs font-semibold text-[var(--coral)]">
      {message}
    </p>
  ) : null;
}

export function IncidentForm() {
  const [state, formAction, isPending] = useActionState(createIncident, initialState);
  const formErrorId = state.message ? "incident-form-error" : undefined;

  return (
    <form action={formAction} aria-describedby={formErrorId} className="space-y-6">
      <fieldset disabled={isPending} className="space-y-6">
        <legend className="sr-only">Caller and incident details</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="caller_name">
            Caller name
            <input
              id="caller_name"
              name="caller_name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              placeholder="Full name"
              required
              aria-invalid={Boolean(state.fieldErrors?.caller_name)}
              aria-describedby={state.fieldErrors?.caller_name ? "caller-name-error" : undefined}
              className={inputClassName}
            />
            <FieldError id="caller-name-error" message={state.fieldErrors?.caller_name} />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="caller_phone">
            Caller phone
            <input
              id="caller_phone"
              name="caller_phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              minLength={7}
              maxLength={32}
              placeholder="e.g. +27 82 123 4567"
              pattern="[0-9+().\-\s]+"
              required
              aria-invalid={Boolean(state.fieldErrors?.caller_phone)}
              aria-describedby={state.fieldErrors?.caller_phone ? "caller-phone-error" : undefined}
              className={inputClassName}
            />
            <FieldError id="caller-phone-error" message={state.fieldErrors?.caller_phone} />
          </label>
        </div>

        <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="location">
          Location or address
          <input
            id="location"
            name="location"
            type="text"
            autoComplete="street-address"
            minLength={3}
            maxLength={500}
            placeholder="Street address, landmark, or area"
            required
            aria-invalid={Boolean(state.fieldErrors?.location)}
            aria-describedby={state.fieldErrors?.location ? "location-error" : undefined}
            className={inputClassName}
          />
          <FieldError id="location-error" message={state.fieldErrors?.location} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="incident_type">
            Incident type
            <input
              id="incident_type"
              name="incident_type"
              type="text"
              minLength={2}
              maxLength={80}
              placeholder="e.g. Road accident"
              required
              aria-invalid={Boolean(state.fieldErrors?.incident_type)}
              aria-describedby={state.fieldErrors?.incident_type ? "incident-type-error" : undefined}
              className={inputClassName}
            />
            <FieldError id="incident-type-error" message={state.fieldErrors?.incident_type} />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="priority">
            Priority
            <select
              id="priority"
              name="priority"
              defaultValue=""
              required
              aria-invalid={Boolean(state.fieldErrors?.priority)}
              aria-describedby={state.fieldErrors?.priority ? "priority-error" : undefined}
              className={inputClassName}
            >
              <option value="" disabled>
                Select priority
              </option>
              {INCIDENT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {INCIDENT_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            <FieldError id="priority-error" message={state.fieldErrors?.priority} />
          </label>
        </div>

        <label className="block text-sm font-semibold text-[var(--ink-soft)]" htmlFor="description">
          Short description
          <textarea
            id="description"
            name="description"
            rows={5}
            minLength={5}
            maxLength={1000}
            placeholder="Record the essential details shared by the caller."
            required
            aria-invalid={Boolean(state.fieldErrors?.description)}
            aria-describedby={state.fieldErrors?.description ? "description-error" : "description-help"}
            className={`${inputClassName} min-h-32 resize-y`}
          />
          <span id="description-help" className="mt-2 block text-xs font-normal text-[var(--ink-muted)]">
            Keep this factual and concise. Up to 1,000 characters.
          </span>
          <FieldError id="description-error" message={state.fieldErrors?.description} />
        </label>
      </fieldset>

      {state.message ? (
        <div
          id="incident-form-error"
          role="alert"
          className="rounded-2xl border border-[var(--coral)]/18 bg-[var(--coral)]/6 px-4 py-3 text-sm font-medium text-[var(--coral)]"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--ink)]/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-[var(--ink-muted)] transition-colors hover:bg-white hover:text-[var(--ink)]"
        >
          <ArrowLeft className="size-4" strokeWidth={1.9} />
          Return to queue
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--coral)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--coral-light)] disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Saving incident
            </>
          ) : (
            <>
              <Save className="size-4" strokeWidth={1.9} />
              Log incident
              <RadioTower className="size-4" strokeWidth={1.9} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
