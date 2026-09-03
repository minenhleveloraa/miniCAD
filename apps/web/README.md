# MiniCAD Dispatcher Web

The Next.js dispatcher interface for the MiniCAD technical assessment. It provides protected incident intake, broadcast dispatch, the live incident queue, and the live officer roster over the same Supabase project as the Expo officer app.

## Current routes

- `/` - responsive MiniCAD welcome screen and product overview.
- `/login` - email and password sign-in for accounts provisioned in Supabase Auth.
- `/dashboard` - authenticated dispatcher workspace with incident dispatch and live operational snapshots.
- `/dashboard/incidents/new` - protected incident intake form.
- `/dashboard/officers` - live Available / Responding / Off duty roster with claimed incident details.
- `/dashboard/officers/[officerId]` - dedicated live response timeline and filed report for one officer.
- `/dashboard/reports` - realtime archive of resolved incidents and final reports.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase JavaScript and SSR clients
- Lucide icons
- pnpm workspace

## Environment setup

Copy the committed example file to a local environment file:

```powershell
Copy-Item .env.example .env.local
```

Then replace the placeholders in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The URL and publishable key come from the Supabase project Connect panel. Do not place the secret key in a `NEXT_PUBLIC_` variable. Local `.env*` files are ignored by Git; `.env.example` is intentionally committed without real credentials.

## Run locally

From the repository root:

```powershell
pnpm dev:web
```

Or from `apps/web`:

```powershell
pnpm dev
```

Open `http://localhost:3000`.

## Authentication flow

MiniCAD intentionally does not expose public registration. Dispatcher accounts are provisioned directly by the project administrator in Supabase Authentication and then use the existing email and password form.

1. The login form submits credentials to a Next.js Server Action.
2. The Server Action validates the input before contacting Supabase Auth.
3. Supabase verifies the existing user with `signInWithPassword` and writes the cookie-backed session.
4. A successful login redirects to `/dashboard`; an invalid attempt returns a generic message that does not disclose whether an account exists.
5. Next.js Proxy refreshes and verifies the session before protected dashboard requests continue.
6. The dashboard performs its own server-side user check before rendering.

### File responsibilities

- `src/app/login/login-form.tsx` owns client-side form rendering, accessible errors, and the pending state.
- `src/app/login/actions.ts` validates credentials and performs server-side sign-in.
- `src/lib/supabase/server.ts` creates the cookie-aware Supabase server client.
- `src/lib/supabase/proxy.ts` refreshes and verifies the Supabase session.
- `src/proxy.ts` limits the session proxy to the protected dashboard route.
- `src/app/dashboard/page.tsx` loads the initial server-rendered incident and officer snapshots in parallel.
- `src/components/dashboard/incident-queue.tsx` dispatches New incidents and reconciles private Realtime invalidations.
- `src/app/dashboard/officers/page.tsx` loads the initial officer and active-assignment snapshot.
- `src/components/dashboard/officer-roster.tsx` renders the filterable live roster and claimed work.
- `src/components/dashboard/officer-response-detail.tsx` reconciles the selected officer, response pipeline, and final report live.
- `src/components/dashboard/report-alert-provider.tsx` owns the global report toast and unread-session badge.
- `src/components/dashboard/reports-archive.tsx` renders and reconciles filed reports.

## Dispatch and claim milestone

Run all SQL files under `supabase/migrations` in filename order. The latest migration is:

```text
202609030005_add_response_reports_and_push_tokens.sql
```

The dispatcher cannot broadcast a New incident unless at least one officer is on duty. Claim ownership is never assigned by browser or mobile state: the `claim_incident` RPC performs one conditional database update, so simultaneous taps produce exactly one winner. The database also prevents an assigned officer from going off duty. Only the assigned officer can advance Claimed -> En Route -> On Scene and submit the single final report that atomically resolves the incident.

## Push notification deployment

The website calls the authenticated `send-dispatch-notification` Supabase Edge Function after the dispatch RPC succeeds. The function verifies the dispatcher JWT, selects only currently on-duty officers, reads their private device tokens with the service role, and sends Expo push messages in batches of 100.

Link the Supabase CLI to the same project and deploy:

```powershell
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase functions deploy send-dispatch-notification
```

If Expo push access security is enabled, add its server token as a Supabase function secret:

```powershell
pnpm dlx supabase secrets set EXPO_ACCESS_TOKEN=YOUR_EXPO_ACCESS_TOKEN
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically to hosted Edge Functions. They must never be added to browser or mobile public environment variables.

## Quality checks

```powershell
pnpm lint:web
pnpm typecheck:web
pnpm build:web
```

## Supabase integration boundary

- `src/lib/supabase/client.ts` creates the browser client used by private Realtime subscriptions.
- `src/lib/supabase/server.ts` creates the cookie-aware client used by Server Actions and Server Components.
- `.env.local` must contain a valid project URL and publishable key for sign-in and protected routes.
- The officer application under `apps/mobile` uses the same Supabase project, schema, roles, and Realtime topics.
- Status progression, report submission, global report alerts, the archive, and push delivery now share the same Supabase project and private realtime topics.
