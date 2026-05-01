# MakeYourMusic — Bug Review

Generated: 2026-05-01
Branch: `master`
Scope: backend (Node/Express/Prisma), frontend (Next.js 15), mobile (Expo/React Native), shared utilities, SDK package, Prisma schema, build/deploy scripts.

This is the consolidated output of six parallel reviews — one per area. Each finding cites a file path and line range, severity, category, the bug, the impact, and a suggested fix. Style/lint issues were excluded; this is signal only.

---

## Severity Tally

| Area | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Backend controllers / routes | 0 | 0 | 11 | ~50 | ~61 |
| Backend middleware / utils / providers / server | 0 | 6 | 23 | 25 | 54 |
| Frontend pages (Next.js app router) | 0 | 4 | 17 | 24 | 45 |
| Frontend components / lib | 0 | 3 | 8 | 37 | 48 |
| Mobile (Expo / RN) | 0 | 4 | 16 | 36 | 56 |
| Shared / SDK / Prisma / scripts / Railway | 4 | 16 | 24 | 30 | 74 |
| **Total** | **4** | **33** | **99** | **~202** | **~338** |

---

## Top-Priority Triage (Critical & High)

These will hurt customers, money, or production data first. Fix in roughly this order.

### Critical

1. **`railway.json:9` — `prisma db push --accept-data-loss` on every Railway deploy.** Any column-rename or schema restructure that requires data migration will silently DROP COLUMNS / TABLES in production. Switch to `prisma migrate deploy`. (See [Build & Deploy](#build--deploy--scripts) §B-1.)
2. **`railway.json:5` — Web service build does not run `prisma generate`.** Frontend Prisma client is targeted at `frontend/generated/prisma`; without `prisma generate`, the build fails after any schema change. (See [Build & Deploy](#build--deploy--scripts) §B-3.)
3. **`sdk/src/index.ts:81-83` — SDK `Music4AIError.body` echoes raw server response into thrown errors.** If a downstream app logs `error` (Sentry/Datadog) along with the request config, the bearer key from `Authorization: Bearer …` can surface in logs. (See [SDK](#sdk-package) §SDK-3.)
4. **`prisma/schema.prisma:815, 844` — `Tip.toUser` and `ChannelSubscription.creator` use `onDelete: Cascade`.** Deleting a creator destroys all received tips and channel subs — payment / audit-trail data is lost. Switch to `Restrict` or soft-delete users. (See [Prisma](#prisma-schema) §P-22.)

### High

Auth, payments, and provider hangs:

- **`backend/src/utils/encryption.ts:69, 73` — `decrypt()` returns input verbatim when `:` is missing.** Contradicts its own "fail closed" comment; a colon-less value flows back to callers as if decrypted.
- **`backend/src/utils/db.ts:33-39` — Auto-rewriting `sslmode=prefer` to `sslmode=verify-full` will hard-break legitimate managed-DB connections (no public CA on Railway internal). Drop the rewrite or use `require`.
- **`backend/src/middleware/rateLimiter.ts` — In-memory rate-limit store across multi-replica.** With N replicas every limiter is N× weaker; brute-force protection on `/auth/login` and AI cost limits are effectively defeated. Add `rate-limit-redis` keyed off `REDIS_URL`.
- **`backend/src/utils/minimax.ts` (multiple lines) and `backend/src/utils/stems.ts:48, 82` — All MiniMax / Replicate `fetch` calls have no timeout.** A single provider outage hangs every Express worker until OS TCP timeout. Add `signal: AbortSignal.timeout(...)`.
- **`backend/src/utils/collabSplits.ts:152-202` — Stripe `transfers.create` has no idempotency key.** A webhook replay or in-line + cron double-invocation can issue the same payout twice. Pass `{ idempotencyKey: row.id }`.
- **`prisma/schema.prisma:807, 822` and `1124, 1140` — `Tip.stripeTransferId` and `SyncLicense.stripeTransferId` are NOT `@unique`.** Allows duplicate transfer rows on webhook replay. Add `@unique`.
- **`prisma/schema.prisma:816, 1008, 1218-1220` — Money tables (`Tip.trackId`, `VideoGeneration.trackId`, `CollabPayout.trackId/fromUserId/toUserId`) declare scalar id fields with no `@relation`/FK.** No DB-level referential integrity → orphaned rows and silent data drift on deletes.
- **`backend/src/controllers/aiGenerationController.ts:156-198` (Medium per agent, raised here for visibility) — SSRF allowlist permits `*.aliyuncs.com`** which lets any Alibaba OSS tenant host attacker content. Pin to MiniMax-controlled buckets.
- **`shared/api.ts:94-153` — Refresh-token race: queued requests can re-issue without `_retry` flag, causing infinite 401 loop.** Set `_retry = true` on queued originals; reject when `headers` is missing.
- **`shared/storage.ts:44` — Default `WebStorageAdapter` silently no-ops in Node/SSR/test contexts.** `setItem` reports success but discards the value. `setAuth` from isomorphic code paths silently loses the access token. Throw / warn loudly when no adapter is installed in a non-window environment.
- **`shared/stores/playerStore.ts:162-177` — Initial-state branches read `persistedPrefs` synchronously at module init, when it is still `{}`.** All initial-state branches are dead code; first paint shows hardcoded defaults until async `hydratePrefs()` finishes. Make `hydratePrefs` synchronous on web (read `localStorage` directly), or remove the dead branches.
- **`shared/types.ts:338-348` — `PaginatedResponse<T>` has every collection field optional (`items?`, `tracks?`, `agents?`).** No discriminator; consumers destructure `items` and silently get undefined while backend returns `tracks`.
- **`shared/stores/authStore.ts:50-52` — `setAccessToken` does NOT persist to storage.** Only the api interceptor's silent refresh persists; any direct caller forgets to write storage and the next `hydrate()` reverts. Persist inside `setAccessToken` (idempotent) or rename.
- **`sdk/package.json:6-7` — SDK ships `"main": "src/index.ts"` (raw TypeScript).** Plain Node consumers cannot `require('@music4ai/sdk')`. Build to `dist/` and point `main`/`types` at compiled output.
- **`sdk/src/index.ts:88-91` — `lyrics.generate` typed as `{ lyrics: string }` but backend returns `{ lyrics: string | null, plan }`.** Live wire mismatch. Either the type or the backend must change.
- **`sdk/src/index.ts:80-84` — Non-JSON 200 OK returns `null as T`.** Caller indexing `.generation.status` crashes with `Cannot read property 'status' of null` instead of getting a clean `Music4AIError`.
- **Frontend admin token in `localStorage`** (`frontend/lib/adminApi.ts:9, 28, 60-69` and `frontend/app/(admin)/layout.tsx:17-25`) under a CSP that allows `'unsafe-inline'` for scripts. Any XSS exfiltrates the admin token. Move to httpOnly cookie.
- **`frontend/components/player/AudioPlayer.tsx:91-119, 359-376` — `cancelCrossfade` doesn't remove the `canplay` listener attached in `startCrossfade`.** Stale listener can flip slot gains, mute the new track and unmute the old (silent) one, or trigger a phantom crossfade.
- **`frontend/components/player/AudioPlayer.tsx:288-377` — Crossfade promote callback uses captured stale `queueIndex`/`queue`.** User actions during crossfade can promote the wrong track.
- **`frontend/app/(main)/profile/page.tsx:33-55` — `useEffect` deps on `[isAuthenticated, user]` (object reference)** — every profile-edit triggers a triple-fetch storm.
- **`frontend/app/(main)/studio/generations/page.tsx:104-108` — Polling `setInterval` re-creates each render due to `[generations, load]` deps.**
- **`frontend/app/(main)/settings/page.tsx:161` — `window.prompt` for password during account deletion.** Bypasses password managers, doesn't autofill, vulnerable to extension hooks.
- **`mobile/app/_layout.tsx:48-98` — Setup-effect cleanup runs before async work assigns subscription handles.** Listener leaks accumulate every Fast-Refresh remount; native player listeners and notification subscription leak.
- **`mobile/services/audioService.ts:270-350` — `setupNativePlayerListeners` is non-idempotent.** Repeated calls inflate play counts and duplicate setState writes.
- **`mobile/services/downloadService.ts:115-116` — Synchronous `file.write(new Uint8Array(buffer))` on full audio buffer freezes the JS thread.** ANR/white-screen on 30+ MB tracks; OOM risk. Stream via `FileSystem.downloadAsync`.
- **`mobile/lib/firebase.ts:31-33` — `getAuth()` without React-Native persistence.** Firebase Auth state lost on every cold start; `getIdToken()` fails offline. Use `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`.
- **`backend/src/middleware/security.ts:47-80` — `validateEnv()` is exported but never called.** A deployment shipping the literal placeholder `JWT_SECRET=your-secret-key-change-in-production` is NOT rejected at boot. Call from `server.ts` after `dotenv.config()`.
- **`install-deps.sh` and `start.sh:1` — Missing `set -euo pipefail`.** In `start.sh:158` a failing `prisma db push` returns 0 because the pipeline ends in `tail -5`; partial schema sync silently succeeds.
- **`build.sh:14-25` — No `npm install` step before build.** Fails on a fresh checkout (Railway's own `npm ci` masks this).

---

## Backend — Server & Middleware

### `backend/src/server.ts`

- **§S-1 (Medium / Security)** — `:112, :123` Stripe webhook mounted before `apiLimiter`. The webhook endpoint has no rate limit; an attacker spamming unsigned POSTs forces `constructEvent` to reject each but still incurs CPU + log spam and starves legitimate traffic. **Fix:** apply a dedicated rate limiter to the webhook route, or reorder mounts.
- **§S-2 (Medium / Logic)** — `:26-29` `unhandledRejection` swallowed. A rejected Prisma transaction or half-applied state mutation can leave the process running with stale pool connections, mid-transaction locks, or torn in-memory caches. **Fix:** crash on unhandledRejection (Node's default since v15), or attach `.catch()` to every async path.
- **§S-3 (Low)** — `:23, :206-209` Force-shutdown `setTimeout` is not `.unref()`'d; can race graceful exits.

### `backend/src/middleware/auth.ts`

- **§AUTH-1 (Low)** — `:23-28` `tvCache` eviction is FIFO, not "LRU-ish" as commented. Hot keys get evicted. Either rename comment or implement true LRU (`tvCache.set(userId, cached)` after a hit).
- **§AUTH-2 (Medium / Auth)** — `:88-104` `optionalAuth` fails open on DB errors (treats user as anonymous), while `authenticate` fails closed on the same error. Inconsistent semantics for the same DB outage. **Fix:** distinguish "user not found" from "DB error" inside `getCurrentTokenVersion`.
- **§AUTH-3 (Low)** — `backend/src/types/express.d.ts:6-12` vs `backend/src/types/index.ts:20-28` — `Request.user` global type omits `tv?: number`; `RequestWithUser` includes it. Type confusion across auth paths. Sync the two declarations.

### `backend/src/middleware/apiKeyAuth.ts`

- **§AK-1 (Low / Crypto)** — `:23-27` API key stored as bare `SHA-256(rawKey)`. Stolen DB enables key→hash lookup. **Fix:** `HMAC-SHA-256(serverSecret, rawKey)`.
- **§AK-2 (Medium / Resource)** — `:12, :33-39` `lastUsedTouchedAt` Map has no eviction; grows unboundedly with every API key id ever seen. Add expiry-based cleanup or FIFO drop.
- **§AK-3 (Low)** — `:36-39` `prisma.apiKey.update().catch(() => {})` silently swallows DB errors. Log with `logger.warn`.

### `backend/src/middleware/cache.ts`

- **§C-1 (Medium / Logic)** — `:34` Cache key is `${method}:${originalUrl}`; doesn't vary by `Accept-Encoding`/`Accept-Language` or the API-Key header. The check `if (req.headers.authorization)` exempts Bearer auth but misses `x-api-key`/admin tokens if added. **Fix:** refuse to cache any request with `req.user` set, or explicitly check all auth headers.
- **§C-2 (Low)** — `:48-66` `res.json` override sets `X-Cache: MISS` even on non-2xx; misleading telemetry.

### `backend/src/middleware/errorHandler.ts`

- **§EH-1 (Low)** — `:65-68` Express recognizes error handlers via 4-arg signature (`function.length === 4`). A drive-by edit removing `_next` will silently break error handling. Add a comment noting the load-bearing arity.
- **§EH-2 (Medium / Security)** — `:144-160` `metadata` field is meant for telemetry; if a developer ever passes API credentials or DB constraints in `metadata`, the dev branch echoes them in the response body. Whitelist client-displayable keys.

### `backend/src/middleware/rateLimiter.ts`

- **§RL-1 (High / Security)** — entire file uses default MemoryStore. Multi-replica → N× rate budget per attacker. Critical for `/auth/login` brute-force, `aiGenerationLimiter`, `emailDispatchLimiter`. Add `rate-limit-redis` backed by `REDIS_URL`.
- **§RL-2 (Medium / Security)** — `:14` `req.ip ?? 'anonymous'` shares one bucket across all anonymous users when `trust proxy` is misconfigured. **Fix:** throw or 503 if the key would be `'anonymous'` in production.

### `backend/src/middleware/security.ts`

- **§SEC-1 (Medium / Security)** — `:11` `styleSrc: [..., "'unsafe-inline'"]` defeats CSP for CSS-injection XSS. For an API-only server, use `styleSrc: ['none']`.
- **§SEC-2 (Low / Security)** — `:14` `connectSrc` allows `https://*.railway.app`. Pin to your exact subdomain.
- **§SEC-3 (Medium / Security)** — `:47-80` `validateEnv()` is dead code. Placeholder `JWT_SECRET=your-secret-key-change-in-production` would NOT be rejected at boot. Call from `server.ts` after `dotenv.config()`.

### `backend/src/middleware/subscription.ts`

- **§SUB-1 (Low)** — `:38-40, :64-66` `catch { res.status(500) }` swallows error message. Log via `logger.error`.
- **§SUB-2 (Low)** — `:45-47` `requirePremiumOnly` types req inline as `Request & { user?: {...} }` instead of `RequestWithUser`. Type-system fragmentation. Use `RequestWithUser`.

### `backend/src/middleware/validation.ts`

- **§V-1 (Low)** — `:8` `ID_REGEX` accepts any 20-32 char alphanumeric string. Tighten per-id-type or add `validator.isLength + isAlphanumeric`.
- **§V-2 (Medium / Security)** — `:131` `for (const key in obj)` walks inherited enumerables — prototype-pollution risk depending on body parser. Use `Object.entries(obj)`.
- **§V-3 (Low / Product)** — `:178` `nameValidation` regex `/^[a-zA-Z\s'-]+$/` rejects all non-ASCII names — locks out the platform's stated K-pop / Mando-pop / global pop audience. **Fix:** `/^[\p{L}\p{M}\s'-]+$/u`.

---

## Backend — Controllers & Routes

### `adminController.ts`

- **§AC-1 (Low / Data)** — `:108-114, :343-345, :490-492` `tierCounts[row.tier]` indexed by raw DB tier value; new tiers silently disappear from dashboards. Iterate `Object.entries(SUB_PRICE_USD)` to seed.
- **§AC-2 (Low / Logic)** — `:104-114` `byTier` headline number includes CANCELLED/EXPIRED/PAST_DUE rows, not just active customers. Filter by `status === 'ACTIVE'` or rename `byTierAllStatuses`.
- **§AC-3 (Low / Logic)** — `:127` `videoSpend` averages 6s + 10s costs assuming 50/50 split. Group by `durationSec` to compute exact spend.

### `agentFeedController.ts`

- **§AF-1 (Low / API)** — `:24-53` Loads agent + 50 tracks before checking `agent.status`; suspended/pending agents waste a query. Add `status: 'ACTIVE'` to the `where`.

### `aiGenerationController.ts`

- **§AG-1 (Medium / Security)** — `:156-198` `PROVIDER_HOST_ALLOWLIST` includes `*.aliyuncs.com`/`*.aliyun.com`. Any OSS tenant qualifies; a malicious provider response can stash attacker-controlled audio in your store. Tighten to MiniMax-owned buckets.
- **§AG-2 (Low / Concurrency)** — `:579-588` `processMusicGeneration` updates against stale `gen` snapshot. Use `updateMany` for best-effort writes.
- **§AG-3 (Low / Resource)** — `:1554-1557` `pollVideoGeneration` writes `status: 'PROCESSING'` on every 10s poll → 60 redundant writes per video. `if (existing.status !== 'PROCESSING')` only.
- **§AG-4 (Low / Resource)** — `:1525-1529` Deleted videoGeneration row → polling returns but never cancels MiniMax job (continues billing). Call MiniMax's cancel endpoint.
- **§AG-5 (Low / Logic)** — `:1865-1899` `extendGeneration` cover-mode lyrics are user's extra lines only; original lyrics are not concatenated, so the model loses melodic continuity.
- **§AG-6 (Low / Logic)** — `:1762-1771` `regenerateSection` runs moderation AFTER MiniMax chat; a slur in `instructions` reaches the upstream model. Run moderation first.

### `aiPlaylistController.ts`

- **§AP-1 (Low / Concurrency)** — `:211-214` `playlistFromPrompt` slug uniqueness has TOCTOU; concurrent same-baseSlug requests P2002 → 500. Use the existing `createWithUniqueSlug` helper.
- **§AP-2 (Low / Data)** — `:104` `parsed.tempo` typecheck is implicit. `typeof parsed.tempo === 'string' && [...].includes(parsed.tempo)`.

### `apiKeyController.ts`

- **§APK-1 (Low / Data)** — `:48-53` `scopes.filter().slice(0, ALLOWED_SCOPES.length)` does not dedupe. `[...new Set(scopes.filter(...))]`.

### `authController.ts`

- **§A-1 (Medium / Concurrency)** — `:285-350` `firebaseExchange` has read-then-write race on concurrent OAuth + email-password registration with same email. Wrap in upsert keyed on `firebaseUid`, or catch P2002 and re-fetch.
- **§A-2 (Low / Concurrency)** — `:88-98` `register` `findFirst` + `create` race → 500 instead of 409. Catch P2002 and return 409.

### `channelSubController.ts`

- **§CS-1 (Low / Data)** — `:413-417` Fallback to `sub.amountCents` when `invoice.amount_paid` not numeric — over/under-credits referrer if price changed mid-subscription. Reject the webhook instead of fallback-crediting.
- **§CS-2 (Low / Data)** — `:268-327` `session.subscription` may be the expanded object (rare); passing object to `subscriptions.retrieve` throws. `const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;`.

### `clipController.ts`

- **§CL-1 (Low / Data)** — `:697-705` `shareClip` writes `userId: req.user?.userId` (undefined for anon); depends on schema nullability. Pass `?? null`.
- **§CL-2 (Low)** — `:420` `viewerKey = req.user?.userId || req.ip || 'anon'` — corporate NAT under-counts views (mild trade-off).

### `collabController.ts`

- **§COL-1 (Low)** — `:33-40, :102-105` `track.agent` may be null; ownership check still 403's correctly. Ok.

### `connectController.ts`

- **§CN-1 (Low / Logic)** — `:9-13` `mapStatus` returns `RESTRICTED` for `under_review` (Stripe's normal state during initial review). Allowlist transient `disabled_reason` values.

### `earningsController.ts`

- **§E-1 (Medium / Logic)** — `:131-139` `monthsBetween` × current `amountCents` for **all** statuses inflates lifetime earnings. A churned subscriber from a year ago contributes 12+ months of revenue.
- **§E-2 (Medium / Logic)** — `:135-139` `subsTotalCents` sums EXPIRED/CANCELLED subs as if active. Filter to ACTIVE for rolling MRR; sum stored `Invoice.amount_paid` for true lifetime.

### `karaokeController.ts`

- **§K-1 (Low / Logic)** — `:74-91` `if (!track.isPublic || track.status !== 'ACTIVE')` 403's even for the owner. Allow when `req.user && track.agent.ownerId === req.user.userId`.

### `licenseController.ts`

- **§L-1 (Low / Logic)** — `:58-82` `disableLicensing` while a buyer's checkout is pending allows an "out-of-band" sale at the old price. Reject disable if PENDING licenses exist.

### `licenseWebhook.ts`

- **§LW-1 (Medium / Logic)** — `:82-88` `payment_failed` `updateMany` matches `status: { not: 'REFUNDED' }`. Out-of-order webhook delivery (payment_failed AFTER checkout.session.completed) flips PAID licenses to REVOKED. **Fix:** filter `status: 'PENDING'` instead.

### `socialController.ts`

- **§SO-1 (Low / Data)** — `:30-39` `tx.aiAgent.update({ where: { id: track.agentId } })` throws P2025 if agent was deleted; rolls back the like. Use `updateMany`.
- **§SO-2 (Medium / Data)** — `:417-505` `getPlaylist` does NOT filter taken-down or non-ACTIVE tracks. Inconsistent with `getTrack`'s gating; leaks takedown existence to non-owners and breaks the player when downstream `getTrack` 404s.
- **§SO-3 (Medium / Resource)** — `:421-432` `getPlaylist` loads ALL tracks unbounded (the 500 cap is itself soft). Multi-MB responses on long playlists. Paginate via `/playlists/:id/tracks?page=…`.
- **§SO-4 (Low / Concurrency)** — `:571-595` `addToPlaylist` cap-check race — count read outside the transaction; concurrent adds can exceed 500. Move count inside the transaction.
- **§SO-5 (Low)** — `:386-413` `accessTier: isPublic === false ? 'PRIVATE' : 'PUBLIC'` is strict; `isPublic: 'no'` falls through to PUBLIC.
- **§SO-6 (Low)** — `:279-281, :741-743` `parentId: parentId` and `userId: req.user?.userId` may be undefined → schema-dependent. Pass `?? null` explicitly.

### `stemsController.ts`

- **§ST-1 (Medium / Resource)** — `:235-278` Public GET endpoint calls `pollStemsJob` which fires an outbound paid Replicate request per call. Reflective DoS amplifier. Cache for ~10s or move to a background poller.

### `subscriptionController.ts`

- **§SUB-1 (Low / Concurrency)** — `:178-193` Idempotency record insert failure (non-P2002) logs and continues. Stripe retries → handler runs twice. **Fix:** return 500 so Stripe retries against a fixed DB.
- **§SUB-2 (Medium / Data)** — `:396-397` `const tier = requestedTier === 'CREATOR' ? 'CREATOR' : 'PREMIUM';` — defaulting to PREMIUM on missing/bad metadata silently upgrades the user. Reject when tier is not literal `CREATOR`/`PREMIUM`; look up tier from the subscription's price ID.

### `takedownController.ts`

- **§TD-1 (Medium / Data)** — `:213-221` REJECT path unconditionally sets `isPublic: true`, exposing originally-private tracks. **Fix:** don't touch `isPublic` on REJECT; only clear `takedownStatus`/`takedownReason`.
- **§TD-2 (Low / Security)** — `:184-229` Defense-in-depth: controller doesn't double-check `req.user.role === 'ADMIN'` (router does). Add explicit role check.

### `tipController.ts`

- **§T-1 (Low / Logic)** — `:70-76` `createTipCheckout` doesn't verify `track.agent.ownerId === creatorUserId`. A user can tip Creator A while attaching trackId from Creator B → mismatched payment routing vs analytics attribution.
- **§T-2 (Medium / Logic)** — `:215-220` `handleTipPaymentFailed` matches by `stripePaymentIntentId`, which is null until `checkout.session.completed`. Failed tips that fail before completion never get marked FAILED. Look up via session id or PI metadata.

### `trackController.ts`

- **§TC-1 (Low / Data)** — `:531-535` `aiAgent.update({ where: { id: track.agentId } })` can P2025 → rolls back the Play record. Use `updateMany`.
- **§TC-2 (Low / Logic)** — `:626-673` `getTrending` groupBy doesn't filter by public/active; `take: limit*2` may not be enough if private tracks dominate. Increase to `*5` or join-filter.
- **§TC-3 (Low / Logic)** — `:734-749` `getSimilarTracks` 404's on non-public source even for the owner. Allow when requester owns it.
- **§TC-4 (Low / Data)** — `:609-618` `deleteTrack` decrements via `{ decrement: track.playCount }`; drifted counters can go negative. Clamp via raw SQL `GREATEST(... - X, 0)`.

### `transcribeController.ts`

- **§TR-1 (Low / Resource)** — `:47-77` No per-user OpenAI cost cap; spammers can burn $5/min. Add `assertCanGenerate` or a daily cap.

### `uploadController.ts`

- **§U-1 (Low / Resource)** — `:66-102` No per-user storage quota. Cloudinary cost-DoS. Add quota.

### Routes

- **§R-1 (Low / API)** — `agentRoutes.ts:10-19` Slug `top-earners`, `mine`, `feed.xml` routes precede `/:idOrSlug`. A user-minted agent named `top-earners` cannot be addressed via `/api/agents/top-earners`. Reserve those names at slug creation.
- **§R-2 (Low / API)** — `socialRoutes.ts:32` PUT `/playlists/:id` reuses `createPlaylistRules` (likely required `title`). Define `updatePlaylistRules` with optional title.
- **§R-3 (Low / Security)** — `publicEmbedRoutes.ts:81-85` In production with `EMBED_ALLOWED_DOMAINS` unset, CSP becomes empty `frame-ancestors` → embeds break silently; or in dev `frame-ancestors *` is permissive. Default to `'self'` when prod and unset.
- **§R-4 (Low / Resource)** — `aiRoutes.ts:68` Transcribe uses 50MB-limit `upload` instance; controller then enforces 5MB. Wastes bandwidth. Define a 5MB-limit transcribe-specific multer instance.

---

## Backend — Utils & Providers

### `backend/src/utils/jwt.ts`

- **§J-1 (Medium / Security)** — `:25-72` Tokens are minted without `iss`/`aud`/`nbf`. If the same `JWT_SECRET` is reused for a different service, tokens cross-validate. Add `setIssuer/setAudience` and verify both sides.
- **§J-2 (Low / Security)** — `:43-49` `generateTokenPair` uses same payload for access + refresh (only `jti` differs). Add `type: 'access' | 'refresh'` claim and verify it.

### `backend/src/utils/encryption.ts`

- **§ENC-1 (High / Crypto)** — `:69, :73` `decrypt()` returns input verbatim when `:` is missing or split count !== 3. Contradicts the file's own "fail closed" comment. **Fix:** always throw or return null when input shape doesn't match.
- **§ENC-2 (Low / Crypto)** — `:18` `FALLBACK_KEY = ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')` — different keys across forked workers / test runs cause flaky decryption. Pin to a constant dev seed.
- **§ENC-3 (Medium / Crypto)** — `:101-104` `hashForSearch` uses unsalted SHA-256 of normalized email — DB leak enables targeted enumeration via rainbow tables. **Fix:** HMAC-SHA-256 with `EMAIL_SEARCH_PEPPER` env var.

### `backend/src/utils/db.ts`

- **§DB-1 (High / DB)** — `:33-39` Auto-rewrites `sslmode=prefer` (or other deprecated mode) to `sslmode=verify-full`. Many managed DBs (Railway internal especially) lack publicly-trusted certs — connection fails entirely. **Fix:** drop the rewrite or replace with `require`.
- **§DB-2 (Low / DB)** — `:21-95` Module-cache via `globalForPrisma`. In dev with multiple module paths (test mocks), can produce two PrismaClients silently. Add a runtime guard logging when divergent instances are detected.

### `backend/src/utils/logger.ts`

- **§LOG-1 (Medium / Logging)** — `:62-68` `maskSensitiveData(info)` returns a NEW object, dropping winston's symbol-keyed fields (`LEVEL`, `MESSAGE`, `SPLAT`). Mutate `info` in place instead.
- **§LOG-2 (Low / Logging)** — `:13-34, :44` `lowerKey.includes('token')` over-redacts (`tokenPrefix`, `tokenized`). Switch to exact key match for unambiguous fields.
- **§LOG-3 (Low)** — `:104-133` File transports only in non-prod; in prod, exception/rejection logs go to console only. Trust the platform or add Sentry.

### `backend/src/utils/email.ts`

- **§EM-1 (Medium / Security)** — `:158, :167-168, :176, :185-186` HTML email templates interpolate `${link}` and `${token}` raw into `<a href="…">`. If `FRONTEND_URL` ever contains a quote/closing tag, attribute breakout. **Fix:** HTML-escape via `validator.escape`.
- **§EM-2 (Medium / Provider)** — `:24-42, :44-65` `sendViaResend`/`sendViaSendgrid` have no fetch timeout; provider downtime hangs request handlers ~75s+. **Fix:** `signal: AbortSignal.timeout(15_000)`.
- **§EM-3 (Low / Provider)** — `:53` SendGrid v3 expects `from: { email, name? }`. Bare `EMAIL_FROM` like `'no-reply@example.com'` becomes a string passed where object expected → 400 from SendGrid. Always pass object form.

### `backend/src/utils/cloudinary.ts`

- **§CD-1 (Medium / Security)** — `:232-303` `buildClipUrl` accepts `audioPublicId` from the caller and embeds in a Cloudinary delivery URL. Cloudinary serves any public_id within your account, including other users'. The util doesn't verify ownership; if a controller passes user input directly, it's a content-substitution bug. **Fix:** take a `Track` row + ownership check at controller layer.
- **§CD-2 (Low / Logic)** — `:186-206` `publicIdFromCloudinaryUrl` heuristic `/^[a-z]{1,3}_/i.test(seg)` matches both real transform segments (`f_auto`) AND folder names like `ab_cdef`. Use Cloudinary's known transform-prefix set.
- **§CD-3 (Medium / Security)** — `:100-127` `uploadImageBase64` has no input length cap. If any future caller bypasses the 1MB JSON body limit, runaway 50MB images can be pumped to Cloudinary on every request. Add explicit `> 8MB → throw`.

### `backend/src/utils/firebaseAdmin.ts`

- **§FA-1 (Low)** — `:23` `path.resolve(__dirname, '../../firebase-service-account.json')` resolves differently from `dist/utils` vs `src/utils`. Use `process.cwd()` and check both common locations.
- **§FA-2 (Low / Auth)** — `:74` `verifyIdToken(idToken, true)` enforces revocation but no app-side max-age check. Optional `decoded.iat > now - 3600`.

### `backend/src/utils/cronTick.ts`

- **§CR-1 (Medium / Logic)** — `:79-167` `setInterval(async () => …)` — when a tick takes longer than 15min, the next fires while the previous is still in `await`. The advisory lock prevents overlap, but the closure still consumes a connection. **Fix:** convert to self-rescheduling `setTimeout` loop.
- **§CR-2 (Low)** — `:38-50` `withLock` uses session-scoped `pg_try_advisory_lock`; PG releases on connection close, so process crashes are fine — but if you ever switch to transaction-scoped, you'd be safer. Document the contract.

### `backend/src/utils/minimax.ts`

- **§MM-1 (High / Provider)** — `:79, :179, :271, :310, :340, :800` Every `fetch()` lacks a timeout. Default Node fetch waits for OS TCP timeout (60s+ to 30min). One MiniMax outage hangs every Express worker. **Fix:** `signal: AbortSignal.timeout(120_000)` per call.
- **§MM-2 (Low / Logging)** — `:43-50, :87-89, :187-191` Error response bodies are sliced and logged; future MiniMax response that echoes `Authorization` would surface in logs. Strip `Bearer …` lines before logging.
- **§MM-3 (Medium / Provider)** — `:116` `MINIMAX_RATE_LIMIT_CODES` includes `2013` ("invalid model"), which is a permanent condition. Treating it as transient causes infinite fallback retry loops. Remove `2013` from the rate-limit list.

### `backend/src/utils/stems.ts`

- **§STM-1 (High / Provider)** — `:48, :82` Replicate `fetch()` calls have no timeout. Stuck poller blocks subsequent ticks. **Fix:** `AbortSignal.timeout(30_000)`.

### `backend/src/utils/adminAuth.ts`

- **§AA-1 (Low / Crypto)** — `:69-77` `Buffer.from(input)` length-leak via the dummy `timingSafeEqual` substring compare. Hash both inputs to fixed-length first.
- **§AA-2 (Medium / Security)** — `:14, :80-89` Admin token TTL 12h with no `tv`/revocation. Leaked admin token can't be revoked short of rotating `ADMIN_SESSION_SECRET`. Add per-admin tv counter or shorten TTL.
- **§AA-3 (Medium / Auth)** — `:115` `req.path === '/auth/verify'` bypass inside the admin-token middleware. `req.path` after router mount is fragile; if a nested router adds a same-path endpoint, it inherits the bypass. **Fix:** apply the middleware only on routes that need it instead of skipping inside.

### `backend/src/utils/collabSplits.ts`

- **§CSP-1 (Medium / Provider)** — `:154-171` Stripe SDK default 80s timeout × up to 100 rows in serial = 8000s worst case, exceeding the 15min cron interval. Configure `timeout: 15_000` and break out after a wall-clock budget.
- **§CSP-2 (High / DB)** — `:46-73, :152-202` Missing Stripe `idempotencyKey` on `transfers.create`. Concurrent webhook replay or in-line + cron path can issue the same payout twice. **Fix:** `stripe.transfers.create({...}, { idempotencyKey: row.id })`.

---

## Frontend — Pages (Next.js App Router)

### `frontend/middleware.ts`

- **§FM-1 (Low / Next)** — `:34` Matcher regex `'/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.).*)'` excludes any path containing a `.` anywhere. User-controlled segments containing `.` skip auth gating. Tighten the dot-rule to file extensions only (`\\.[a-zA-Z0-9]+$`).

### `frontend/next.config.mjs`

- **§FN-1 (Medium / Security)** — `:51` CSP `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`. Negates XSS protection. Switch to nonce-based CSP via Next 15's middleware nonce flow.

### `frontend/app/(main)/page.tsx`

- **§FP-1 (Medium / React)** — `:116-119` `loadContent` defined per render, `useEffect` deps `[isAuthenticated]` with exhaustive-deps disabled. Future edits that read other state will get stale values silently. Wrap in `useCallback` with proper deps or inline.

### `frontend/app/(auth)/register/page.tsx`

- **§FR-1 (Medium / Security)** — `:20-34`, `components/auth/SocialAuthButtons.tsx:35` Open-redirect guard `next.startsWith('/') && !next.startsWith('//')` is missing `/\\` and `/[^/]*:` checks. `/register?next=/\\evil.com` redirects off-site after social login. Validate via `new URL(next, location.origin)` and ensure the resolved origin matches.

### `frontend/app/(auth)/verify-email/page.tsx`

- **§FV-1 (Low / Data)** — `:25-40` `verify` uses no `AbortController`; setState fires after unmount on rapid navigation.

### `frontend/app/(auth)/reset-password/page.tsx`

- **§FRP-1 (Low / React)** — `:49` `setTimeout(() => router.push('/login'), 2500)` not cleared on unmount; navigation fires after unmount.

### `frontend/app/(admin)/layout.tsx` & `lib/adminApi.ts`

- **§FAD-1 (High / Security / Auth)** — `(admin)/layout.tsx:17-25` and `lib/adminApi.ts:9, 28, 60-69` Admin token in `localStorage`. Combined with `next.config.mjs` `unsafe-inline` CSP, any XSS exfiltrates the admin token. **Fix:** httpOnly Secure SameSite=Strict cookie issued by the backend `/admin/auth/verify` endpoint.

### `frontend/app/(admin)/admin/users/page.tsx`

- **§FAU-1 (Medium / Data)** — `:96-107` Optimistic role-rollback uses captured `prev`; rapid successive role changes can have a delayed rollback overwrite a more recent state. Re-fetch on error rather than rolling back.

### `frontend/app/(admin)/admin/users/[id]/page.tsx`

- **§FAUD-1 (Low / Security)** — `:121, :258, etc.` `<img src={u.avatar}>` leaks admin's IP + Referer to attacker-controlled avatar hosts. Add `referrerPolicy="no-referrer"` or restrict avatars to Cloudinary on the server.

### `frontend/app/(main)/profile/page.tsx`

- **§FPP-1 (High / React)** — `:33-55` `useEffect` deps include `user` (object reference) — every profile edit triggers a triple-fetch storm. **Fix:** depend on `[isAuthenticated, user?.id]`.
- **§FPP-2 (Low / Security)** — `:185, :362, :329` Plain `<img>` for user-supplied avatar URLs leaks Referer.

### `frontend/app/(main)/feed/page.tsx`

- **§FF-1 (Medium / Data)** — `:23-42` Tab toggle race: second request can resolve before first; first request still calls `setLoading(false)` and may overwrite state. No `AbortController`.

### `frontend/app/(main)/library/page.tsx`

- **§FL-1 (Medium / React)** — `:34-38` `useEffect(() => {...}, [searchParams])` depends on entire `URLSearchParams` reference. Depend on `[searchParams.toString()]` instead.

### `frontend/app/(main)/dashboard/page.tsx`

- **§FD-1 (Medium / React)** — `:60, :99` `setAgents([res.data.agent, ...agents])` reads stale closure. Use functional `setAgents(prev => [...])`.
- **§FD-2 (Low / UX)** — `:144` Modal closes on backdrop click; click-and-drag-out triggers the close.

### `frontend/app/(main)/create/page.tsx`

- **§FC-1 (Medium / React)** — `:129-199` Effect reads `?generation=` from `window.location.search` but only depends on `[isAuthenticated, router]`. Soft routing changes don't re-trigger. Use `useSearchParams()` and depend on `'generation'` value.

### `frontend/app/(main)/create/clip/page.tsx`

- **§FCC-1 (Medium / Next)** — `:32` `useSearchParams()` without `<Suspense>` boundary. Other pages (login, search, library, reset-password, verify-email, payouts) wrap content in Suspense; this one doesn't. Required by Next 15+ for static rendering.
- **§FCC-2 (Low / Form)** — `:18, :567` `accept={ACCEPTED_VIDEO_TYPES.join(',')}` doesn't include `video/x-quicktime` — Safari `.mov` files may have that mime. Accept-list the variant or check by extension.

### `frontend/app/(main)/notifications/page.tsx`

- No real bug — verified `if (!n.read)` guard before `markAsRead`.

### `frontend/app/(main)/track/[slug]/TrackDetailClient.tsx`

- **§FTD-1 (Medium / Security)** — `:225` Embed `<iframe src="${origin}/embed/track/${track.slug}">` interpolates raw `track.slug`. Slugs should be `[a-z0-9-]` but if a malicious creator manages to register a slug with quotes, the embed snippet (which is copied to clipboard) becomes a self-XSS payload for whoever pastes it. HTML-encode the slug or validate at slug creation.
- **§FTD-2 (Low / State)** — `:107, :119` `setTrack({ ...track, ... })` and `setComments([res.data.comment, ...comments])` use closure values. Use functional setState.

### `frontend/app/(main)/clips/[id]/ClipDetailClient.tsx`

- **§FCD-1 (Medium / Logic / State)** — `:130-137` Failed-like rollback `setClip({ ...clip, likeCount: clip.likeCount })` keeps the optimistic value (no revert).
- **§FCD-2 (Medium / Routing)** — `:332, :341` `Link` to `/profile/${clip.user.username}` — there is no `/profile/[username]` route in the app. Both Links lead to the user's own `/profile` or 404. **Fix:** create `/profile/[username]` or change links to an existing public profile route.
- **§FCD-3 (Low / UX)** — `:162` Native `window.confirm('Delete this clip?')` while rest of app uses `useConfirm`. Inconsistent.

### `frontend/app/(main)/agent/[slug]/AgentDetailClient.tsx`, `genre/[slug]/page.tsx`, `playlist/[slug]/page.tsx`, `n/[slug]/page.tsx`

- **§FSL-1 (Medium / Data)** — Slug-change effects don't reset state and don't abort. Stale data shown until new fetch lands; race produces wrong-route data on slow nets. Reset state + `AbortController` on slug change.

### `frontend/app/(main)/playlist/[slug]/page.tsx`

- **§FPL-1 (Low / Logic)** — `:97-100` `setPlaylist((p) => ({...p}))` cast through `Record<string, unknown>` weakens types; filter logic risks dropping the wrong row depending on `pt.track.id` vs `pt.id` shape. Strongly type and filter only on `pt.track.id`.

### `frontend/app/(main)/n/[slug]/page.tsx`

- **§FN-1 (Medium / Routing)** — `:53-55` Pushes `/create?prompt=…` but `app/(main)/create/page.tsx:132` only reads `?generation=`. Niche-page CTAs that promise pre-filled prompts produce empty forms.

### `frontend/app/(main)/studio/generations/page.tsx`

- **§FSG-1 (High / React)** — `:104-108` `setInterval(load, 5000)` in `useEffect([generations, load])`. Each tick mutates `generations`, re-running the effect: tear down + restart interval. Functional, but extra `load()` fires mid-cycle. Depend on `generations.some(g => …PENDING|PROCESSING)` instead of full array.
- **§FSG-2 (Low / Logic)** — `:347` `setGenerations((prev) => [newGen as unknown as Gen, ...prev])` — type-unsafe cast hides shape mismatches.

### `frontend/app/(main)/studio/video/page.tsx`

- **§FSV-1 (Low / React)** — `:37-41` Cleanup clears timer once on unmount; recursive `setTimeout(tick, 5000)` inside the resolved fetch can re-arm after cleanup. Track a `cancelled` flag in a ref.

### `frontend/app/(main)/settings/page.tsx`

- **§FS-1 (High / Security / UX)** — `:161` `window.prompt('Enter your password to confirm…')` for account deletion. No autofill, no password manager support, vulnerable to extension hooks. Build a real password-input dialog.
- **§FS-2 (Low / State)** — `:64-75` Email-pref optimistic toggle reads stale `emailPrefs`; rapid toggles clobber each other.

### `frontend/app/(main)/settings/developers/page.tsx`

- **§FSD-1 (Low / UX)** — `:64` `confirm('Revoke this key? …')` instead of `useConfirm`.

---

## Frontend — Components & Lib

### `frontend/lib/audioEngine.ts`

- **§AE-1 (Medium / Audio)** — `:38-45` `init()` early-return after `destroy()` can throw `InvalidStateError: HTMLMediaElement already connected previously to a different MediaElementAudioSourceNode` when `destroy()` then `init()` is called with the same `<audio>` element across different AudioContexts. Persist a single AudioContext, or clone-replace elements on destroy.
- **§AE-2 (Low / Resource)** — `:178-184` `getFreqLevel` allocates a new `Uint8Array` per call (~512B). Per-RAF VU meter calls produce GC pressure. Cache the buffer.
- **§AE-3 (Low / Audio)** — `:50-52` `this.ctx.resume()` not awaited / caught; unhandled rejection if no user gesture.

### `frontend/lib/serverApi.ts`

- **§SA-1 (Low / API)** — `:7-12` Only `NEXT_PUBLIC_API_URL` is stripped of trailing slash. `INTERNAL_API_URL=http://api/` produces `http://api//tracks`. Apply the strip uniformly.

### `frontend/lib/adminApi.ts`

- **§AAPI-1 (High / Security)** — `:9, :28, :60-69` Admin token in `localStorage`. See §FAD-1.

### `frontend/lib/firebase/client.ts`

- **§FBC-1 (Low / Firebase)** — `:7-13` Cached `app` may diverge from `getApps()[0]` after HMR. Either always read from `getApps()[0]` or guard with `getApps().includes(app)`.

### `frontend/lib/store/toastStore.ts`

- **§TS-1 (Low / State / Resource)** — `:21-39` Toast `setTimeout` callback fires `set(...)` even if the toast was already removed; harmless filter no-op but wasted wakeups. Capture `timeoutId` and check inside the callback.

### `frontend/components/AppProviders.tsx`

- **§AP-1 (Low / Resource)** — `:22-39` `cancelled` flag gates `await fetchUser()` but doesn't abort in-flight network. Pass `AbortSignal` to `fetchUser`.

### `frontend/components/SplashLoader.tsx`

- **§SL-1 (Medium / React)** — `:24-48` Calls `setStatus(STATUS_MESSAGES[messageIndex])` from inside `setProgress` updater function — anti-pattern. Strict-mode runs updaters twice. Move into a separate `useEffect` driven by `progress`.
- **§SL-2 (Low / React)** — `:25-40` `setTimeout(onComplete, 800)` scheduled inside the updater; strict-mode double-invocation can call `onComplete` twice. Use a ref + dedicated effect.

### `frontend/components/ErrorBoundary.tsx`

- **§EB-1 (Low / API / Resource)** — `:37-110` Error-reporting `fetch` has no timeout / abort. Stuck endpoint leaks open connections.

### `frontend/components/player/AudioPlayer.tsx`

- **§AP-1 (Medium / Audio / Logic)** — `:451-453, :461-463` `setDuration(audioARef.current.duration)` accepts `Infinity`/`NaN` from streaming sources. Progress-bar division produces NaN/Infinity; slider becomes unusable. **Fix:** `if (Number.isFinite(el.duration)) setDuration(el.duration);`.
- **§AP-2 (High / Audio / Resource)** — `:91-119, :359-376` `cancelCrossfade()` doesn't remove the `canplay` listener attached in `startCrossfade`. Stale listener can flip slot gains, mute the new track and unmute the old (silent) one, or trigger a phantom crossfade on an unrelated track change.
- **§AP-3 (High / Audio / State)** — `:288-377` Crossfade promote callback closes over stale `queueIndex`/`queue`. User actions during crossfade can promote the wrong track ("song skipping forward to a track I removed").
- **§AP-4 (Medium / Logic)** — `:39-49` `isSameOrigin` `catch { return true; }` silences crossorigin handling for relative URLs without leading `/` and for protocol-relative `//cdn.foo.com/x.mp3`. Use `new URL(url, window.location.href)` so relative URLs resolve against the current origin.
- **§AP-5 (Low / Audio / Logic)** — `:403-420` `handleEnded` records `durationPlayed: Math.floor(duration)` where `duration` may be NaN/0 → `Math.floor(NaN) === NaN`; server-side validation rejects. Guard with `Number.isFinite`.

### `frontend/components/player/PlayerSettings.tsx`

- **§PS-1 (Low / React)** — `:116-132` Click-outside listener with 100ms delay; if any child becomes a Radix Portal in the future, clicks land outside `panelRef` and silently close the panel.

### `frontend/components/player/useKeyboardShortcuts.ts`

- **§KS-1 (Low / React)** — `:148-152` `isPlaying` is in deps but never read inside the handler — re-registers listener unnecessarily on every play/pause; brief window where keypresses can be dropped.

### `frontend/components/player/QueuePanel.tsx`

- **§QP-1 (Low / React)** — `:128` `key={`past-${track.id}-${idx}`}` mixes index into the key; reorders/drops force unnecessary remounts. Generate a unique per-instance id (`playId = track.id + insertCounter`).

### `frontend/components/OnboardingBanner.tsx`

- **§OB-1 (Low)** — `:25, :20` `localStorage.setItem`/`getItem` not wrapped in try/catch (Safari private mode `SecurityError`).

### `frontend/components/track/TrackStems.tsx`

- **§TST-1 (Medium / Type / Logic)** — `:275-281` `Math.round(parseFloat(priceInput || '0') * 100)` — `parseFloat('1abc')` is `1`. User typo `1.99 USD` parsed as `1.99` silently. Use `/^\d+(\.\d{1,2})?$/`.
- **§TST-2 (Low / React)** — `:66-76` Polling effect overwrites `pollRef.current = window.setTimeout(load, 5000)`; the prior effect's cleanup clears the new id, not the old → old timer continues, doubling polling.

### `frontend/components/clip/SongPicker.tsx`

- **§SP-1 (Low)** — `:52-72` No `AbortController` on `api.get`; rapid tab/search changes waste bandwidth.
- **§SP-2 (Low / Audio)** — `:86` `void a.play()` does not catch rejection; iOS/Safari log `NotAllowedError`.

### `frontend/components/notifications/NotificationBell.tsx`

- **§NB-1 (Low)** — `:94-96, :125-135` Open toggle stacks requests, no abort/debounce; older responses overwrite newer. Comment claims revert handled by next poll, but poll only refreshes count, not list.

### `frontend/components/layout/Topbar.tsx`

- **§TB-1 (Medium / Next)** — `:5, :14` `useSearchParams()` in a globally-rendered Topbar without `<Suspense>` wrapper at consuming pages. Build will warn / force dynamic rendering. Wrap Topbar in `<Suspense>` at layout level or move `useSearchParams` into a client-only sub-component.
- **§TB-2 (Low / Logic)** — `:36-43` `fetchedUserRef.current = true` set BEFORE awaiting `fetchUser`. On network error, the ref blocks any retry. Set the ref inside `.then()` only.

### `frontend/components/layout/Sidebar.tsx`

- **§SB-1 (Low / API)** — `:62-69` No `AbortSignal` on `api.get('/social/playlists/mine')`.

### `frontend/components/auth/SocialAuthButtons.tsx`

- **§SAB-1 (Medium / Security)** — `:35` See §FR-1 above.

### `frontend/components/track/Lyrics.tsx`

- **§LY-1 (Medium / React / API)** — `:40-59` Karaoke cache (`karaokeLines`) not invalidated when `trackId` prop changes — wrong lyrics shown for the new track until karaoke toggled off and back on.

### `frontend/components/vintage/sounds.ts`

- **§VS-1 (Low / Audio / Resource)** — `:8-21` Module-level `AudioContext` never closed. With `audioEngine`'s context that's 2 already; Chrome caps at ~6.

### `frontend/components/vintage/VUMeter.tsx`

- **§VM-1 (Low / Resource)** — `:36-69` Continuous RAF loop while mounted; two stacked instances each call `audioEngine.getLevel()` 60×/s. Share via a single subscription.

### `frontend/components/ThemeProvider.tsx`

- **§TP-1 (Low / Hydration)** — `:53-94` `useEffect` defers `localStorage` read; first paint flashes default theme. Use a blocking `<script>` injected into `<head>` to set the class on `<html>` before paint.

### `frontend/lib/api.ts`

- **§API-1 (Low / Logic)** — `:7-9` `console.log('API Base URL:', API_URL)` — noisy in dev; not a leak (URL isn't secret).

---

## Mobile (Expo / React Native)

### `mobile/app/_layout.tsx`

- **§ML-1 (High / Resource / React)** — `:48-98` Setup-effect cleanup runs before async IIFE assigns subscription handles. Listener leaks on every Fast-Refresh remount. Track `unmounted` inside the IIFE and clean up if it flipped before awaits finished.
- **§ML-2 (Medium / React)** — `:98` Boot effect deps `[]` while using `hydrate`, `fetchUser`, `hydratePlayerPrefs`, `router`. Stale closure if Zustand actions ever change identity. Use `useStore.getState()` inside.
- **§ML-3 (Medium / Resource)** — `:144-172` `sync.syncQueue()` etc. are fire-and-forget without unmount cancellation.
- **§ML-4 (Low / React)** — `:140` `useSyncPlayerToNative()` returns a fresh object literal each render → brittle deps.

### `mobile/app/player.tsx`

- **§MP-1 (Medium / Audio)** — `:376-381` `Slider.onValueChange` writes directly to store; native progress (1Hz) overwrites the user's drag mid-scrub → thumb snaps back. Use a local `scrubbingValue` and commit only on `onSlidingComplete`, or suppress native writes while a `seekRequest` is pending.
- **§MP-2 (Medium / Logic)** — `:103, :111` `handleLike` rollback uses `setLiked(prev => !prev)`; if a second tap was queued, double-toggle no longer reflects intent. Capture `wasLiked` and revert to that.
- **§MP-3 (Low / Expo)** — `:138-140` `useEffect(() => { if (!currentTrack) router.back(); }, [currentTrack])` — depend on `currentTrack?.id`.

### `mobile/app/(tabs)/search.tsx`

- **§MS-1 (Medium / React)** — `:56-87` `useCallback(debounce(...), [])` is brittle — works only because all reads come from arguments. Future refactor closing over `tab`/`genres` will silently break.

### `mobile/app/(auth)/reset-password.tsx`

- **§MAR-1 (Medium / Resource)** — `:50` `setTimeout(() => router.replace('/(auth)/login'), 2500)` not cleared on unmount.

### `mobile/app/(auth)/verify-email.tsx`

- **§MAV-1 (Low / React)** — `:28-41` Async IIFE without `cancelled` flag; setState after unmount.

### `mobile/app/create/index.tsx`

- **§MC-1 (Medium / Audio)** — `:107-113` `previewSound.current.unloadAsync?.()` doesn't await; if unmount races `Audio.Sound.createAsync`, the new Sound is assigned to `previewSound.current` after unmount and is never unloaded → audio session leak (iOS keeps ducking other apps until GC).
- **§MC-2 (Low / Audio)** — `:412` `pauseAsync` rejection swallowed by outer try, but `setPlayingPreview(false)` doesn't fire → stuck "playing" UI.

### `mobile/app/studio/generations.tsx`

- **§MSG-1 (Medium / Audio)** — `:140-162` No `previewBusyRef` guard. Two fast taps on different items race: second `Audio.Sound.createAsync` overwrites `sound.current` while the first is still loading → orphaned sound, possible double playback. Mirror the reentrancy guard from `create/index.tsx`.
- **§MSG-2 (Low / Logic)** — `:121-125` Polling deps `[generations, load]` cause effect cycle on every load. Depend on `generations.some(...)`.
- **§MSG-3 (Low / Audio)** — `:128, :134, :153, :176` Several `?.unloadAsync?.()` calls without `.catch`.

### `mobile/app/studio/video.tsx`

- **§MV-1 (Medium / Resource)** — `:52-68` `startPolling` chain: cleanup clears `pollTimer` but in-flight `tick()` await resolves later, schedules a new `setTimeout(tick, 5000)` that escapes cleanup → memory leak + setState after unmount. Add `let stopped = false` checked in `tick`.
- **§MV-2 (Low)** — `:33` `getApi()` called once at mount; stale on logout/login.

### `mobile/services/audioService.ts`

- **§MAS-1 (High / Resource)** — `:270-350` `setupNativePlayerListeners` non-idempotent. Each call adds new event listeners; combined with §ML-1's leak, every track-change event fires N times → inflated `tracks/:id/play` counts and duplicate setState writes. Track a module-level "wired" flag.
- **§MAS-2 (Medium / Logic)** — `:325-341` Edge case: queue-with-duplicates only records a play for the first occurrence. Reset `playRecordedForTrackId` whenever `event.position` drops below 1 AND queueIndex changed.
- **§MAS-3 (Low / React)** — `:75` `progressUpdateEventInterval: 1` writes to store every second; `MiniPlayer` re-renders on every screen 1×/s. Throttle or shallow-compare.

### `mobile/services/notificationService.ts`

- **§MNS-1 (Low / Storage / Security)** — `:8, :90, :103` Push token in `AsyncStorage`. Not strictly secret, but identifies the device. Consider `SecureStore`.
- **§MNS-2 (Low / Expo)** — `:11-19` `setNotificationHandler` mixes `shouldShowAlert` (deprecated in SDK 54) with `shouldShowBanner`/`shouldShowList`.
- **§MNS-3 (Medium / Push)** — `:117-129` Only `addNotificationResponseReceivedListener` is registered; no `addNotificationReceivedListener` for foreground notifications. Real-time unread-badge updates rely on screen-focus polling.

### `mobile/services/downloadService.ts`

- **§MDS-1 (High / Resource)** — `:115-116` `file.write(new Uint8Array(buffer))` is synchronous; loading the entire MP3 via `arrayBuffer()` then writing freezes JS thread for several seconds on large tracks. ANR on Android, white screen on iOS, OOM on 30+MB. **Fix:** `expo-file-system` `createDownloadResumable` or `FileSystem.downloadAsync`.
- **§MDS-2 (Medium / API / Security)** — `:112` `fetch(track.audioUrl)` bypasses `getApi()` — no auth header. Token-gated (premium/private) audio URLs fail to download silently.
- **§MDS-3 (Low / Storage)** — `:127` `JSON.stringify(updated)` of full metadata blob on every download — slow and JS-thread blocking at 50+ items.

### `mobile/services/sharePayloadService.ts`

- **§MSP-1 (Low / Storage / Logic)** — `:39-49` Malformed JSON in pending share is swallowed; `clearPendingShare()` is also skipped → bad payload sits forever and fails on every launch. Always clear in `finally`.

### `mobile/lib/firebase.ts`

- **§MFB-1 (High / Auth)** — `:31-33` `getAuth(app)` without `getReactNativePersistence(AsyncStorage)`. Firebase Auth state lost on every cold start; offline `getIdToken()` fails. **Fix:** `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`.

### `mobile/components/auth/SocialAuthButtons.tsx`

- **§MSA-1 (Low / React)** — `:34-65` Effect deps missing `firebaseSignIn`, `onError`, `onSuccess` — stale closure if parent re-creates inline.

### `mobile/components/ui/Slider.tsx`

- **§MSL-1 (Medium / React)** — `:40-57` `PanResponder` `valueFromX` returns 0 when `width <= 0`. First user touch BEFORE `onLayout` fires emits 0 to `onValueChange` → can pause-and-rewind audio to 0:00 on accidental taps. Skip when width is 0.

### `mobile/app/notifications/index.tsx`

- **§MN-1 (Medium / Security)** — `:93-97` `n.data?.trackSlug`/`agentSlug` go directly into `router.push(\`/track/${slug}\`)` without slug validation. The `_layout.tsx` deep-link handler validates slugs but this in-app path doesn't. Reuse `asSlug` from `lib/validateSlug.ts`.

### `mobile/app/(tabs)/_layout.tsx`

- **§MTL-1 (Medium / Expo)** — `:121-155` `feed` tab repurposed as Profile via `tabBarButton` override. Deep links to `/(tabs)/feed` still resolve; tapping the tab bar takes the user to `/profile`. UX inconsistency.

### `mobile/app.json`

- **§MAJ-1 (Low / Platform)** — `:19-21` `UIBackgroundModes: ["audio"]` only — no `fetch` for background token refresh. Acceptable today but flag.

---

## Shared Package

### `shared/storage.ts`

- **§SH-1 (High / Shared)** — `:44` Default `WebStorageAdapter` silently no-ops in Node/SSR/test contexts. `setItem` reports success but discards the value. `setAuth` from isomorphic code paths silently loses the token. **Fix:** throw / warn loudly when no adapter is installed in a non-window environment, or default to `MemoryStorageAdapter`.
- **§SH-2 (Medium / Shared)** — `:18, :27, :36` Guard `typeof window === 'undefined'` doesn't catch Safari private mode / sandboxed iframes where `localStorage` itself is unavailable. Check `typeof localStorage` directly.

### `shared/utils.ts`

- **§SU-1 (Medium / Shared)** — `:6-10` `formatDuration(-5)` → `"-1:55"`; `formatDuration(75.7)` → `"1:15.7"`. `<audio>.duration` is fractional. **Fix:** `Math.max(0, Math.floor(seconds || 0))`.
- **§SU-2 (Low / Shared)** — `:12-16` `formatCount(999_999)` returns `"1000.0K"` (should be `"1.0M"`); `formatCount(NaN)` returns `"NaN"`. Bump unit when rounded result ≥ 1000.
- **§SU-3 (Medium / Shared)** — `:27-35` `formatDate` parses ISO `'2026-04-30'` as midnight UTC → user west of UTC sees "Apr 29". Append `T12:00:00` for bare-date strings or pass `{ timeZone: 'UTC' }`.
- **§SU-4 (Low / Shared)** — `:37-40` `truncateText` slices in UTF-16 code units; emoji/non-BMP CJK can produce a lone surrogate. Use `Array.from(text).slice(...)`.
- **§SU-5 (Medium / Shared)** — `:18-25` `slugify` strips non-ASCII (Greek, Cyrillic, CJK, accented Latin). `Café Niño` → `"caf-nio"`. Use NFKD normalization + `[\p{L}\p{N}]` with `/u` flag, and `toLocaleLowerCase('en-US')` to avoid the Turkish I bug.

### `shared/api.ts`

- **§SAP-1 (Medium / Shared)** — `:82-91` Retry condition `(!error.response || error.response.status >= 500)` doesn't honor 408/429 (Retry-After) and over-retries non-retryable 5xx (501/505). Whitelist `[408, 425, 429, 500, 502, 503, 504, 522, 524]`.
- **§SAP-2 (High / Shared)** — `:94-153` Refresh-token race: queued requests are pushed onto `failedQueue` without `_retry` flag; if `original.headers` is missing they re-issue without auth → 401 loop. **Fix:** set `_retry = true` on queued originals; reject when `headers` is undefined; clear queue on hard refresh failure.
- **§SAP-3 (Medium / Shared)** — `:125-140` Only the first request's branch calls `_onTokenRefreshFailed`. Race orderings can leave the auth store inconsistent.
- **§SAP-4 (Medium / Shared)** — `:6, :161-162` `_apiInstance` mutable singleton silently invalidates previous interceptor refs on second `createApi` call. Throw or warn.

### `shared/types.ts`

- **§ST-1 (High / Shared)** — `:338-348` `PaginatedResponse<T>` has every collection field optional (`items?`, `tracks?`, `agents?`). No discriminator; consumers destructuring `items` get undefined while backend returns `tracks`. Use a generic `{ items: T[]; total; page; totalPages }` and standardize backend.
- **§ST-2 (Low / Shared)** — `:191` `Tip.toUserId?: string` declared optional but Prisma requires it. Mark as `string`.
- **§ST-3 (Low / Shared)** — `:315` `Notification.data: Record<string, any>` invites runtime crashes. Define a discriminated union per `NotificationType`.
- **§ST-4 (Medium / Shared)** — `:36` `User.subscription` slim shape diverges from full `Subscription` model with no doc comment. Use `Pick<Subscription, 'tier' | 'status'>` to make the projection explicit.

### `shared/stores/authStore.ts`

- **§SAS-1 (High / Shared)** — `:50-52` `setAccessToken` does NOT persist to storage. Only the api interceptor's silent refresh persists. Any direct caller forgets the storage write and `hydrate()` reverts. Persist inside `setAccessToken` (idempotent).
- **§SAS-2 (Medium / Shared)** — `:144-149` On 5xx in `fetchUser`, the token is kept and the user re-tries on next render — refresh storm during backend outage. Add backoff.
- **§SAS-3 (Low / Shared)** — `:71, :86, :103` `error.response?.data?.error || 'Login failed'` masks non-axios failures (network errors, sync TypeErrors). Fall back to `error.message`.
- **§SAS-4 (Low / Shared)** — `:107-118` `removeItem` on storage write failure leaves disk/memory inconsistent. Try/catch and force state reset regardless.

### `shared/stores/playerStore.ts`

- **§PSP-1 (High / Shared)** — `:162-177` Initial-state branches read `persistedPrefs` synchronously at module init when it's still `{}`. All branches fall through to defaults. First paint shows hardcoded defaults until async `hydratePrefs()` finishes. Make `hydratePrefs` synchronous on web (read `localStorage` directly), or remove the dead branches.
- **§PSP-2 (Medium / Shared)** — `:185-195` `playTrack(track, undefined)` builds `[track]` and replaces queue. User clicks Play on a track already in their queue → loses their carefully built radio queue.
- **§PSP-3 (Medium / Shared)** — `:246-270` `nextTrack` autoplay branch reads `fresh.queueIndex` after `await autoFillIfNeeded()`; user actions during the await can be silently overwritten. Capture `currentTrack.id` before await.
- **§PSP-4 (Medium / Shared)** — `:346-365` `removeFromQueue`: when removed track was at the last index AND was the current, `newQueueIndex = s.queueIndex` is past the new array's end. Clamp via `Math.min(s.queueIndex, newQueue.length - 1)`.
- **§PSP-5 (Low / Shared)** — `:478-508` `parsed.eqBands` length-equality only — corrupted entries with `null` slots flow into the EQ adapter as NaN gain. Validate each entry.
- **§PSP-6 (Low / Shared)** — `:453-463` `tickSleepTimer` sets state every tick even when the displayed minute hasn't changed — wakes subscribers needlessly.

---

## SDK Package

### `sdk/src/index.ts`

- **§SDK-1 (High / SDK)** — `:70-85` No request timeout. A hung server blocks the SDK forever. `waitFor` covers polling, not the individual request. **Fix:** add `timeoutMs` option using `AbortSignal.timeout(timeoutMs)` (default 30_000).
- **§SDK-2 (High / SDK)** — `:70-85` No retry/backoff on 408/425/429/5xx. Network blips force every consumer to wrap each call.
- **§SDK-3 (Critical / SDK)** — `:81-83` `Music4AIError.body = json` retains full server response; if a downstream app logs `error` along with the request config, the bearer key from `Authorization: Bearer …` can surface in logs. Add a `sanitizedError` helper / scrub credentials.
- **§SDK-4 (Medium / SDK)** — `:100-109` `waitFor` with `opts.timeoutMs = 0` — `??` accepts 0 → loop never enters → 408. Treat `0`/negative as `Infinity` or throw on non-positive.
- **§SDK-5 (Medium / SDK)** — `:67` `opts.fetchImpl || fetch` — older Node / RN bundles without polyfilled `fetch` get cryptic `TypeError`. Throw with a clear message.
- **§SDK-6 (High / SDK)** — `:80-84` Non-JSON 200 OK returns `null as T`. Caller indexing `.generation.status` crashes with TypeError. Throw `Music4AIError` instead.
- **§SDK-7 (High / SDK)** — `:88-91` `lyrics.generate` typed as `{ lyrics: string }` but backend (`aiGenerationController.ts:455`) can return `{ lyrics: null, plan }`. Live wire mismatch.
- **§SDK-8 (Medium / SDK)** — `:48-56` `GenerationStatus` exported as canonical type but omits useful wire fields (`coverArt`, `provider`, etc.).
- **§SDK-9 (Medium / SDK)** — `:71-78` No `User-Agent` / `X-Client` header. Server-side log analysis can't distinguish SDK users from raw API users.
- **§SDK-10 (Low / SDK)** — `:71` Hardcoded `${this.baseUrl}/api/v1${path}`; double-prefixes if `baseUrl` already ends in `/api/v1`. Strip / make configurable.
- **§SDK-11 (Low / SDK)** — `:23-31` `Music4AIError extends Error` without `Object.setPrototypeOf(this, Music4AIError.prototype)` — `instanceof` returns false in some downlevel CJS builds.
- **§SDK-12 (Low / SDK)** — `tsconfig.json:5` `lib: ["ES2022", "DOM"]` for a Node-first SDK pollutes downstream type completion.

### `sdk/package.json`

- **§SDP-1 (High / SDK)** — `:6-7` `"main": "src/index.ts"` and `"types": "src/index.ts"` ship raw TypeScript. Plain Node consumers cannot `require('@music4ai/sdk')`. **Fix:** point to `dist/index.js` / `dist/index.d.ts`, add `dist` to `files`, ensure `prepublishOnly: tsc`.

---

## Prisma Schema

### Foreign-key gaps (no `@relation`, no DB-level FK)

- **§P-1 (High)** — `:816, :821` `Tip.trackId` declared with `@@index([trackId])` but no `Track @relation`. Orphan rows; cascading delete behavior undefined.
- **§P-2 (High)** — `:1008, :1013` `VideoGeneration.trackId` — same.
- **§P-3 (High)** — `:1218` `CollabPayout.trackId` — money table, orphan refs are particularly bad.
- **§P-4 (High)** — `:1219-1220` `CollabPayout.fromUserId` / `toUserId` — Stripe Connect transfer obligations can point at non-existent users.

For each: add the `Track @relation(fields: [trackId], references: [id], onDelete: ...)` with `Restrict` (money) or `SetNull` (telemetry).

### Missing unique constraints

- **§P-5 (High)** — `:807, :822` `Tip.stripeTransferId` is indexed but NOT `@unique` → webhook replay can create duplicate Tip rows with same transfer id.
- **§P-6 (High)** — `:1124, :1140` `SyncLicense.stripeTransferId` — same.
- **§P-7 (Medium)** — `:940, :967` `MusicGeneration.providerJobId` indexed but not `@unique` → poller race risk.
- **§P-8 (Medium)** — `:1154-1155` `TrackDistribution.upc` / `isrc` — UPC/ISRC are global identifiers that must be unique per assignment. DistroKid rejects duplicates at submission; without DB constraint, the issue surfaces too late.

### Cascade-delete data-loss

- **§P-9 (Critical)** — `:815` `Tip.toUser` `onDelete: Cascade` — deleting a creator destroys all their incoming tip records, even completed ones (audit/legal compliance issue).
- **§P-10 (Critical)** — `:844` `ChannelSubscription.creator` — same.
- **§P-11 (Medium)** — `:758-759` `Subscription.userId @unique` cascades on user delete; if Stripe sub still bills, no tombstone.
- **§P-12 (Medium)** — `:198`, `:1189` Deleting a referrer cascades wipe of `ReferralEarning` rows that owe them money. `onDelete: Restrict` or soft-delete.
- **§P-13 (Low)** — `:956` Deleting a user cascades MusicGenerations including completed ones; tracks under their agents cascade-delete as well, which removes other users' likes/play history references. Document the contract or move to soft-delete.

### Money/precision consistency

- **§P-14 (Medium)** — `:857` `AgentEarning.amount` uses `Decimal(12,2)` while every other money field uses `Int` cents. Mixing representations across rollup math is error-prone. Standardize on one.

### Schema correctness / indexing

- **§P-15 (Medium)** — `:360` `Track.featureVector Float[] @default([])` — no fixed length / version constraint. After any vector schema change, mixed-version vectors are compared in `recommendations.ts:243` and silently misrank. Filter `WHERE featureVersion = ${FEATURE_VERSION}` in queries, OR migrate to `pgvector`.
- **§P-16 (Low)** — `:1198` Redundant `@@index([source, sourceId])` next to `@@unique([source, sourceId, referrerId])` — the unique covers the prefix already.
- **§P-17 (Low)** — `:769-770` `WebhookEvent.id` is auto-cuid, but the unique idempotency key is `stripeEventId`. Redundant id; use `stripeEventId @id`.
- **§P-18 (Low)** — `:247` `PushToken.platform` is `String` ("ios"/"android"/"web") — typo-prone. Define an enum.
- **§P-19 (Low)** — `:803` `Tip.message` unbounded `String?`. Add `@db.VarChar(500)`.
- **§P-20 (Medium)** — `:1024-1026` `TrackCollaborator.shareBps` — no DB-level CHECK that values sum to 10000 per track. Application-side enforcement requires serializable transactions. At minimum add per-row range CHECK via raw SQL migration.
- **§P-21 (Low)** — `:498-502` Missing composite index for "popular clips for sound" feed: `@@index([trackId, status, visibility, trendingScore(sort: Desc)])`.
- **§P-22 (Low)** — `:421-423` Listing endpoints filter `status='ACTIVE' AND isPublic=true AND takedownStatus IS NULL`. Add 3-col composite for large catalogs.
- **§P-23 (Low)** — `:741-762` Renewal/expiry crons benefit from `@@index([status, currentPeriodEnd])`.

---

## Build & Deploy & Scripts

### `railway.json`

- **§B-1 (Critical / Build)** — `:9` `preDeployCommand` runs `npx prisma db push --schema=../prisma/schema.prisma --skip-generate --accept-data-loss` on every deploy. Any column-rename or table-restructure that requires data migration silently DROPS COLUMNS / TABLES with their data. **Fix:** switch to `prisma migrate deploy` and stop using `db push` on Railway.
- **§B-2 (Low / Build)** — `:5, :9, :10` Inline service-name conditionals duplicated 3×. Move to `scripts/railway-*.sh` files.
- **§B-3 (Critical / Build)** — `:5` Web service build does NOT run `prisma generate`. Frontend Prisma client is targeted at `frontend/generated/prisma`; SSR/route handlers importing it will fail at build after any schema change.
- **§B-4 (Low / Build)** — `:12` `restartPolicyMaxRetries: 5` then permanent failure with no alerting; combined with §B-1 a botched migration becomes invisible.

### `nixpacks.toml`

- **§B-5 (Low / Build)** — `:3` Missing Node version pin. Pin via `nixPkgs = ['...', 'nodejs_22', ...]`.

### `build.sh`

- **§B-6 (High / Script)** — `:14-25` No `npm ci` / `npm install` before build. Runs `npx prisma generate` then `npm run build` per package. On a fresh checkout, `node_modules` is missing → confusing error. (Railway's own command does its own `npm ci`.)

### `dev.sh`

- **§B-7 (Low / Script)** — `:25, :30, :35, :53` `cd "$DIR/foo" && npm install` doesn't `cd ..`; subsequent commands cwd implicit.
- **§B-8 (Low / Script)** — `:2, :59-77` `set -e` doesn't catch failures inside `concurrently`.
- **§B-9 (Low / Script)** — `:40-44` Unknown flags silently ignored — typos like `--mobil` go unnoticed.

### `install-deps.sh`

- **§B-10 (High / Script)** — `:1-2` Missing `set -euo pipefail`. `cd backend && npm install || …` continues if `cd backend` fails. Partial installs reported as success.
- **§B-11 (Medium / Script)** — `:26-38` Doesn't install `shared/` or `mobile/` deps; inconsistent with `dev.sh`.
- **§B-12 (Low / Script)** — `:17-21` Node version regex doesn't handle `v22.0.0-nightly`.

### `start.sh`

- **§B-13 (High / Script)** — `:1-2, :157-158` Missing `set -euo pipefail`; in particular, `MIGRATE_EXIT=$?` after a pipeline ending in `tail -5` returns `tail`'s exit code, not `prisma db push`'s → failing schema sync silently reports success.
- **§B-14 (Medium / Script)** — `:127-132` `DATABASE_URL` extraction `tr -d '"' | tr -d "'"` strips ALL quotes — a password containing `'` breaks authentication silently.
- **§B-15 (Low / Script)** — `:94` `rm -f *.log` without `nullglob`; UX flicker on success message.
- **§B-16 (Low / Script)** — `:95` `find . -name ".DS_Store" -delete` traverses `node_modules`, `.git`. Add `-not -path './node_modules/*'`.

---

## Notes on methodology

Each section was reviewed by a dedicated Claude Code subagent reading the files end-to-end (not sampling). Severity is the agent's call; categories follow common buckets (Security, Logic, Data, Resource, Crypto, Provider, Concurrency, etc.). Findings annotated as "verified safe" by the agents are omitted from this document. A handful of items were re-analyzed and downgraded by the agent (e.g., several "Bug 23/24/27" entries in the player-store review were dropped during writeup because closer reading proved them benign) — those are not included here.

Many of the file-bound bugs are reproducible without running the app. The runtime-only items (race conditions, audio session leaks, push duplication) require focused testing — start by adding a load-test on the auth/refresh path (§SAP-2) and a Stripe webhook replay test for the payment paths (§B-1, §P-5/§P-6, §CSP-2).
