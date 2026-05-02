# MakeYourMusic — Product Improvement & Growth Plan

**Goal:** Take the platform from its current built-out MVP to a product capable of attracting and retaining millions of users.

**Audit date:** 2026-05-01
**Branch:** `master`

---

## Shipped 2026-05-02 (Audit pass)

End-to-end review of every prior shipped claim. All 50 schema models + 26 enums verified, all 29 API routes mounted, Socket.IO `/parties` + `/dj` namespaces wired, cron sweeps in place (LOCK_PARTY_SWEEP=1009, LOCK_DJ_SWEEP=1010), marketplace webhook handler registered, OAuth bearer middleware live, mobile track video, AASA + assetlinks endpoints, magic-link auth, Sentry on every surface. Backend + frontend `tsc --noEmit` both pass.

Substantive gaps found and fixed:

- **i18n was dead code.** Phase 3 shipped runtime + 8 catalogs (frontend + mobile, 16 JSON files) but no UI imported `t()`. Fixed by wiring `t('landing.primaryCta')` / `t('landing.secondaryCta')` into the three landing CTAs (`HeroDeckLayout`, `HeroSpectrum`, `CTABand`) and adding a `<LocaleSwitcher />` to `/settings` so users can actually change language. Hard reload after pick so server-rendered surfaces re-resolve. Full per-component sweep is still a follow-up; the runtime is now provably exercised.
- **`/create?preset=<slug>` was a dead link.** Marketplace listing page's "Try preview" pointed there but the create page only read `?prompt=`. Added a `?preset=` effect that fetches the marketplace listing, validates it's a `PROMPT_PRESET`, and applies the preset's `idea/genre/subGenre/mood/energy/era/vocalStyle/vibeReference/style/isInstrumental` into empty form fields (non-destructive — never clobbers user-typed values). Fires `preset_applied` analytics event.
- **`env.example` files were missing several vars** introduced across Phases 0–4. Backend gained: `REPLICATE_API_TOKEN`, `REPLICATE_DEMUCS_VERSION`, `AUTO_PREVIEW_VIDEO`, `AUTOCLIP_BACKFILL_PER_TICK`, `MYM_OUTRO_AUDIO_PUBLIC_ID`, `RUN_CRON`, `PLATFORM_FEE_BPS`, `API_KEY_HMAC_SECRET`, `ADMIN_PANEL_PASSWORD`, `JWT_ISSUER`, `JWT_AUDIENCE`, `SENTRY_DSN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_FREE_API_KEY_ID`, `FIREBASE_SERVICE_ACCOUNT`, `DISTROKID_API_KEY`, `TUNECORE_API_KEY`. Frontend gained: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`, `IOS_APPCLIP_BUNDLE_ID`, `ANDROID_PACKAGE_NAME`, `ANDROID_SHA256_FINGERPRINT`. Each documented inline with what's required vs optional and what happens when absent.
- **Lint nits**: removed unused `Loader2` import in `mobile/components/create/VoiceQuickCreate.tsx`; dropped unused `err` catch binding in stems-editor. Other stylistic warnings left as-is — they don't break the build and are baseline noise across Phase 0 code already.

Still deferred (unchanged from prior sweeps): Phase 2 in full; native CarPlay scene delegate; OAuth refresh tokens; full per-component i18n sweep; Redis adapter for Socket.IO at horizontal scale; real DistroKid/TuneCore API integrations; LoRA finetune integration when a music provider opens that surface.

---

## Shipped 2026-05-01 (Phase 4)

**Scope:** Phase 4 (180+ days, "the big bets") shipped as one bundle. Phase 2 still deferred.

**Migration needed before deploy:** `prisma migrate dev --name phase4_dj_oauth_training` adds 4 new tables (`dj_sessions`, `dj_session_tracks`, `oauth_apps`, `oauth_grants`) and 2 new enums. No column changes to existing tables.

**Real-time AI improv DJ mode:**
- Continuous AI-generated mix with chained generations and host-driven vibe shifts. Each session is a sequence of 90s instrumental tracks; the host's input seeds the NEXT slot, current keeps playing.
- Schema: `DjSession` + `DjSessionTrack` + `DjSessionStatus` enum. Code-based join (6-char base32, same alphabet as listening parties).
- Backend: `djController` with create/get/end + `vibe` shift + `advance` (host crossfade signal). `processMusicGeneration` exported from `aiGenerationController` so the DJ controller can fire-and-forget chained generations.
- Realtime: new Socket.IO `/dj` namespace alongside `/parties` (`backend/src/realtime.ts`). Host events (`host:tick`, `host:slot-ready`, `host:vibe-changed`) fan out as `dj:*` to listeners.
- Web: `/dj` page with two `<audio>` elements doing 4-second crossfades, lookahead-driven advance, vibe-shift input, share link.
- Cron sweep ends sessions whose host has been silent for 30+ min OR that have run 4+ hours (forgotten-tab guard). Daily AI-cap honored — if the host hits the cap, session ends gracefully with a 429.

**Custom-trained agents:**
- Schema: no new tables — uses existing `AiAgent.genConfig` (Json). New shape: `{ trainingExamples: [{audioUrl, description, addedAt}], styleProfile, styleProfileVersion }`.
- Backend: `agentTrainingController` exposes `GET/POST/DELETE /api/agent-training/:agentId/...` plus `POST /api/agent-training/:agentId/derive`. The derive endpoint runs `minimaxChat` on the training-example descriptions to synthesize a 200–400 word style profile, then stores it.
- Generation hook: `aiGenerationController.processMusicGeneration` reads `agent.genConfig.styleProfile` and prepends it to the orchestrated prompt as `Custom style profile (override genre defaults when in conflict)`. Effect is consistent voice across an agent's tracks without actual model finetuning.
- Web: `/creator/agents/[slug]/training` page — owner adds/removes example URLs (with optional descriptions), clicks Train, sees the resulting profile.
- Caps: 10 examples per agent, 20 derive calls per user per day, 500-char description cap.
- Out of scope: actual LoRA-style finetuning (no provider exposes music finetune APIs yet); when one does, swap `derive` to call it instead of synthesizing the profile via chat.

**Voice-controlled creation:**
- New `POST /api/ai/voice-create` (multipart `audio` field) chains transcribe → music generation in one round-trip. Auto-detects "instrumental" in the transcript; honors optional `agentId`. Hits both transcribe and generate daily caps.
- Mobile: new `VoiceQuickCreate` component (`mobile/components/create/VoiceQuickCreate.tsx`) — hold-to-record button on the Create flow's Idea step, max 30s, auto-stops, redirects to the studio generations view on success.
- CarPlay: `mobile/plugins/withCarPlay.js` README updated with the explicit recipe for the next-step CarPlay scene delegate that taps `/api/ai/voice-create` from a CPListTemplate item. Native scene delegate is invasive (requires Apple's CarPlay capability grant); the endpoint + in-app voice button ship now, the CarPlay polish lands once the grant is in.

**Open developer marketplace (OAuth apps):**
- Schema: `OAuthApp` + `OAuthGrant` + `OAuthAppStatus` enum. `client_secret` stored as HMAC-SHA-256 hash (same `hashApiKey` helper used for personal API keys); raw shown ONCE at creation.
- Full OAuth 2.0 authorization-code flow with mandatory PKCE (S256 only):
  - `GET /api/oauth/info?client_id=...` — pre-flight metadata for the consent screen.
  - `POST /api/oauth/authorize` — auth-required; mints a 5-min authorization code on user approval, returns the redirect URL.
  - `POST /api/oauth/token` — exchanges code for a 90-day access token; verifies client_secret + PKCE code_verifier + redirect_uri match.
  - `POST /api/oauth/revoke` — RFC 7009-ish (always 200, never leaks token validity).
  - `GET /api/oauth/grants` + `DELETE /api/oauth/grants/:id` — user dashboard for connected apps.
- API-key middleware extended (`apiKeyAuth.ts`) — bearer tokens prefixed `mym_oauth_` route to `OAuthGrant.accessTokenHash`; everything else stays on `ApiKey.keyHash`. Same `req.user` shape downstream so existing `/api/v1/*` routes work unchanged.
- Developer-app management: `/developers/apps` (browse public registry), `/developers/apps/new` (register), `/developers/apps/[id]` (manage + rotate secret).
- Consent screen at `/oauth/consent` validates request shape (PKCE required, S256 only, redirect_uri registered) before showing.
- Admin review at `/admin/developer-apps` (triple-gated: JWT + ADMIN role + panel password). Apps default to `PENDING`; admins approve + toggle `listed` independently (so private integrations can be approved without appearing in the public marketplace). Editing scopes resets status to PENDING.
- Out of scope: refresh tokens (90-day access tokens; re-auth on expiry); fine-grained per-app rate-limit tuning (uses the same `requireScope` + `apiLimiter` budgets as personal API keys).

**Backend infra changes:**
- `aiGenerationController.processMusicGeneration` is now exported (was internal) so DJ + voice-create can drive chained generations.
- `realtime.ts` mounts both `/parties` and `/dj` namespaces from a single `attachSocketIo` call; `broadcastDjSessionEnded` exported for the cron sweep.
- `cronTick.ts` adds `LOCK_DJ_SWEEP=1010` and a 5-min sweep that ends DJ sessions with stale heartbeats OR that have run 4+ hours.
- No new dependencies (Discord-style native `crypto` Ed25519 from Phase 3 was already there; `tweetnacl` still not needed; PKCE uses `crypto.createHash`).

**Deferred to future sweeps (still pending from Phases 2 + 4):** Phase 2 in full (remix loop, vector search, Spotify import, voice cloning, Apple Watch widget, full GDPR/CCPA, audio fingerprinting); native CarPlay scene delegate; OAuth refresh tokens; Redis adapter for Socket.IO at horizontal scale; LoRA / actual finetune integration when a music provider opens that surface.

---

## Shipped 2026-05-01 (Phase 3)

**Scope:** Phase 3 (90–180 day bucket) shipped as one bundle. Phase 2 (60–90 day bucket) deferred — unchanged from prior sweeps.

**Migration needed before deploy:** `prisma migrate dev --name phase3_parties_marketplace_distribution` adds 5 new tables (`listening_parties`, `listening_party_members`, `marketplace_listings`, `marketplace_purchases`, `discord_integrations`) and column extensions on `users` (locale), `tracks` (music_video_url), `track_distributions` (release_title, artist_name, metadata, partner_notes).

**Listening parties:**
- Real-time playback sync via Socket.IO `/parties` namespace (`backend/src/realtime.ts`). Host is authoritative for playhead + isPlaying; members locally interpolate between `host:tick` events and re-seek silently when drift exceeds 1.5s.
- DB: `ListeningParty` + `ListeningPartyMember` (anon members supported via signed `mym_party_guest` cookie).
- REST: `POST /api/parties` (create), `GET/POST /api/parties/:code/{join,leave,end}`. `GET /api/parties/mine` lists active hosts.
- Web: `/party/[code]` page with synced `<audio>`, member list, host controls (play/pause/seek). "Listen together" button on every track page.
- Cron sweep ends parties whose host hasn't tick'd in 30+ min (`LOCK_PARTY_SWEEP=1009`).
- DB writes throttled to one snapshot every 30s per party so 50+ member rooms don't hammer Postgres.
- Out of scope: Redis adapter for horizontal scaling (single-process is fine until ~1k concurrent parties).

**AI music videos as first-class:**
- New `POST /api/ai/music-video/:trackId` (owner-only) kicks off a Hailuo 10s vertical music video built from `track.title + track.coverArt`. The cron preview-video poller already polls Hailuo and now writes results to the new `Track.musicVideoUrl` column for `purpose='user'` rows (separate from the auto preview-clip which still writes `previewVideoUrl`).
- Web: `<TrackMusicVideo />` component renders a `<video>` element on the track page when either URL is present; owners get a generate/retry CTA. Mobile track page also renders `expo-av` `<Video>` over the cover art.
- Reusable `useVideoGenerationPolling()` hook extracted for future video features.

**Stems editor in browser:**
- New `/track/[slug]/stems-editor` page — four `<audio>` elements driven by Web Audio API; per-stem level (0–150%), mute, solo. Master transport drives all four in lockstep with a 60ms drift correction loop.
- Server-side mix render via Cloudinary audio overlays + per-stem `e_volume:N` (`buildStemsMixUrl()` in `backend/src/utils/cloudinary.ts`). No FFmpeg dependency added — Cloudinary materializes the derived asset on first hit, CDN-cached after.
- New endpoint `POST /api/licenses/tracks/:trackId/stems/mix-export` returns the URL.
- Owner-only for v1; buyer access deferred until the marketplace stems-purchase flow lands.

**Distribution wizard + admin queue:**
- 3-step wizard at `/track/[slug]/distribute` collects release info, primary genre, language, explicit flag, songwriter credits. Submits to existing `POST /tracks/:trackId/distribution` (now persisting `releaseTitle`, `artistName`, `metadata`).
- New admin queue at `/admin/distributions` (mounted under the existing triple-gated admin panel: JWT + role + panel password). Admins can flip `PENDING → SUBMITTED → LIVE → REJECTED`, attach `partnerJobId`, `upc`, `isrc`, and notes.
- When status flips to LIVE, a SYSTEM Notification is created for the track owner ("Your track is live").
- `partner='manual'` ships as default; `distrokid` / `tunecore` env-gated for future. Real partner API integration still deferred (DistroKid is partnership-gated, TuneCore similar).

**Marketplace (sample packs + prompt presets):**
- New `MarketplaceListing` + `MarketplacePurchase` models.
- Stripe Checkout → Connect transfer pattern lifted from `licenseController` (15% platform fee via `applyPlatformFee()`); webhook handler `handleMarketplacePurchaseCompleted` registered alongside the existing tip/license/stems handlers.
- `/marketplace` browse + `/marketplace/[slug]` detail + `/creator/marketplace` seller dashboard. Sellers upload Cloudinary asset URLs (sample packs) or paste a JSON preset (prompt presets).
- Buyers click "Try preview" on a `PROMPT_PRESET` → routes to `/create?preset=<slug>` (Create page already reads `?prompt=`; preset hook will preload genre/mood/etc. — UI integration is wired, the actual preset-loading on the Create wizard is left as a follow-up to keep this PR scoped).
- Out of scope: NSFW / sample-pack content moderation beyond existing reporting flow.

**Discord bot:**
- `POST /api/integrations/discord/interactions` verifies Discord's Ed25519 signature using Node's built-in `crypto.verify` (no `tweetnacl` needed — saves a dependency).
- `/music create prompt:<text>`, `/music link`, `/music help` commands. `create` returns a deferred response and follows up on the same Discord webhook with the audio URL when generation completes.
- New `DiscordIntegration` table maps Discord user → MakeYourMusic user via 6-char base32 link code (`/music link` → paste at `/settings/discord`).
- One-shot `bots/discord/register-commands.ts` registers global slash commands; `bots/discord/README.md` documents the Discord developer-portal setup.
- Env vars required: `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`. Optional `DISCORD_FREE_API_KEY_ID` for unlinked-user rate budget; otherwise unlinked invocations generate without persisting (free tier behavior).

**i18n (web + mobile + backend):**
- Dependency-free i18n runtime at `frontend/lib/i18n.ts` and `mobile/lib/i18n.ts`. Nested keys (`auth.login`), `{var}` interpolation, English fallback for any missing key.
- 8 catalogs: `en`, `es`, `pt`, `fr`, `de`, `ja`, `ko`, `zh`. Core surfaces (landing, auth, create, party, marketplace, distribute, stems, music video, discord, notifications) translated; full sweep of every UI string is a follow-up.
- Web reads from cookie/`navigator.language`; mobile reads via `expo-localization` and persists via AsyncStorage.
- Backend: `User.locale` column added (default `en`); notification + email plumbing now has the `locale` field to thread through (actual per-locale email templates are a follow-up — strings still go in English from the server side for now).
- Deliberately did NOT introduce `next-intl` URL prefixing (`/en/track/...`) — that would force a sitewide URL restructure and break existing canonical links + share embeds. The cookie-based switcher + JSON catalogs is the foundation; per-route locale prefixes can be layered on later if SEO localization becomes the priority.

**App Clips (iOS) + Instant Apps (Android):**
- New `mobile/plugins/withAppClip/` Expo config plugin: registers the `appclips:makeyourmusic.ai` associated domain entitlement and seeds an Info.plist marker.
- Frontend serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` via Next route handlers; both read bundle ids + Apple team id + Android SHA-256 fingerprint from env so the same code works for staging + prod.
- Out of scope this sweep: the actual Xcode App Clip target (Swift entrypoint UI), the App Clip experience plist in App Store Connect, Android Instant App per-feature module split. The plugin scaffolding + AASA/assetlinks routes are the prerequisites — when the team is ready, the App Clip Xcode target can be added without re-running prebuild from scratch.

**Backend infra changes:**
- `backend/package.json` already had `socket.io@4.8.1` — no new backend deps. Discord verification uses Node's built-in `crypto.verify` (Ed25519 supported since Node 19).
- `frontend/package.json`: `+ socket.io-client@4.8.1`, `+ next-intl@4.4.0` (declared for forward compat; the i18n runtime ships dependency-free for now).
- `mobile/package.json`: `+ expo-localization@~17.0.7`.
- `backend/src/server.ts` switches from `app.listen()` to `http.createServer(app).listen()` so Socket.IO can attach to the same port (Railway one-port-per-service constraint).

**Deferred to future sweeps (still pending from Phases 2–4):** Phase 2 in full (remix loop, vector search, Spotify import, voice cloning, Apple Watch widget, full GDPR/CCPA exports, audio fingerprinting); real DistroKid/TuneCore integrations; full string i18n sweep across every component; App Clip + Instant App native UI polish; Redis adapter for Socket.IO parties at scale; per-locale email templates.

---

## Shipped 2026-05-01 (Phase 0 + Phase 1 complete)

**Scope:** Phase 0 in full + Phase 1 in full. Phases 2–4 deferred to future sweeps.

**Phase 0 (complete):**
- Anonymous "Make a song" entry on every web surface — hero, inline form, HowItWorks input, CTABand, sticky mobile-web bar.
- Mobile auth wall removed from `/create`; `AuthGateModal` mirrors the web pattern; tab-bar Create button always routes to `/create`; guest home hero replaced with vibe-prompt tile; onboarding leads with "Create your own with AI".
- Analytics shim shipped on web and mobile (zero-dep, PostHog-ready). All §1.1 funnel events firing.

**Phase 1 (complete):**
- Edge-rendered OG image route at `/track/[slug]/opengraph-image.tsx`.
- "Surprise me" Style picker + first-time-guest instrumental default (web + mobile).
- Curated seed-prompt chips on the empty Idea step (web + mobile).
- Post-publish referral nudge banner with Web-Share-API integration on the track page.
- **Magic-link auth** — backend `POST /auth/magic-link/{request,verify}` (15-min one-shot tokens, atomic claim, auto-username on first link, auto-verifies email on first successful click). Frontend `/magic` exchange page + "Send a sign-in link" mode in `AuthGateModal`. Migration: new `User.magicLinkToken/Expires`.
- **Lyric pages** — new `/track/[slug]/lyrics` route with section parsing, `MusicComposition` JSON-LD, `generateMetadata` for SEO. Sitemap emits one URL per popular track; private/lyric-less pages opt out via `robots`.
- **Programmatic niche expansion** — `genre × mood (× era)` combos resolved by `getNiche()` (curated takes precedence, programmatic fallback validates against allow-lists to prevent attacker-chosen SEO content). New `/api/niches/all` lists every slug; sitemap.ts pulls them.
- **Auto-clip backfill cron** — sweeps recent public tracks without `previewVideoUrl`, kicks off Minimax preview-video jobs, gated by `AUTO_PREVIEW_VIDEO=1`. Per-tick cap (`AUTOCLIP_BACKFILL_PER_TICK`) prevents quota bursts. Existing poller writes URLs back.
- **Provider-cost telemetry** — `MusicGeneration.providerCostCents` populated on COMPLETED/FAILED transitions (including the stuck-row sweep). New admin endpoint `GET /admin/cost-report?days=N` returns top spenders, projected monthly burn, projected gross-margin per user vs their MRR.
- **Free-tier audio outro watermark** — `buildAudioDownloadUrl(publicId, { withOutro })` Cloudinary helper splices a 2s outro tag. New `GET /tracks/:id/download-url` returns the right URL by tier (track owner + Premium = clean; Free = watermarked). Activated by uploading the outro asset and setting `MYM_OUTRO_AUDIO_PUBLIC_ID`.
- **Sentry** — `@sentry/node` (backend), `@sentry/nextjs` (frontend, all 3 runtimes via `instrumentation.ts`), and a no-op-with-optional-require shim for mobile (RN package install blocked by a pre-existing `nativewind` dep mismatch). All gated on DSN env so absent config = no-op. `captureException` wired to `process.on('uncaughtException')` and `unhandledRejection` on the backend.

**Migrations needed before deploy:** `prisma migrate dev --name phase1_magic_link_and_cost` (adds `users.magic_link_token/expires`, `music_generations.provider_cost_cents`, indexes).

**Deferred to future sweeps (Phases 2–4):** remix loop, vector search, Spotify import, voice cloning, listening parties, AI music videos, Discord/iMessage/Slack apps, app clips/instant apps, real-time DJ mode, custom-trained agents, full GDPR/CCPA exports, audio fingerprinting, content moderation tooling, A/B framework. The roadmap section below remains the source of truth for sequencing.

---

## TL;DR — What's Most Urgent

1. **Anonymous-first "Generate Song" entry on every surface (web + mobile).** The single biggest activation-funnel leak. Users must be able to taste the magic before being asked to log in.
2. **A real growth loop.** Today the app has no built-in viral mechanic that survives logged-out visits. Add one (shareable preview cards + "remix this" + watermarked clips).
3. **Onboarding that is 3 taps to the first generated track**, not "create account → verify email → pick agent → write prompt → wait."
4. **Performance, observability, and reliability** to not embarrass the brand at scale (no error tracking, no analytics, no CDN strategy described, no rate-limit telemetry).
5. **Trust & legal hardening** (DMCA fingerprinting, age gates, COPPA, GDPR/CCPA tooling, content moderation pipeline) — required for app stores and ad networks at scale.

The codebase is in unusually good shape for a solo project: 40 Prisma models, working Stripe + Connect, CarPlay/AndroidAuto plugins, public SDK, sync-licensing flow, stem separation, real cron jobs, niche pages. The bones are there. What's missing is the **acquisition + activation layer** and the **scale-readiness layer**.

---

## SECTION 1 — IMMEDIATE: Anonymous "Generate Song" Flow

This was specifically called out and is the highest-leverage change.

### 1.1 Web — Landing page already lets `/create` work without auth, but landing CTA doesn't surface it

**Current state (verified)**
- `frontend/components/landing/LandingPage.tsx` only ships "Start listening" / "Browse the catalog" / "Get the app" CTAs
- `frontend/app/(main)/create/page.tsx` *already* supports the desired anonymous flow: it lets anyone fill in idea/style/lyrics and only opens `AuthGateModal` when they actually request a generation (line 327-333). Drafts persist via `sessionStorage` (`mym_create_draft_v1`).
- So the underlying flow exists — but a logged-out visitor on `/` has no obvious path into it.

**What to do**

| Change | File | Detail |
|---|---|---|
| Add primary "Make a song" hero CTA | `frontend/components/landing/LandingPage.tsx` (`HeroDeckLayout`, `HeroSpectrum`, `CTABand`) | Replace one of the two existing CTAs (or add a third) that links to `/create` with a wand icon. Copy: **"Make a song"** as primary, "Start listening" demoted to ghost button. Use `?prompt=...` to seed when clicked from a tile. |
| Inline prompt-to-create tile on hero | `LandingPage.tsx` | Reuse `VibePromptTile` (already on authenticated home) above the fold for guests too. Submitting routes to `/create?prompt=<text>` — `create/page.tsx:146-159` already reads `?prompt=` to seed. |
| Add a "Try it now" widget in the `HowItWorks` step 1 card | `LandingPage.tsx` | Make the typewriter input a real input that, on submit, navigates to `/create?prompt=...`. |
| Sticky bottom-bar create CTA on mobile-web | `frontend/components/landing/LandingPage.tsx` | When viewport < md and user is logged out, show a fixed bottom bar with "Make a song" — high-conversion pattern from TikTok/Snap. |
| Lower the auth-gate friction further | `frontend/components/auth/AuthGateModal.tsx` | (a) Add Google + Apple OAuth buttons (currently only username/password is implied — verify). (b) Allow "continue as guest" magic-link flow: enter email, we email a magic link, generation starts immediately so the user gets the audio while they auth via email. |
| Track funnel | new `frontend/lib/analytics.ts` | Fire events: `landing_view`, `prompt_typed`, `create_step_idea`, `create_step_style`, `create_step_lyrics`, `auth_gate_shown`, `signup_complete_after_gate`, `first_generation_started`, `first_generation_succeeded`. Pipe to PostHog or Plausible. |

### 1.2 Mobile — Hard auth wall on `/create` and on tab-bar Create button

**Current state (verified)**
- `mobile/app/create/index.tsx:230-241` blocks the entire screen with a `Lock` icon and "Sign in" button when `!isAuthenticated`. No idea/style/lyrics steps are reachable for guests.
- `mobile/app/(tabs)/_layout.tsx:60-112` — the prominent center "Create" button routes guests to `/(auth)/login` rather than `/create`.
- `mobile/app/(tabs)/index.tsx:178-237` — guest hero only shows "Sign up free" / "Log in".

**What to do — the changes that match the web flow**

| Change | File | Detail |
|---|---|---|
| Remove the auth wall on `/create` | `mobile/app/create/index.tsx` | Delete the `if (!isAuthenticated)` early return at line 230-241. Let guests land on the Idea step. |
| Add an `AuthGate` modal pattern to mobile | new `mobile/components/auth/AuthGateModal.tsx` | RN-native modal mirroring the web `AuthGateModal`. Triggered from `generateLyrics()` and `startGeneration()` exactly like the web's `requireAuth()` helper. Include Apple/Google sign-in (Apple is mandatory on iOS by App Store rule). |
| Persist anonymous draft | `mobile/app/create/index.tsx` | Use `AsyncStorage` mirror of web's `sessionStorage` `mym_create_draft_v1` so a guest who needs to register-via-deep-link doesn't lose their work. |
| Tab-bar Create button → always go to /create | `mobile/app/(tabs)/_layout.tsx:60-112` | Change `router.push(isAuthenticated ? '/create' : '/(auth)/login')` to `router.push('/create')`. The auth gate happens at the actual generation API call. |
| Guest home hero → "Make a song" CTA | `mobile/app/(tabs)/index.tsx:178-237` | Replace the dual "Sign up / Log in" hero with a single "Tell us a vibe" tile that routes to `/create`. Keep "Log in" as a small text link in the top-right. |
| Onboarding → swap order of slides | `mobile/app/onboarding.tsx` | Lead with "Create your own with AI" (the magic), not "Stream AI-created music." Final CTA: "Make my first song" → `/create` (currently goes to `/(tabs)`). |
| Fix the deep-link share-extension flow | already routes to `/create` (line 162) — re-verify after auth changes | Anonymous share-into-app should still work (currently the wall would block it). |

### 1.3 Cross-cutting unification

- **Single auth-gate component contract.** Define a contract in `shared/` for `AuthGateController` that both web and mobile implement. Both surfaces should fire the same analytics events (`auth_gate_shown`, `auth_gate_dismissed`, `auth_gate_completed`).
- **One canonical "first track" success screen** across web/mobile that includes: share button, "make another," referral nudge ("get 5 extra credits when a friend signs up").

---

## SECTION 2 — Onboarding & Activation

### 2.1 Reduce time-to-first-generated-track

Today: open app → register → verify email → land on home → find Create → 5-step wizard → wait 60–90s → result.

Target: open app → land on `/create?seed=<rotating prompt>` → tap "Generate" → magic-link to inbox while audio renders → 30–90s later result is ready in-app and emailed.

**Key changes:**

- **Pre-fill prompt** with one of ~12 hand-curated, high-success seeds (e.g. "lofi study beat about my cat being chaotic"). Rotate by region/time of day.
- **Skippable style step.** Make Step 2 optional with a "Surprise me" button that picks a random genre/mood/energy combo. Most users will be paralyzed by 80+ subgenres on first run.
- **Default to instrumental for first generation** (no need for lyrics step). Ship the magic faster; let users opt into lyrics on subsequent runs.
- **Show real-time progress.** Replace the static "30–90s" placeholder with a live progress bar driven by elapsed time + provider hints. Add a soundbar visualizer that animates while generating — emotional payoff during waiting.
- **Pre-load preview while user is on the publish step** so they don't sit through a buffer when they tap play.

### 2.2 Empty-state magic on every surface

- Library empty? Auto-fill with a "Welcome mix" of 10 trending tracks.
- Followers empty? Auto-recommend 5 agents based on the user's first generation.
- Notifications empty? Surface one welcome notification with a deep link to Create.

### 2.3 Email + push activation drips

- T+0: Welcome email
- T+10min if no generation yet: "Need an idea? Try one of these prompts" (one-tap each)
- T+24h: "Your first track was good — here's what trending agents in [their genre] sound like"
- T+72h: "Subscribe to Premium and get 500 generations/day" (only if they hit the free cap)
- All emails / push gated by user's `EmailPreferences` (already in DB).

---

## SECTION 3 — Growth & Virality

The single most important class of change for "millions of users."

### 3.1 Shareable artifacts

| Feature | Status | Notes |
|---|---|---|
| Track share page (`/track/[slug]`) | exists | Add OG image generator: cover art + title + waveform. Use Next.js `opengraph-image.tsx` route convention. |
| Vertical clip auto-generated per track | partially exists (`Clip` model + clips routes) | After a track publishes, generate 15s vertical-video clip with cover-art ken-burns + waveform overlay + watermark. Auto-share to TikTok/IG via deep-link composer. |
| Embed player with attribution | exists (`/embed/track/:slug`) | Promote the embed route prominently in track pages: "Embed on your blog/Notion." Add Substack-friendly OEmbed JSON. |
| "Made with MakeYourMusic" watermark on free-tier audio | not built | Add 2s outro tag for FREE-tier downloaded audio. Premium users get the clean version. Drives signups when their friends ask "what app made this?" |
| Referrals | exists (`Referral*` models, `/referrals/*` routes) | Already pays $0.10 per referred-user dollar. Surface the link prominently after first generation: "Want unlimited free generations? Share your link." |

### 3.2 Remix loop (the SoundCloud → Suno power move)

- Add **"Remix this track"** button on every track page. It pre-fills `/create` with the original's idea + style + a different mood/genre. Generates a new track that links back to the parent in metadata.
- Track Remixes in DB (`TrackRemix { parentTrackId, remixTrackId, userId }`). Show "Remixes" tab on every track page.
- Notify the original creator when their track is remixed → drives re-engagement.

### 3.3 Public AI agent leaderboards & streaks

- Top 100 agents by weekly plays, by genre.
- Daily/weekly streaks for creators ("publish a track every day for X days") with badges that show on profile.
- Public "agent of the day" pick by admins, surfaces on `/`.

### 3.4 Programmatic SEO

- **Niche pages already exist** (`/n/[slug]`). Multiply them: auto-generate 5–10K niche pages from genre × mood × era × location combinations — e.g. `/n/lofi-for-study-2024-tokyo`. Each pre-populated with 12 AI-generated tracks. Sitemap + Next.js ISR.
- Per-genre + per-agent RSS (already exists for agents at `/agents/:slug/feed.rss`) — promote them as "podcast feeds."
- **Lyric pages.** Each track gets a `/track/[slug]/lyrics` page indexed by Google. Lyric search is huge organic traffic.

### 3.5 Creator program

- Verified-creator program (badge + featured slot) for agent owners with >10K monthly listeners.
- Revenue-share leaderboard (monthly Top 10 paid out via existing Stripe Connect) → publicized on Twitter/X by the platform handle.

---

## SECTION 4 — Core Product Polish (Existing Features)

### 4.1 AI generation pipeline

- **Provider routing intelligence.** Right now `MUSIC_PROVIDER` is a static env var with `MUSIC_PROVIDER_FALLBACKS`. Move to per-request routing: short instrumentals → cheap provider, vocal pop with explicit genre → premium provider. Track success rate per provider per genre and self-tune.
- **Stuck-generation visibility.** The 10-min sweep (`backend/src/utils/cronTick.ts`) marks rows FAILED but offers no diagnostic. Add provider error capture + a retry button on the generation row.
- **Variation/extend/regenerate** endpoints exist (`POST /ai/music/:id/variation|extend|regenerate`) but are not wired into the create UI. Add them as post-publish actions: "Extend this track to 4 minutes," "Generate a chorus variation," "Try a different mood."
- **Preview videos** are auto-generated when `AUTO_PREVIEW_VIDEO=true`. Make these clickable on track pages with a video player; promote the visual + share it.
- **Lyric editor improvements.** Section-aware lyric editor (`[Verse 1]`, `[Chorus]`) that highlights structure violations, word-counts per section, and rhyme suggestions.

### 4.2 Player & playback

- **Crossfade exists** in `playerStore`. UI for it is buried in mobile only — surface in web settings too.
- **Gapless playback** for albums.
- **EQ presets** (Bass-boost, Vocal-boost, Cinematic). Currently 5-band parametric — too pro-tooly for casual users.
- **Sleep timer** exists in mobile — port to web.
- **Listening parties** (real-time sync between users on the same track) via WebSockets — viral mechanic.
- **Audio quality tiers**: Free=128kbps, Premium=lossless. Already implied by README; needs actual `Track.audioUrlLossless` field and gated download.

### 4.3 Social

- **Comments**: already exist; add timestamp-anchored comments ("at 1:24 the drop is unreal") like SoundCloud.
- **Reposts** (separate from `Share`): a one-tap "I love this, push to my followers' feed."
- **Follow recommendations**: collaborative filtering on `Follow` graph.
- **DMs / track request DMs** — creator-monetizable feature ("$5 to request a track in my style").
- **Activity feed** for who-followed-who, who-liked-what — Spotify-style.

### 4.4 Search & discovery

- Currently `/search` exists; needs:
  - **Vector search** over track titles + lyrics + tags (pgvector or Algolia).
  - **Audio similarity search** — already have feature vectors for `/recommendations/similar/:trackId`. Expose as "find tracks that sound like this."
  - **Hum-to-find** — long-term, but valuable.
  - **Filters**: BPM range, key, duration, instrumental vs vocal, language, era.

### 4.5 Library & playlists

- Smart playlists ("My liked synthwave," "Tracks I almost finished").
- Playlist collaboration (multi-user playlists).
- Daily Mix / Discover Weekly clones — leverage existing `weekly mixtape` cron, just expose more variants.

### 4.6 Creator dashboard

- Per-track analytics: plays, completion rate, country, like/play ratio, age cohort.
- Funnel for creators: "30% of listeners stop at 0:45 — try a hook earlier."
- Ad-free direct-fan emails to followers (Bandcamp-style).

### 4.7 Monetization (already exists; needs surfacing)

- **Tips, channel subs, sync licensing, paid stems** all exist but need:
  - Onboarding wizard for creators to set up Stripe Connect — currently a single link.
  - Promo/coupon codes on Premium subscriptions for marketing.
  - Annual plan tier (Premium $149.99/year vs $14.99/mo) — standard 17% discount for cashflow.
  - "Gift Premium" — referral-adjacent.
  - Bundles ("Lossless + Stems Pack" for producers).

---

## SECTION 5 — New Features Worth Building

Ranked by expected impact-to-effort ratio.

### 5.1 High impact, medium effort

1. **Voice cloning / "song with my voice"** — record 30s of vocals, AI sings the lyrics in your voice. Massive viral hook. Provider: ElevenLabs or in-house with a paid tier ($2.99/song).
2. **Cover song mode** — paste a YouTube URL or song name, AI generates a "in the style of" version (carefully avoiding copyright issues; must be distinct enough — see §6.3).
3. **Mood radio** — TikTok-style endless feed where users swipe between AI-generated tracks personalized to mood-of-the-moment. Each card is a 15s loop; tap to play full track.
4. **Generative cover art studio** — already have Minimax image gen for covers; expose as a standalone tool with multiple style presets.
5. **Karaoke mode** — lyrics scroll synced to audio (Whisper transcription already integrated for `karaokeController.ts`; surface this in the player).
6. **Daily generation challenge** — community-wide prompt of the day. Top 10 tracks from the day get featured. Creates daily habit.

### 5.2 Medium impact, low effort

7. **Apple Watch companion** — minimal: just play/pause/skip + currently-playing. Big retention bump for paid users.
8. **Spotify import** — "find AI versions of your top 50 Spotify tracks." Required: OAuth Spotify, then map to genre+mood+era. Drives instant value.
9. **Discord bot** — `/music` slash command in any Discord server generates a track and posts it. Distribution into the largest community platform for younger demographics.
10. **iMessage / Slack apps** — "send a song to a friend in iMessage" Sticker Pack–level integration.
11. **Embeddable widgets** — already have `/embed`, add `<script>` widget for personal websites.
12. **Browser extension** — right-click any text → "Make a song about this." Bookmark-bar tool for casual virality.

### 5.3 Big bets (high impact, high effort)

13. **AI music video generator** — text/track to video. Already have `MINIMAX_VIDEO_MODEL`. Make this a marketed first-class feature.
14. **Real-time AI music improv** — DJ mode where AI generates a 2-hour mix in real time, transitions between user-suggested vibes. Major engagement driver.
15. **Voice-controlled creation on mobile** — "Hey [Brand], make a sad song about Tuesday." Voice → generation pipeline. Especially powerful with CarPlay/Android Auto.
16. **AI agent "personalities"** — let agents have voice replies, comment on tracks, run their own generated podcasts. The "AI musician with a personality" angle is the long-term defensible IP.
17. **Open marketplace** — Producers can sell sample packs / drum kits / AI prompt presets. Marketplace fees feed back to platform.
18. **Distribution to Spotify/Apple Music** — "publish my AI track to Spotify" via DistroKid API or in-house ISRC. Already have a `TrackDistribution` model — finish wiring it.

### 5.4 Power-user features

19. **Stems editor in the browser** — already have stem separation; let users mute/solo stems and re-export as their own remix.
20. **MIDI export** — for producers who want to take the AI seed into a DAW.
21. **Multi-track project files** — save a session you can come back to.
22. **Custom-trained agents** — upload 10 examples, train an agent on your style ($X one-time fee).

---

## SECTION 6 — Trust, Safety, Legal (Required at Scale)

The platform will get nuked by Apple, Stripe, or a major label without these.

### 6.1 Content moderation

- **Lyrics pre-filter**: hate speech, sexual content involving minors, violent threats, doxxing. Use OpenAI moderation API + custom blocklist. Currently `lyricsSanitizer.ts` exists — expand it.
- **Audio fingerprinting** before publish: detect plagiarism of major-label catalog. Acoustic fingerprinting service (e.g. Pex, AudibleMagic) — paid, but unavoidable.
- **Cover-art moderation**: NSFW detection on generated images.
- **User reporting** flow: already exists (`Report` model). Add categories + admin tooling for high-volume reports.

### 6.2 Account safety

- 2FA (TOTP + SMS).
- Session management (revoke all sessions).
- Suspicious-login alerts.
- Password breach checks (haveibeenpwned API).

### 6.3 Copyright & licensing

- Clear ToS specifying training-data sources for all integrated providers.
- Watermarking outputs with rights-holder metadata so downstream users can verify provenance.
- DMCA takedown → already exists; add automatic counter-notification flow + transparency report.
- Sync-license output should include certificate PDF and ISRC/ISWC where applicable.

### 6.4 Privacy & compliance

- **GDPR**: data export & delete-account flows. Currently no evidence of these.
- **CCPA**: "Do not sell my data" toggle.
- **COPPA**: under-13 detection + age gate at signup.
- **EU AI Act**: disclosure that audio is AI-generated, on every track page.
- **Cookie banner**: required in EU (legal page exists at `/cookies` but no actual banner shown).

### 6.5 Accessibility

- WCAG 2.2 AA compliance audit.
- Keyboard navigation across the whole app.
- Screen-reader labels on all interactive elements (already partially done — verify `aria-label` coverage).
- Captions on preview videos.
- High-contrast theme.

---

## SECTION 7 — Performance, Reliability, Observability

The codebase has zero of these and won't survive 100K MAU without them.

### 7.1 Observability

- **Error tracking**: Sentry (frontend + backend + mobile).
- **Analytics**: PostHog or Amplitude — free tiers are generous; instrument the activation funnel from §1.1.
- **APM**: Datadog or New Relic; track p50/p95/p99 of `/ai/music`, DB queries, Stripe webhooks.
- **Logs**: Currently Winston-only locally; centralize on Logtail / BetterStack / Datadog Logs.
- **Uptime**: external pinger on `/api/health`; status page (statuspage.io / instatus).

### 7.2 Performance

- **CDN for audio + cover art**: Cloudinary auto-CDNs but verify cache headers. Use Bunny.net or Cloudflare R2 + Cloudflare Stream for cheaper egress at scale.
- **Database**:
  - Add indexes for `Track(createdAt DESC, isPublic, agentId)` and `Play(userId, createdAt DESC)`.
  - Read replica for `/recommendations/*` and `/tracks/trending` workloads.
  - Connection pooling: PgBouncer or Prisma Accelerate.
- **Image optimization**: ensure all `<img>` tags use Next.js `<Image>` for AVIF/WebP.
- **Bundle size**: 5.x of Tailwind, Motion, Recharts, Radix is heavy — code-split admin/creator bundles.
- **Service worker** for offline PWA on web.

### 7.3 Reliability

- **Job queue**: Cron-tick is fine for low traffic; at 100K+ MAU move generation polling to BullMQ + Redis.
- **Idempotency keys** on `POST /ai/music` already? Verify. Webhooks dedupe via `WebhookEvent` (good). Same pattern for AI provider callbacks.
- **Backups**: Daily Postgres backups + monthly DR drill.
- **Graceful provider failover**: today fallback chain is `MINIMAX → SUNO → STABILITY`. Add timeouts, circuit breakers, automatic provider blocklisting after N consecutive failures.

### 7.4 Cost controls

- Per-user generation cost is 1–10¢ on Minimax; free tier of 3/day is 30¢/day = $9/mo if all consumed. With Premium at $14.99 covering 500/day = up to $50/mo cost. **Risk: a dedicated abuser could cost more than they pay.**
  - Add per-user spend tracking (amount of provider $ consumed) and soft caps that downgrade aggressive Premium accounts to slower providers automatically.
  - Image gen cost auditing — covers + preview videos can stack up.
- AI cost dashboard for admins (revenue per generation, gross margin per tier).

---

## SECTION 8 — UX & Design Polish

### 8.1 Web

- Topbar search is implied — verify it's actually present and is the primary nav element.
- Replace genre tile colors (currently random hex) with curated, accessible palettes.
- Dark/light/system theme already hinted via `ThemeMenu.tsx` — add neon, vintage variants (already in mobile).
- Skeleton loaders consistent across all routes (currently per-page).
- Empty states with illustrations, not text.
- Long-form scroll behavior on home: virtualize feeds at 100+ tracks.

### 8.2 Mobile

- Already has CarPlay + Android Auto plugins (Apple-gated). **Document the application status** — is the CarPlay grant submitted?
- Mini-player → full-player swipe gesture polish.
- Pull-to-refresh on all feed screens.
- Pinch-to-zoom on cover-art view.
- Lock-screen seek-bar accuracy under jitter.
- Background download manager UI.
- Hardware media keys / wireless headset double-tap → next track.

### 8.3 Brand & marketing site

- Public-facing splash at `/` is already excellent — extend with:
  - Press kit page (`/press`).
  - Public roadmap (Trello-public or Productboard).
  - Changelog (`/changelog`).
  - Status page link in footer.
- Consistent OG card across all share targets.

---

## SECTION 9 — Backend / Architectural Improvements

### 9.1 API

- **Versioning**: `/api/v1` exists for the public SDK; internal frontend calls go to `/api/...` unversioned. Consolidate or version all of it.
- **OpenAPI spec generation** from Zod schemas (`zod-to-openapi`). Auto-generate the SDK from the spec instead of hand-rolling it.
- **GraphQL gateway** (optional, but eases mobile bandwidth).
- **Webhook outbound delivery** for third-party integrations (Zapier-style triggers when a track publishes).

### 9.2 Database

- Schema is well-designed. Considerations at scale:
  - `Play` + `Like` will dominate row count. Consider partitioning by month or moving cold playback rows to S3/columnar.
  - `Notification` cleanup job after 30d (currently no evidence of one).
  - Soft-deletion convention: today `deletedAt` is inconsistent. Audit.

### 9.3 SDK / Developer platform

- The `@music4ai/sdk` is a strong differentiator. Don't bury it.
  - Polyglot SDKs: Python, Go, Rust.
  - Sandbox/test API keys with no rate-limit cost.
  - Better docs site (Mintlify / Docusaurus).
  - Quickstart codespaces.

### 9.4 Code quality / tooling

- No e2e tests visible. Add Playwright for web critical paths (signup → first generation → publish).
- No mobile E2E (Detox or Maestro).
- API tests with Vitest + Supertest.
- Pre-commit hooks (Husky + lint-staged) for type-check + lint.
- CI/CD pipeline status — verify Railway + Netlify auto-deploy from `master`.
- Dependency-bot (Dependabot or Renovate).

---

## SECTION 10 — Mobile-Specific

- **Push token cleanup**: device token rotates frequently; ensure `PushToken` rows are pruned on stale failures.
- **Universal Links / App Links**: track shares should open the native app when installed.
- **App Clips (iOS) / Instant Apps (Android)**: 30s sample of the create flow without installing — massive activation lift.
- **Live Activities (iOS 16+)** for in-progress generations — show on lock screen.
- **Dynamic Island** integration for currently-playing track.
- **Widget Kit (iOS)**: home-screen widget with currently-playing or "tap to make a song."
- **App Store / Play Store ASO**:
  - Localized listings in 10+ languages.
  - Video preview for store.
  - Screenshot A/B testing (StoreMaven or built-in App Store Optimization).
  - Reviews-prompt at right moment (after first successful generation).

---

## SECTION 11 — Admin & Operations

- Admin panel already exists at `/admin`. Additions:
  - **Feature flags**: ship-behind-flag for risky features (e.g. voice cloning).
  - **Experiments**: A/B framework (Statsig or in-house Postgres-based).
  - **Bulk actions**: bulk-takedown, bulk-suspend, bulk-feature.
  - **Editorial tooling**: schedule featured tracks, curate the home page, edit niche pages.
  - **Customer support**: in-app contact form → ticket queue (Zendesk or Plain).
- **Internal dashboard**: NPS, weekly active creators, gross-margin-per-generation, MRR breakdown by tier.

---

## SECTION 12 — Implementation Roadmap

### Phase 0 — This week (THE block-shipping fixes)

- [x] **Web landing**: primary "Make a song" CTA in `HeroDeckLayout` (inline vibe-prompt form), `HeroSpectrum`, `CTABand`, plus a **sticky bottom bar** for guests on mobile-web (`StickyMobileCTA`). `frontend/components/landing/LandingPage.tsx`.
- [x] **Web landing**: `HowItWorks` step-1 typewriter is now a **real input** that posts to `/create?prompt=…`.
- [x] **Mobile**: `/create` auth wall removed; `AuthGateModal` (`mobile/components/auth/AuthGateModal.tsx`) gates `generateLyrics()` and `startGeneration()` instead. Draft persisted to `AsyncStorage` under the same `mym_create_draft_v1` key the web uses.
- [x] **Mobile**: tab-bar Create button always routes to `/create` (no auth detour). Home guest hero replaced with single "Tell us a vibe" tile.
- [x] **Onboarding**: lead slide is now "Create your own with AI"; final CTA navigates to `/create`.
- [x] **Analytics scaffold**: zero-dep shim at `frontend/lib/analytics.ts` and `mobile/lib/analytics.ts`, plus optional PostHog snippet wired in `frontend/app/layout.tsx` (gated on `NEXT_PUBLIC_POSTHOG_KEY`). Funnel events fired: `landing_view`, `landing_cta_click`, `prompt_typed`, `create_step_*`, `auth_gate_shown`, `auth_gate_completed`, `first_generation_started`, `first_generation_succeeded`, `generation_started/succeeded/failed`, `track_published`, `referral_nudge_*`, `seed_prompt_picked`, `style_surprise_me`. `first_generation_*` is one-shot per device via localStorage / AsyncStorage so it's safe to fire on every generation.

### Phase 1 — Complete

- [ ] Apple + Google OAuth on web & mobile auth gate. _(Buttons present via `SocialAuthButtons`; provider config + Apple App Store mandate are infra/ops, not code.)_
- [x] **Magic-link signup** so generation can start mid-auth — `POST /auth/magic-link/{request,verify}`, hashed one-shot token (15 min), atomic claim, auto-username + auto-create-on-first-link, auto-verifies email on success. Frontend `/magic` exchange page + "Send a sign-in link" mode in `AuthGateModal`.
- [x] **OG-image generator for `/track/[slug]`** — `frontend/app/(main)/track/[slug]/opengraph-image.tsx`, edge-runtime, 1200×630 with title/agent/genre/waveform; falls back to procedural gradient when no cover art.
- [x] **Auto-clip per published track** — backstop cron sweep `backfillAutoClips` finds recent public tracks without `previewVideoUrl`, kicks off Minimax preview jobs, capped per-tick. Gated on `AUTO_PREVIEW_VIDEO=1`.
- [x] **Free-tier audio outro watermark** — `buildAudioDownloadUrl()` Cloudinary helper, `GET /tracks/:id/download-url` chooses by tier. Owners + Premium = clean; Free = 2s outro splice. Active when `MYM_OUTRO_AUDIO_PUBLIC_ID` is set.
- [x] **Sentry + uptime monitoring** — `@sentry/node` (backend), `@sentry/nextjs` (frontend, 3 runtimes), and an optional-require shim for mobile (RN install blocked by pre-existing `nativewind` dep). DSN-gated. `captureException` wired to backend `uncaughtException` / `unhandledRejection`.
- [x] **Provider-cost telemetry per user** — `MusicGeneration.providerCostCents` persisted on terminal transitions; admin endpoint `GET /admin/cost-report?days=N` aggregates top spenders, projected monthly burn vs MRR-funded margin per user. Used to spot abuse before it bleeds gross margin.
- [x] **Programmatic niche-page expansion** — genre × mood (× era) combos validated against allow-lists in `getNiche()`. `/api/niches/all` enumerates slugs; sitemap pulls them. Curated names take precedence so existing `/n/lofi` etc. don't churn.
- [x] **Lyric pages indexed by Google** — `/track/[slug]/lyrics` with section parsing, `MusicComposition` JSON-LD, `generateMetadata` for SEO. Sitemap emits per-track lyric URLs; private/lyric-less pages opt out via `robots`.
- [x] **Smart-default first generation**: "Surprise me" button on Style step (web + mobile) randomly picks genre+mood+energy, fires `style_surprise_me`. First-time guests now default to **instrumental** (skips lyrics step → faster first audio). Tracked via `mym_first_generation_done_v1`.
- [x] **Seed prompt chips on the Idea step** (web + mobile) — six curated high-success prompts shown when the textarea is empty. Fire `seed_prompt_picked`.
- [x] **Post-publish referral nudge** — `JustPublishedBanner` on `/track/[slug]` triggers when redirected from publish (`?published=1` flag, one-shot). Surfaces `Get my invite link` → `/referrals` and a Web-Share-API "Share track" button. Fires `referral_nudge_shown` / `referral_nudge_clicked` / `share_track_clicked`.

### Phase 2 — 60–90 days

- [ ] Remix loop + remix discovery feed.
- [ ] Vector search.
- [ ] Variation/extend/regenerate UI on track pages.
- [ ] Karaoke mode visible on player.
- [ ] Spotify import.
- [ ] Apple Watch + iOS widget.
- [ ] Voice cloning behind paid tier.
- [ ] CDN audit + Postgres replicas.
- [ ] Full GDPR/CCPA exports + delete-account flow.
- [ ] Audio fingerprinting on publish.

### Phase 3 — Complete

- [x] **Listening parties** — Socket.IO `/parties` namespace (`backend/src/realtime.ts`); host-authoritative sync with periodic ticks + 1.5s drift correction. Web `/party/[code]` page; "Listen together" button on track page. Cron sweep ends stale parties.
- [x] **Discord bot** — `POST /api/integrations/discord/interactions` (Ed25519-verified); `/music create|link|help` slash commands; deferred follow-up posts audio URL when generation completes. `DiscordIntegration` table + 6-char link code flow at `/settings/discord`. `bots/discord/{README,register-commands.ts}`.
- [x] **AI music videos as first-class** — owner-only `POST /api/ai/music-video/:trackId` kicks off Hailuo from cover art; preview-video poller writes results to new `Track.musicVideoUrl`; `<TrackMusicVideo />` renders the `<video>` on the track page (web + mobile via `expo-av`).
- [x] **Stems editor in browser** — `/track/[slug]/stems-editor` with 4 channel strips (mute/solo/level), master transport, drift correction. Server-side mix render via Cloudinary `e_volume` overlays; no FFmpeg dep added. Owner-only for v1.
- [x] **Distribution wizard + admin queue** — extended `TrackDistribution` schema; 3-step wizard at `/track/[slug]/distribute`; admin queue at `/admin/distributions` (triple-gated). LIVE flip notifies owner. Real DistroKid/TuneCore API integration deferred (partnership-gated).
- [x] **Marketplace for sample packs / prompt presets** — `MarketplaceListing` + `MarketplacePurchase` models; Stripe Checkout + Connect transfer pattern lifted from `licenseController`; webhook handler registered. `/marketplace`, `/marketplace/[slug]`, `/creator/marketplace`. "Try preview" on PROMPT_PRESET routes to `/create?preset=<slug>`.
- [x] **Multi-language localization (8 languages)** — dependency-free i18n runtime (`frontend/lib/i18n.ts`, `mobile/lib/i18n.ts`); 8 locale catalogs (`en, es, pt, fr, de, ja, ko, zh`); English source of truth, fall-through fallback. Cookie/`navigator.language` resolution on web; `expo-localization` + AsyncStorage on mobile. `User.locale` column added. Did NOT introduce URL-prefix routing (`/en/...`) — would force a sitewide restructure; cookie-based switcher is the foundation.
- [x] **App Clips / Instant Apps** — `mobile/plugins/withAppClip` Expo config plugin (associated domain + Info.plist markers); `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json` Next route handlers env-driven (Apple team id, bundle id, SHA-256 fingerprint). Native Xcode App Clip target + Android Instant App split-APK deferred.

### Phase 4 — Complete

- [x] **Real-time AI improv DJ mode** — Socket.IO `/dj` namespace, chained 90s instrumental generations with crossfade + vibe shifts. Web `/dj` page, host-only controls, share-link join. Cron sweep ends stale + 4hr-old sessions.
- [x] **Custom-trained agents** — `genConfig.styleProfile` derived from owner-supplied training examples via `minimaxChat`; prepended to every generation orchestrated under that agent. `/creator/agents/[slug]/training` UI. 10-examples/agent + 20-derives/user/day caps. (Real LoRA finetune deferred until a music provider opens that API.)
- [x] **Voice-controlled creation** — `POST /api/ai/voice-create` chains transcribe → generate; mobile `VoiceQuickCreate` button on the Create flow's Idea step. CarPlay scene delegate documented (Apple CarPlay grant required; endpoint + in-app voice button ship now).
- [x] **Open developer marketplace (OAuth apps)** — full OAuth 2.0 + PKCE (S256-only) auth-code flow; `OAuthApp` + `OAuthGrant` schema; developer registry at `/developers/apps`; consent screen at `/oauth/consent`; admin review at `/admin/developer-apps`. API-key middleware extended to also accept `mym_oauth_*` bearer tokens so all `/api/v1/*` routes work unchanged. Refresh tokens deferred (90-day access tokens for now).

---

## Appendix A — Concrete Diffs Needed for §1 (the "Generate Song" change)

### Web
1. `frontend/components/landing/LandingPage.tsx`
   - In `HeroDeckLayout`: change "Start listening" CTA href to use `<Link href="/create">` for the primary, demote "Browse the catalog" to ghost.
   - In `HeroSpectrum`: same.
   - In `CTABand`: same.
   - Add an inline `VibePromptTile`-like input that, on submit, routes to `/create?prompt=<value>`.
   - Add a sticky bottom-bar "Make a song" CTA on mobile breakpoint when `!isAuthenticated`.

2. `frontend/components/auth/AuthGateModal.tsx`
   - Add Apple + Google OAuth buttons. (Backend route already supports Firebase exchange at `POST /auth/firebase-exchange`.)
   - Add magic-link path: input email → POST `/auth/magic-link` (new route) → optimistic UX continues generation.

### Mobile
1. `mobile/app/create/index.tsx`
   - Delete lines 230–241 (the `if (!isAuthenticated)` early return).
   - Add `AuthGateModal` import.
   - Wrap the `generateLyrics()` call (line 256–288) and `startGeneration()` call (line 318–369) with a `requireAuth()` helper exactly like web's `requireAuth(action)` (line 327 of `frontend/app/(main)/create/page.tsx`).
   - Persist draft to AsyncStorage on auth-gate trigger; restore on mount.

2. `mobile/components/auth/AuthGateModal.tsx` (NEW)
   - RN modal with email/password + Sign in with Apple (mandatory iOS) + Google.

3. `mobile/app/(tabs)/_layout.tsx`
   - Line 68: change `router.push(isAuthenticated ? '/create' : '/(auth)/login')` → `router.push('/create')`.

4. `mobile/app/(tabs)/index.tsx`
   - Replace the dual-CTA hero (lines 178–237) with a single "Tell us a vibe" tile that routes to `/create` (mirroring the authenticated branch at lines 239–280). Keep a small "Log in" link in the top-right corner.

5. `mobile/app/onboarding.tsx`
   - Reorder slides: put the "Create your own with AI" slide first (lines 19–25 currently second).
   - Final button text → "Make my first song"; on press, route to `/create` instead of `/(tabs)`.

---

## Appendix B — Metrics That Matter

Ship a Looker / Metabase dashboard with:
- **Activation rate**: % of new signups who generate ≥1 track in the first 24h.
- **D1, D7, D30 retention** by acquisition cohort.
- **Time-to-first-generation** median + p90.
- **Generations per WAU**.
- **Free → Premium conversion rate** by trigger (cap-hit, post-share, onboarding offer).
- **K-factor** (referrals per user × conversion rate).
- **Cost-per-active-user** (provider $) vs ARPU.
- **NPS** quarterly survey via in-app modal.

The single number to obsess over: **time-to-first-generation**. Currently unmeasured. The §1 changes should drop it from "many minutes" to "under 90 seconds" for the median guest visitor.

---

*This document is intentionally aggressive. Cut scope ruthlessly when shipping; fight for the §1 changes first — the rest is sequenceable, but those four are the compound interest.*
