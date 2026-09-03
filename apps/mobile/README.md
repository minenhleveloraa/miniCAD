# MiniCAD Officer Mobile

The Expo application used by officers in the MiniCAD dispatch workflow. It shares authentication, incident records, row-level security, and private Realtime broadcasts with the dispatcher website.

## Current scope

- Expo SDK 57 with React Native 0.86 and Expo Router.
- Responsive officer login for Android, iOS, and web previews.
- Supabase password authentication with no public signup.
- Trusted role check against `user.app_metadata.role === "officer"`.
- Native session persistence through Expo SecureStore; browser previews use local storage.
- Foreground-aware Supabase token refresh for uninterrupted authenticated sessions.
- Shared MiniCAD colors, spacing, radii, typography, and shadows under `src/theme`.
- Explicit officer-controlled Available / Off duty state.
- Live, priority-coded dispatched incident queue with no manual refresh.
- Database-authoritative first-wins incident claiming; off-duty officers can view but cannot claim.
- Conflict feedback when another officer claims first, followed by an authorized snapshot reconciliation.
- Database-enforced availability lock while an officer owns an active response.
- Ordered Claimed -> En Route -> On Scene -> Resolved response pipeline.
- Text-only final report submission with authoritative resolution time.
- Expo push-token registration, urgent Android notification channel, sound, and vibration.

## Supabase configuration

The app and dispatcher website point to the same Supabase project, but Expo requires mobile-safe variable names. Copy the example:

```powershell
Copy-Item .env.example .env.local
```

Then copy the public URL and publishable key values from `apps/web/.env.local` into:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-uuid
```

Only the project URL and publishable key belong in the app. Never add `SUPABASE_SECRET_KEY`, a service-role key, an access token, or a database password to an `EXPO_PUBLIC_` variable—the values are compiled into the application bundle.

### Provision an officer account

There is no signup screen. Create the user through Supabase Authentication, then assign the protected role in the user’s app metadata:

```json
{
  "role": "officer"
}
```

Authorization data must use app metadata, not user metadata, because users can edit their own user metadata. The mobile login rejects valid credentials that do not carry the officer role; the dispatcher website separately accepts only `dispatcher`.

### Apply the database milestone

Run the migrations in `supabase/migrations` in filename order. The current response milestone is defined by:

```text
202609030005_add_response_reports_and_push_tokens.sql
```

That migration adds the report table, private push-token registry, transition/report RPCs, the active-response duty lock, and the private `minicad:reports` broadcast. Realtime messages contain only invalidation identifiers; the app re-reads its RLS-authorized snapshot instead of broadcasting caller or report content.

## Run the app

From the repository root:

```powershell
pnpm dev:mobile
```

Scan the QR code using Expo Go, or press `a` for an Android emulator. Authentication, availability, realtime dispatches, status updates, and reports work in Expo Go.

Remote push notifications do not work in Expo Go on current Expo SDKs. Set `EXPO_PUBLIC_EAS_PROJECT_ID`, deploy the Edge Function described in the web README, and create an EAS development build or APK to test background push delivery. The Android `dispatch-alerts` channel is configured at maximum importance with sound and vibration; foreground dispatches also trigger vibration in JavaScript.

## Quality checks

```powershell
pnpm lint:mobile
pnpm typecheck:mobile
pnpm --dir apps/mobile exec expo-doctor
```

## File responsibilities

- `src/app/_layout.tsx` defines the root navigation stack and starts foreground token refresh.
- `src/app/index.tsx` restores the session and sends authenticated officers into the protected tabs.
- `src/screens/login/index.tsx` owns the login presentation, validation, pending state, role check, and truthful feedback.
- `src/features/workspace/officer-workspace-provider.tsx` owns duty state, incident snapshots, the private Realtime subscription, and claim RPC calls.
- `src/screens/overview/index.tsx` presents availability and the current operational summary.
- `src/screens/incidents/index.tsx` renders the color-coded claim queue and conflict feedback.
- `src/screens/incident-response/index.tsx` owns the status timeline and final report form.
- `src/features/notifications/notification-provider.tsx` registers device tokens and handles dispatch notifications.
- `src/lib/supabase.ts` creates the shared Supabase client and secure platform storage adapter.
- `src/lib/auth/roles.ts` isolates the officer role check.
- `src/theme/index.ts` is the single visual source of truth shared by future mobile screens.

## Current boundary

This milestone ends with a resolved text report, dispatcher archive, and push delivery plumbing. Photos are intentionally omitted as requested. Store-ready EAS profiles and signed APK packaging remain a later release milestone.
