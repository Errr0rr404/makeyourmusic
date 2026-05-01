# MakeYourMusic — AI-Generated Music Platform

A full-stack platform for AI-generated music. Users prompt for a song, the platform generates audio + lyrics + cover art + an optional preview video, and the result is published to a streaming app with social features, monetization (tips, channel subscriptions, sync licensing, paid stems), and recommendations.

The codebase ships four runtime targets sharing one backend:

- **Backend** — Express + Prisma API (`backend/`)
- **Web** — Next.js 15 streaming app (`frontend/`)
- **Mobile** — Expo / React Native app with CarPlay & Android Auto (`mobile/`)
- **SDK** — `@music4ai/sdk`, the public TypeScript client for `/api/v1` (`sdk/`)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Demo Credentials](#demo-credentials)
- [API Reference](#api-reference)
- [Public Developer API & SDK](#public-developer-api--sdk)
- [Frontend Pages](#frontend-pages)
- [Mobile App Screens](#mobile-app-screens)
- [Native Mobile Integrations](#native-mobile-integrations)
- [Background Jobs](#background-jobs)
- [Deployment](#deployment)
- [Architecture Notes](#architecture-notes)
- [License](#license)

---

## Tech Stack

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Runtime |
| Express | 5.x | HTTP framework |
| TypeScript | 5.x | Language |
| Prisma | 6.x | ORM (PostgreSQL) |
| Argon2 (argon2id) | latest | Password hashing |
| Jose | 5.x | JWT (sign/verify, zero-dep) |
| Firebase Admin | 13.x | Push notifications, federated auth exchange |
| Helmet | 8.x | Security headers |
| Zod | 3.x | Schema validation |
| Winston | 3.x | Structured logging |
| Stripe | 18.x | Subscriptions, Connect, Checkout, transfers |
| Cloudinary | 2.x | Audio / image / video uploads |
| Multer | 2.x | Multipart handling |

### AI providers
| Provider | What it powers |
|---|---|
| Minimax | Primary music generation, lyrics, cover art, preview video |
| Suno | Music generation fallback |
| OpenAI Whisper | Transcription (`gpt-4o-mini-transcribe`) |
| Replicate (Demucs) | Paid stem separation |
| Stability | Audio / image fallback |

### Frontend (Web)
| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15.x (App Router, Turbopack) | React framework |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Styling |
| Radix UI | latest | Accessible components |
| Zustand | 5.x | State management |
| Motion | 12.x | Animations |
| Sonner | 2.x | Toast notifications |
| Recharts | 2.x | Dashboard charts |
| Web Audio API | native | EQ / audio processing |
| Axios | 1.x | HTTP client |
| Lucide React | latest | Icons |

### Mobile
| Tool | Version | Purpose |
|------|---------|---------|
| Expo | SDK 54 | React Native framework |
| React Native | 0.81 | Mobile runtime |
| Expo Router | 6.x | File-based routing |
| NativeWind | 4.x | Tailwind for RN |
| react-native-track-player | 4.x | Background audio, lock-screen, CarPlay/Android Auto |
| Zustand | 5.x | Shared state |

### Shared package (`shared/`)
- Zustand stores (`playerStore`, `authStore`) consumed by both web and mobile
- Axios client factory with token-refresh hook
- Pluggable `StorageAdapter` (web localStorage / mobile SecureStore)
- Music catalog (genre tree, mood / energy / vocal / era options)
- Common formatters (`formatDuration`, `formatCount`, `slugify`, …)

### Database
PostgreSQL via Prisma. **40 models** across these domains:

- **Auth & users** — `User`, `PushToken`, `Subscription`, `ApiKey`, `ConnectAccount`
- **AI agents & catalog** — `AiAgent`, `AiAgentGenre`, `Genre`, `Track`, `Album`, `Video`, `Clip`, `ClipLike`, `ClipComment`, `ClipShare`
- **Social & analytics** — `Follow`, `Like`, `Comment`, `Share`, `Download`, `Play`
- **Playlists** — `Playlist`, `PlaylistTrack`, `UserMixtape`
- **Monetization** — `Tip`, `ChannelSubscription`, `SyncLicense`, `TrackStems`, `TrackDistribution`, `TrackCollaborator`, `Takedown`
- **Earnings & referrals** — `AgentEarning`, `ReferralEarning`, `CollabPayout`, `WebhookEvent` (Stripe idempotency)
- **AI generations** — `MusicGeneration`, `VideoGeneration`
- **Platform** — `Notification`, `Report`

---

## Project Structure

```
makeyourmusic/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── controllers/         # 28 controllers (auth, AI, social, payments, admin…)
│   │   ├── middleware/          # Auth, rate limiting, security headers, multer
│   │   ├── routes/              # 19 route modules
│   │   ├── jobs/                # Cron tasks (trending, mixtapes, payouts, …)
│   │   ├── services/            # Provider clients (Minimax, Suno, Replicate, …)
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # DB client, JWT, logger, encryption, advisory locks
│   └── scripts/                 # Seed & admin scripts
├── frontend/                   # Next.js 15 web app (App Router)
│   ├── app/
│   │   ├── (auth)/              # Login, register, forgot/reset password, verify email
│   │   ├── (main)/              # Home, feed, search, library, notifications, genre, niche
│   │   ├── (admin)/             # Admin dashboard, users, reports, generations, revenue
│   │   ├── creator/             # Earnings, payouts, channel playlists
│   │   ├── studio/              # Generation workspace (music, video)
│   │   ├── settings/            # Profile, developers (API keys), referrals
│   │   ├── track/[slug]         # Track detail
│   │   ├── agent/[slug]         # Agent profile
│   │   ├── playlist/[slug]      # Playlist view
│   │   ├── clips/[id]           # Short-form clip
│   │   ├── pricing/             # Subscription plans
│   │   └── (legal)/             # privacy, terms, cookies, takedown
│   ├── components/              # UI components (player, layout, track, agent)
│   └── lib/                     # Stores, audio engine, API client
├── mobile/                     # Expo React Native app
│   ├── app/
│   │   ├── (auth)/              # Login, register
│   │   ├── (tabs)/              # Home, search, create, library, profile
│   │   ├── studio/              # Generation workspace
│   │   ├── create/              # Music / clip creation entry
│   │   ├── track/[slug]         # Track detail
│   │   ├── agent/[slug]         # Agent profile
│   │   ├── playlist/[id]        # Playlist
│   │   ├── dashboard/           # Creator analytics
│   │   ├── notifications/       # Notification center
│   │   ├── settings/            # Settings
│   │   └── player                # Full-screen player
│   ├── components/              # RN components
│   ├── plugins/                 # Native config plugins (CarPlay, Android Auto, Share Ext)
│   └── services/                # Audio service, API
├── sdk/                        # @music4ai/sdk — public TS client
│   └── src/                     # Music4AI class, types, Music4AIError
├── shared/                     # Shared types, stores, API client, music catalog
│   ├── stores/                  # playerStore, authStore (Zustand)
│   ├── storage/                 # StorageAdapter (web localStorage / mobile SecureStore)
│   ├── types/                   # Common TypeScript interfaces
│   └── api.ts                   # Axios singleton + token refresh hook
├── prisma/
│   ├── schema.prisma            # 40 models
│   └── migrations/              # Migration history
├── netlify.toml                # Netlify deployment config
└── railway.json                # Railway deployment config
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+ and **npm** 10+
- **PostgreSQL** 14+ (local, Neon, Railway, or Supabase)

### 1. Install dependencies

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd mobile && npm install && cd ..
```

### 2. Configure environment (see [Environment Variables](#environment-variables))

### 3. Set up the database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed demo data

```bash
cd backend && npm run seed
```

### 5. Start development servers

```bash
# Both backend (port 3001) and frontend (port 3000)
npm run dev

# Or individually:
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:3000

# Mobile:
npm run dev:mobile     # Expo dev server
```

---

## Environment Variables

Only `DATABASE_URL` and the two JWT secrets are strictly required to boot the backend; AI features, payments, email, and uploads each gracefully degrade when their env is missing.

### Core

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NODE_ENV=development          # development | production
PORT=3001
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
RUN_CRON=true                 # set false on replicas you don't want running cron
```

### Auth

```env
JWT_SECRET=<min-32-chars>
JWT_REFRESH_SECRET=<min-32-chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional
ENCRYPTION_KEY=<32-byte-hex>           # for encrypting Stripe Connect tokens
ADMIN_PASSWORD_HASH=<argon2-hash>
ADMIN_SESSION_SECRET=<min-32-chars>
FIREBASE_SERVICE_ACCOUNT_JSON=<json>   # Firebase Admin (push, federated login exchange)
```

Generate secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### AI providers

```env
# Minimax — primary provider for music, lyrics, cover, video
MINIMAX_API_KEY=
MINIMAX_API_BASE=https://api.minimaxi.chat/v1
MINIMAX_GROUP_ID=
MINIMAX_MUSIC_MODEL=music-1.5
MINIMAX_MUSIC_FALLBACK_MODEL=
MINIMAX_CHAT_MODEL=
MINIMAX_IMAGE_MODEL=image-01
MINIMAX_VIDEO_MODEL=

# Suno — music generation fallback
SUNO_API_KEY=
SUNO_API_BASE=
SUNO_MUSIC_MODEL=

# OpenAI — transcription, lyrics fallback
OPENAI_API_KEY=

# Replicate — Demucs stem separation (paid feature)
REPLICATE_API_TOKEN=
REPLICATE_DEMUCS_VERSION=25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953

# Stability — audio / image fallback
STABILITY_API_KEY=
STABILITY_AUDIO_MODEL=

# Provider selection
MUSIC_PROVIDER=minimax              # minimax | suno
MUSIC_PROVIDER_FALLBACKS=suno,stability
AUTO_PREVIEW_VIDEO=true             # auto-generate preview videos for new tracks
```

### Payments (Stripe)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CREATOR_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
PRICE_CREATOR_USD=9.99
PRICE_PREMIUM_USD=14.99
PLATFORM_FEE_BPS=1500               # 15% — applied to tips, channel subs, sync licenses
```

### Email

```env
RESEND_API_KEY=                     # preferred
SENDGRID_API_KEY=                   # fallback
EMAIL_FROM=noreply@example.com

# Or SMTP fallback
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
```

### Uploads (Cloudinary)

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Business logic

```env
# Daily AI generation quotas
AI_GEN_DAILY_FREE_LIMIT=3
AI_GEN_DAILY_CREATOR_LIMIT=50
AI_GEN_DAILY_PREMIUM_LIMIT=500
AI_GEN_UNLIMITED_USER_IDS=          # comma-separated user IDs

# Referrals
REFERRAL_BPS=1000                   # 10% of referred user's payments
REFERRAL_WINDOW_DAYS=365
REFERRAL_MIN_PAYOUT_CENTS=500

# Trending
TRENDING_GRAVITY=1.8                # Hacker-News-style decay
TRENDING_RECOMPUTE_AGE_MIN=15

# Public embeds
EMBED_ALLOWED_DOMAINS=              # comma-separated; blank = allow all
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Available Scripts

### Root
| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start backend only (nodemon) |
| `npm run dev:frontend` | Start frontend only (Turbopack) |
| `npm run dev:mobile` | Start Expo mobile dev server |
| `npm run build` | Build backend + frontend for production |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations (dev) |
| `npm run prisma:migrate:deploy` | Apply pending migrations (prod) |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run build:mobile:ios` / `:android` / `:all` | EAS builds |

### Backend (`cd backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run seed` | Seed demo data (genres, agents, albums, tracks) |
| `npm run seed:massive` | Seed a large fixture set |
| `npm run create-admin` | Create an admin user |

### Frontend (`cd frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type check |

---

## Demo Credentials

After running `npm run seed` in the backend:

| Email | Password | Role |
|-------|----------|------|
| `demo@gmail.com` | `Demo123` | Agent Owner |

---

## API Reference

Base URL: `http://localhost:3001/api`

### Auth (`/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | – | Register |
| POST | `/auth/login` | – | Login |
| POST | `/auth/logout` | – | Logout |
| POST | `/auth/refresh` | – | Refresh token |
| POST | `/auth/firebase-exchange` | – | Exchange Firebase ID token for app JWT |
| POST | `/auth/forgot-password` | – | Send reset email |
| POST | `/auth/reset-password` | – | Reset password with token |
| POST | `/auth/verify-email` | – | Verify email address |
| GET | `/auth/me` | required | Current user |
| PUT | `/auth/profile` | required | Update profile |
| PUT | `/auth/email-preferences` | required | Manage notification preferences |

### Tracks (`/tracks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tracks` | – | List tracks |
| GET | `/tracks/trending` | – | Trending tracks |
| GET | `/tracks/:idOrSlug` | optional | Track detail |
| POST | `/tracks` | required | Create track |
| PATCH | `/tracks/:id/cover` | required | Update cover art |
| POST | `/tracks/:id/play` | optional | Record play |
| POST | `/tracks/:id/publish` | required | Publish a draft |
| DELETE | `/tracks/:id` | required | Delete track |

### Agents (`/agents`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/agents` | – | List agents |
| GET | `/agents/mine` | required | My agents |
| GET | `/agents/:idOrSlug` | optional | Agent detail |
| GET | `/agents/:slug/feed.rss` | – | RSS feed |
| POST | `/agents` | required | Create agent |
| PUT | `/agents/:id` | required | Update agent |
| DELETE | `/agents/:id` | required | Delete agent |

### AI generation (`/ai`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/lyrics` | required | Generate lyrics |
| POST | `/ai/music` | required | Enqueue music generation |
| GET | `/ai/music/:id` | required | Poll generation status |
| POST | `/ai/music/:id/variation` | required | Generate a variation |
| POST | `/ai/music/:id/extend` | required | Extend a section |
| POST | `/ai/music/:id/regenerate` | required | Regenerate a section |
| POST | `/ai/cover` | required | Cover-art image |
| POST | `/ai/video` | required | Preview video |
| POST | `/ai/transcribe` | required | Transcribe audio (Whisper) |
| POST | `/ai/playlist` | required | Generate playlist from prompt |

### Social (`/social`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/social/likes/:trackId` | required | Toggle like |
| GET | `/social/likes` | required | My liked tracks |
| POST | `/social/follows/:agentId` | required | Toggle follow |
| GET | `/social/comments/:trackId` | – | Track comments |
| POST | `/social/comments/:trackId` | required | Add comment |
| DELETE | `/social/comments/:id` | required | Delete comment |
| GET | `/social/playlists/mine` | required | My playlists |
| POST | `/social/playlists` | required | Create playlist |
| POST | `/social/playlists/:id/tracks` | required | Add to playlist |
| DELETE | `/social/playlists/:pid/tracks/:tid` | required | Remove from playlist |
| POST | `/social/shares/:trackId` | optional | Record share |

### Recommendations (`/recommendations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recommendations/similar/:trackId` | – | Similar tracks (cosine on feature vectors) |
| GET | `/recommendations/radio/:trackId` | – | Endless radio queue |
| GET | `/recommendations/for-you` | required | Personalized feed |
| GET | `/recommendations/trending` | – | Decay-weighted trending |

### Niches & genres (`/niches`, `/genres`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/niches` | List niches |
| GET | `/niches/:slug` | Niche landing page (curated tracks + templates) |
| GET | `/genres` | List genres |

### Clips (`/clips`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET / POST | `/clips` | optional / required | List / create short-form clips |
| GET / PUT / DELETE | `/clips/:id` | mixed | Clip detail / update / delete |
| POST | `/clips/:id/like` / `/comment` / `/share` | required | Engagement |

### Notifications (`/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | required | List |
| POST | `/notifications/read` | required | Mark as read |
| GET | `/notifications/unread-count` | required | Unread count |
| POST | `/notifications/push-tokens` | required | Register a push token (iOS / Android) |

### Subscription (`/subscription`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription` | required | Current subscription |
| POST | `/subscription/checkout` | required | Stripe checkout |
| POST | `/subscription/cancel` | required | Cancel subscription |
| POST | `/subscription/webhook` | – | Stripe webhook |

### Creator monetization (`/creator`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/creator/connect/onboard` | required | Stripe Connect onboarding link |
| GET | `/creator/connect/status` | required | Connect account status |
| GET | `/creator/connect/dashboard` | required | Stripe Express login link |
| POST | `/creator/tips/:agentId/checkout` | optional | Tip an agent (Stripe Checkout) |
| GET | `/creator/earnings` | required | Earnings dashboard |
| POST | `/creator/playlists/:id/subscribe` | required | Subscribe to a paid playlist |
| POST | `/creator/playlists/:id/cancel` | required | Cancel a channel subscription |

### Sync licensing & stems (`/licenses`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/licenses/tracks/:id` | required | Toggle sync licensing + price |
| POST | `/licenses/tracks/:id/checkout` | optional | Buyer Stripe Checkout |
| GET | `/licenses/tracks/:id/download` | required | Authorized download |
| GET | `/licenses/tracks/:id/stems` | required | Stems status |
| POST | `/licenses/tracks/:id/stems/checkout` | required | Pay $2.99 to generate stems |
| POST | `/licenses/webhook` | – | Sync license / stems Stripe webhook |

### Takedowns (`/takedowns`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/takedowns` | required | File a DMCA takedown (rate limited) |
| POST | `/takedowns/:id/withdraw` | required | Withdraw takedown |

### Referrals (`/referrals`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/referrals/lookup/:code` | – | Resolve a referral code |
| GET | `/referrals/stats` | required | My referral stats |

### Public developer API (`/api/v1`)
Bearer-token auth via `Authorization: Bearer m4a_...`. See [SDK section](#public-developer-api--sdk).

### Embeds (`/embed`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/embed/track/:slug` | Embeddable iframe player (CSP-locked to `EMBED_ALLOWED_DOMAINS`) |

### Admin (`/admin`, requires ADMIN role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/users` | List / manage users |
| PUT | `/admin/users/:id/role` | Change user role |
| PUT | `/admin/agents/:id/status` | Manage agent status |
| PUT | `/admin/tracks/:id/status` | Manage track status |
| GET | `/admin/reports` | View reports |
| PUT | `/admin/reports/:id` | Resolve report |
| GET | `/admin/revenue` | Revenue summary |
| GET | `/admin/generations` | Generation usage |
| GET | `/admin/takedowns` | Manage takedowns |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Direct multipart upload (Cloudinary) |

---

## Public Developer API & SDK

The platform exposes a stable public API under `/api/v1` for third-party music generation. Manage keys at **Settings → Developers** (`/settings/developers`).

### Direct REST

```bash
curl -X POST https://music4ai.com/api/v1/music \
  -H "Authorization: Bearer m4a_..." \
  -H "Content-Type: application/json" \
  -d '{"prompt":"lo-fi study beat with vinyl crackle, 70 bpm","isInstrumental":true}'
```

Available scopes: `music:read`, `music:write`, `lyrics:read`, `lyrics:write`, `tracks:read`, `agents:read`.

### TypeScript SDK (`@music4ai/sdk`)

```ts
import { Music4AI } from "@music4ai/sdk";

const client = new Music4AI({ apiKey: process.env.MUSIC4AI_KEY! });

const { generation } = await client.music.generate({
  prompt: "lo-fi study beat with vinyl crackle, 70 bpm",
  isInstrumental: true,
});

const finished = await client.music.waitFor(generation.id);
console.log(finished.audioUrl);
```

Public methods: `lyrics.generate`, `music.generate`, `music.get`, `music.waitFor`. Errors throw `Music4AIError` with `.status` and `.body`.

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home — featured, trending, new releases |
| `/feed` | Latest tracks feed |
| `/search` | Search tracks and agents with filters |
| `/library` | Liked tracks and playlists |
| `/notifications` | In-app notifications |
| `/track/[slug]` | Track detail — play, like, comment, share, license, stems |
| `/agent/[slug]` | Agent profile |
| `/playlist/[slug]` | Playlist view |
| `/clips/[id]` | Short-form clip |
| `/genre/[slug]` | Genre page |
| `/n/[slug]` | Niche landing page |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth |
| `/create`, `/create/clip` | Music / clip creation |
| `/studio/generations`, `/studio/video` | Generation workspace |
| `/dashboard` | Agent owner dashboard |
| `/creator` | Earnings, payouts, channel playlists |
| `/settings` | Profile settings |
| `/settings/developers` | API key management |
| `/settings/referrals` | Referral dashboard |
| `/pricing` | Subscription plans |
| `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/reports`, `/admin/generations`, `/admin/revenue` | Admin panel |
| `/privacy`, `/terms`, `/cookies`, `/takedown` | Legal & DMCA |

---

## Mobile App Screens

| Screen | Description |
|--------|-------------|
| Home tab | Featured and trending |
| Search tab | Search with filters |
| Create tab | Music / clip creation entry |
| Library tab | Liked tracks, playlists |
| Profile tab | User profile |
| `/track/[slug]` | Track detail |
| `/agent/[slug]` | Agent profile |
| `/playlist/[id]` | Playlist |
| `/studio` | Generation workspace |
| `/dashboard` | Creator analytics |
| `/notifications` | Notification center |
| `/settings` | Settings |
| `/player` | Full-screen player with EQ + sleep timer |
| `/login`, `/register` | Auth |

---

## Native Mobile Integrations

`mobile/plugins/` ships three Expo config plugins that are wired into `app.json`:

| Plugin | What it does | Apple-gated? |
|---|---|---|
| `withCarPlay` | iOS CarPlay audio entitlement + UIBackgroundModes | **Yes** — requires CarPlay capability grant from Apple |
| `withAndroidAuto` | Android Auto media-browser metadata + automotive XML | No — ships immediately |
| `withShareExtension` | iOS "Make a song about this" Share Extension target with App Group | Partial — needs an App Group ID created in App Store Connect |

### Building

```bash
cd mobile
npx expo prebuild --clean
eas build -p ios       # iOS bits
eas build -p android   # Android Auto
```

### Apple Developer prerequisites

**CarPlay**
1. Apply for CarPlay capability at https://developer.apple.com/contact/carplay/ (Apple grants this case-by-case; "music apps" is one of the allowed categories).
2. After approval, enable CarPlay in App Store Connect → Identifiers → your bundle ID → Capabilities.

**Share Extension**
1. App Store Connect → Identifiers → App Groups → "+" → name it `group.com.worldofz.makeyourmusic`.
2. Enable that App Group on the main app's bundle ID.

The plugins do **not** apply for CarPlay on your behalf, do **not** create App Groups, and do **not** wire the JS-side native bridge for the share-extension payload — `services/sharePayloadService.ts` references a `ShareGroupModule` that needs to be implemented as an iOS native module post-prebuild. Without it, share-extension payloads still land in the App Group container; the host app just won't auto-route to `/create`.

---

## Background Jobs

`backend/src/jobs/cronTick.ts` runs on the API process when `RUN_CRON=true` (default). Postgres advisory locks (`utils/advisoryLock.ts`) ensure only one replica executes each task even when Railway scales to multiple instances.

| Job | Cadence | What it does |
|---|---|---|
| Trending refresh | 15 min | Hacker-News-style decay over plays / likes / shares |
| Feature recompute | 1 h | Cosine-similarity feature vectors for `/recommendations` |
| Weekly mixtapes | 24 h | Generates personalized playlists Sundays 23:00–02:00 UTC; emails + push |
| Preview-video poll | per tick | Pulls async AI video status, attaches to tracks |
| Stuck-generation sweep | per tick | Marks `MusicGeneration` >10 min PROCESSING and `VideoGeneration` >30 min as FAILED |
| Referral payouts | per tick | Stripe transfers above `REFERRAL_MIN_PAYOUT_CENTS` |
| Collab payouts | per tick | Splits multi-agent earnings via Stripe `on_behalf_of` transfers |

---

## Deployment

### Backend (Railway)

Configuration is in `railway.json`. Set environment variables in the Railway dashboard.

```
Build:      cd backend && npm ci && npx prisma generate --schema=../prisma/schema.prisma && npm run build
Predeploy:  cd backend && npx prisma db push --schema=../prisma/schema.prisma --skip-generate --accept-data-loss
Start:      cd backend && npm start
Health:     /api/health
```

The API service syncs the Prisma schema during Railway predeploy, not during container startup, so runtime restarts do not re-run schema changes.

### Frontend (Netlify)

Configuration is in `netlify.toml`.

```
Base:    frontend
Build:   npm install && cd .. && npx prisma generate --schema=prisma/schema.prisma && cd frontend && npm run build
Publish: .next
```

Set `NEXT_PUBLIC_API_URL` to your Railway backend URL.

### Mobile (EAS Build)

```bash
cd mobile
eas build --platform ios
eas build --platform android
```

Update `mobile/app.json` and `mobile/eas.json` with your project IDs before building.

---

## Architecture Notes

### Audio playback
- **Web** — HTML5 `<audio>` + Web Audio API (5-band parametric EQ, gain, playback speed)
- **Mobile** — `react-native-track-player` with background audio, lock-screen controls, CarPlay, Android Auto, notification integration
- **Cross-origin audio** — EQ is only enabled for same-origin sources; external URLs play normally without CORS restrictions

### Music generation pipeline
1. Frontend calls `POST /ai/music` → row inserted in `MusicGeneration` (`PENDING`)
2. Backend calls Minimax (or Suno fallback) and updates row to `PROCESSING`
3. Cron tick polls provider; on completion writes audio URL, attaches to a `Track`, optionally generates cover and preview video
4. Stuck-generation sweep marks `>10 min` processing rows as `FAILED`

### Monetization model
- **Subscriptions** — Stripe with two tiers (Creator $9.99, Premium $14.99); webhooks update `Subscription` rows
- **Tips** — Stripe Checkout with destination charge to the creator's Connect account; platform takes `PLATFORM_FEE_BPS`
- **Channel subscriptions** — Recurring monthly Stripe subscription on a paid playlist; on-behalf-of transfer to creator
- **Sync licensing** — Buyer pays platform; on success `SyncLicense` row is created and a download token issued
- **Stems** — Buyer pays $2.99 (`STEM_GENERATION_FEE_CENTS`); webhook kicks off Demucs job on Replicate
- **Referrals** — `REFERRAL_BPS` of every referred-user payment within `REFERRAL_WINDOW_DAYS`; payouts via Stripe transfers when ≥ `REFERRAL_MIN_PAYOUT_CENTS`
- **Collaborations** — Multi-agent tracks split earnings by basis points stored on `TrackCollaborator`
- All Stripe webhooks deduplicate via `WebhookEvent.eventId`

### Security
- **Password hashing** — Argon2id (64MB memory, 3 iterations, 4 parallelism)
- **JWT** — Signed with `jose` (HS256), 15-min access tokens, HTTP-only refresh cookies (7d)
- **Rate limiting** — Auth (5–10 req/min), AI burst (20/min), uploads (5/min), takedowns (3/hr prod), comments / clip creation, anti-enumeration on email dispatch
- **Headers** — Helmet, HSTS, X-Frame-Options DENY, CSP, no X-Powered-By
- **Validation** — Zod schemas, pagination capped at 50, comments capped at 2000 chars
- **Stripe Connect tokens** — Encrypted at rest with `ENCRYPTION_KEY`
- **Embeds** — `EMBED_ALLOWED_DOMAINS` controls iframe `frame-ancestors` CSP

### State management
Zustand stores in `shared/` are consumed by both web and mobile:
- `playerStore` — current track, queue, playback state, EQ, speed, sleep timer, crossfade
- `authStore` — user, tokens, hydration from localStorage / SecureStore (via the pluggable `StorageAdapter`)

### Notifications
- Push: Firebase Cloud Messaging via Firebase Admin SDK; tokens registered through `POST /notifications/push-tokens`
- Email: Resend (preferred) → SendGrid → SMTP fallback chain, gated by user `EmailPreferences`

---

## License

MIT
