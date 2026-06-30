# Wanderlist

A private, 2-person travel-planning app. Log trip ideas, attach TikTok
videos as inspiration, track flights, and once a trip is booked, log
hotels/restaurants/a map of places to go.

Built with Expo (React Native + TypeScript), Expo Router, NativeWind, and
Supabase. Runs via Expo Go — no paid Apple Developer account or EAS build
needed.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a project, and grab the
project URL and anon key from Settings → API.

### 2. Run the migrations

Open the SQL editor in your Supabase project and run the migrations in
`supabase/migrations/` in order:

- `0001_init.sql` creates the `allowed_users`, `trips`, `places`, and
  `flights` tables with row-level security gated by household membership.
- `0002_cover_photo_credit.sql` adds the photo-attribution columns used by
  the destination cover photo feature (see step 4).

### 3. Add your household's emails

```sql
insert into allowed_users (email) values
  ('you@example.com'),
  ('your-partner@example.com');
```

Only emails in this table can read or write data — anyone can sign up, but
only allowlisted emails see anything.

### 4. Configure environment variables

```sh
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
your Supabase project settings.

Optionally, fill in `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY` to enable automatic
destination cover photos when creating a trip. Get a free key at
[unsplash.com/developers](https://unsplash.com/developers) — create an app,
no credit card required, and copy the "Access Key" from its dashboard. The
demo tier (50 requests/hour) is plenty for personal use. Without this key,
trip creation still works, just without a cover photo.

### 5. Set up the Discover tab (AI trip planner)

The Discover tab calls a small serverless function (`api/claude.ts`) that
proxies to the Anthropic API, so your Anthropic key never ships to the
client.

1. Deploy this repo to [Vercel](https://vercel.com) (see "Deploying to
   Vercel" below if you haven't already).
2. In the Vercel project's Settings → Environment Variables, add
   `ANTHROPIC_API_KEY` with your [Anthropic API key](https://console.anthropic.com/settings/keys).
   Do **not** prefix it with `EXPO_PUBLIC_` — that would bundle it into the
   client and expose it.
3. In your local `.env`, set `EXPO_PUBLIC_API_BASE_URL` to your Vercel
   deployment URL (e.g. `https://your-app.vercel.app`), no trailing slash.
4. Redeploy after adding the env var so it takes effect.

Without this configured, every other tab still works — Discover will just
show an error when you try to chat.

### 6. Install dependencies and run

```sh
npm install
npx expo start
```

Install [Expo Go](https://expo.dev/go) on your phone, scan the QR code, and
sign up with one of the allowlisted emails.

## Project structure

- `app/` — Expo Router screens (file-based routing)
  - `(auth)/login.tsx` — sign in / sign up
  - `(tabs)/index.tsx` — trips dashboard
  - `(tabs)/discover.tsx` — AI trip planner chat (Discover tab)
  - `(tabs)/profile.tsx` — account info + sign out
  - `new-trip.tsx` — create a trip idea
  - `trip/[id]/index.tsx` — trip detail (TikTok inspo, flights, places)
  - `trip/[id]/add-place.tsx`, `add-flight.tsx` — entry forms
  - `trip/[id]/map.tsx` — map of places (native only; `map.web.tsx` is the
    web fallback since `react-native-maps` has no web support)
- `api/claude.ts` — Vercel serverless function that proxies the Discover tab's
  requests to the Anthropic API, keeping `ANTHROPIC_API_KEY` server-side only
- `components/` — themed UI primitives (`TripCard`, `PlaceCard`,
  `FlightCard`, `TikTokEmbed`, `PillButton`, `GlassCard`, `SectionLabel`)
- `lib/` — `supabase.ts`, `auth.tsx`, `types.ts`, `tiktok.ts`, `unsplash.ts`, `ai.ts`
- `theme/` — color and typography tokens
- `supabase/migrations/` — SQL schema and RLS policies

## Deploying to Vercel

This repo includes a `vercel.json` that builds the Expo web export and
serves `api/claude.ts` as a serverless function. To deploy:

1. Import this repo into [Vercel](https://vercel.com/new).
2. Leave the build settings as-is — `vercel.json` already configures the
   build command and output directory.
3. Add the `ANTHROPIC_API_KEY` environment variable (see step 5 above)
   before or after the first deploy; redeploy if you add it after.
4. Once deployed, copy the deployment URL into `EXPO_PUBLIC_API_BASE_URL`
   in your local `.env`.

## Notes

- Web build uses `app.json`'s `web.output: "single"` — switching to
  `"static"` triggers Node-side prerendering that crashes when
  `lib/supabase.ts` constructs a client outside a browser context.
- `react-native-maps` has no web support; `map.web.tsx` is a
  platform-specific override shown instead on web.
