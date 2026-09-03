# MiniCAD

MiniCAD is a realtime computer-aided dispatch workspace built for the Netstream technical assessment. It combines a protected Next.js dispatcher dashboard, an Expo officer application, and one Supabase backend.

## Applications

- `apps/web` — dispatcher incident intake, dispatch queue, live officer roster, response tracking, and report archive.
- `apps/mobile` — officer authentication, availability, incident claiming, response status, reports, and push registration.
- `supabase` — PostgreSQL migrations, RLS policies, transactional RPCs, private Realtime broadcasts, and the Expo push Edge Function.
- `plans/01-supabase-backend` — backend implementation plan in Markdown.
- `output/pdf` — reviewer-ready PDF version of the backend plan.

## Local setup

Install dependencies from the repository root:

```powershell
pnpm install
```

Copy each application environment example and add the same Supabase project credentials:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
```

Run the clients in separate terminals:

```powershell
pnpm dev:web
pnpm dev:mobile
```

Apply every SQL file in `supabase/migrations` in filename order before testing the operational workflow. See the application READMEs for user provisioning, push-function deployment, and Expo development-build notes.

## Quality checks

```powershell
pnpm typecheck:web
pnpm typecheck:mobile
pnpm lint:web
pnpm lint:mobile
pnpm build:web
```

Local `.env` files, dependencies, framework output, Expo exports, and temporary rendering artifacts are excluded from Git.
