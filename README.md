# MiniCAD

MiniCAD is a small computer-aided dispatch system built for the Netstream technical assessment. It has a Next.js dispatcher website, an Expo officer app, and one Supabase backend shared by both clients.

**Hosted dispatcher:** [web-theta-nine-75.vercel.app](https://web-theta-nine-75.vercel.app)

## How it works

1. A seeded dispatcher signs in and records an incident.
2. The dispatcher broadcasts it to officers who have marked themselves available.
3. Officers see the incident immediately. The first available officer to claim it gets the assignment.
4. The assigned officer updates the response from **Claimed** to **En Route** and **On Scene**.
5. Filing the final report resolves the incident, unlocks the officer's availability control, and adds the report to the dispatcher archive.

Supabase Realtime keeps incidents, officer availability, response statuses, and reports in sync. Clients receive a small private change event and then fetch a fresh RLS-authorized snapshot, so there is no polling or manual page refresh. Android push notifications are delivered through Expo when a dispatched incident arrives in the background.

## Project structure

- `apps/web` - dispatcher website and dashboard.
- `apps/mobile` - officer application.
- `supabase/migrations` - tables, constraints, indexes, RLS policies, triggers, Realtime broadcasts, and transactional RPC functions.
- `supabase/schema.sql` - labelled entry point for the complete SQL schema.
- `supabase/functions` - server-side dispatch notification function.

## Run locally

Install dependencies, copy each application's `.env.example` to `.env.local`, and add the same Supabase project URL and publishable key.

```powershell
pnpm install
pnpm dev:web
pnpm dev:mobile
```

The dispatcher runs at `http://localhost:3000`. The mobile command starts Expo and displays its QR code.

There is no public sign-up. Accounts are created in Supabase Authentication and receive either `dispatcher` or `officer` in trusted app metadata. Row Level Security and database functions enforce permissions and prevent two officers from successfully claiming the same incident.

## Database schema

The complete SQL is stored in ordered migration files and indexed by [`supabase/schema.sql`](supabase/schema.sql). Apply the migrations in filename order to a new Supabase project. They cover incident logging, officer profiles and duty state, first-wins claiming, response progression, reports, push-token registration, and private Realtime events.

Useful checks:

```powershell
pnpm typecheck:web
pnpm typecheck:mobile
pnpm lint:web
pnpm lint:mobile
pnpm build:web
```
