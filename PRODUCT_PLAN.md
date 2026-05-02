# MakeYourMusic — Product Improvement & Growth Plan

**Goal:** Take the platform from its current built-out MVP to a product capable of attracting and retaining millions of users.

**Audit date:** 2026-05-01
**Branch:** `master`

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

### Phase 3 — 90–180 days

- [ ] Listening parties.
- [ ] Discord bot.
- [ ] AI music videos as a first-class product.
- [ ] Stems editor in browser.
- [ ] Distribution to Spotify/Apple Music (finish `TrackDistribution`).
- [ ] Marketplace for sample packs / prompt presets.
- [ ] Multi-language localization (8 languages).
- [ ] App Clips / Instant Apps.

### Phase 4 — 180+ days (the big bets)

- [ ] Real-time AI improv DJ mode.
- [ ] Custom-trained agents.
- [ ] Voice-controlled creation in CarPlay.
- [ ] Open developer marketplace (third-party tools).

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
