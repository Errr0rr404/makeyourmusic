# MakeYourMusic — AI-Generated Music Platform

A full-stack music streaming platform for AI-generated content. Features a web app, native mobile app, and backend API with real-time audio playback, EQ controls, social features, and agent management.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Demo Credentials](#demo-credentials)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Mobile App Screens](#mobile-app-screens)
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
| Jose | 6.x | JWT (sign/verify, zero-dep) |
| Helmet | 8.x | Security headers |
| Zod | 3.x | Schema validation |
| Winston | 3.x | Structured logging |
| Socket.io | 4.x | Real-time events |
| Stripe | 18.x | Payments |
| Cloudinary | 2.x | File uploads |
| Multer | 2.x | Multipart handling |

### Frontend (Web)
| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15.x (App Router, Turbopack) | React framework |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Styling |
| Radix UI | latest | Accessible components |
| Zustand | 5.x | State management |
| Motion (formerly Framer Motion) | 12.x | Animations |
| Sonner | 2.x | Toast notifications |
| Recharts | 2.x | Charts (dashboard) |
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
| react-native-track-player | 4.x | Background audio playback |
| Zustand | 5.x | Shared state |

### Shared Package
| Tool | Purpose |
|------|---------|
| Zustand stores | Player state, auth state |
| Axios API client | Shared HTTP client |
| TypeScript types | Common interfaces |

### Database
- **PostgreSQL** with Prisma ORM
- 20+ models: Users, AI Agents, Tracks, Albums, Genres, Playlists, Likes, Comments, Follows, Plays, Shares, Subscriptions, Notifications, Reports, etc.

---

## Project Structure

```
morlo/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── controllers/     # Route handlers (auth, track, agent, social, admin, subscription)
│   │   ├── middleware/       # Auth, rate limiting, security, file upload
│   │   ├── routes/           # Route definitions
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # DB client, JWT, logger, encryption
│   └── scripts/              # Seed & admin scripts
├── frontend/                # Next.js web app
│   ├── app/
│   │   ├── (auth)/           # Login, Register
│   │   ├── (main)/           # Home, Feed, Search, Library, Track, Agent, Genre
│   │   ├── (admin)/          # Admin dashboard
│   │   └── (agent)/          # Agent owner dashboard
│   ├── components/           # UI components (player, layout, track, agent)
│   └── lib/                  # Utilities, stores, audio engine, API client
├── mobile/                  # Expo React Native app
│   ├── app/
│   │   ├── (auth)/           # Login, Register
│   │   ├── (tabs)/           # Home, Feed, Search, Library
│   │   ├── track/[slug]      # Track detail
│   │   ├── agent/[slug]      # Agent detail
│   │   ├── dashboard/        # Agent upload & management
│   │   └── player            # Full-screen player
│   ├── components/           # RN components
│   └── services/             # Audio service, API
├── shared/                  # Shared types, stores, API client
│   ├── stores/               # playerStore, authStore (Zustand)
│   ├── types/                # Common TypeScript interfaces
│   └── api.ts                # Axios singleton
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Migration history
├── netlify.toml              # Netlify deployment config
└── railway.json              # Railway deployment config
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

### Backend (`backend/.env`)

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<min-32-chars>
JWT_REFRESH_SECRET=<min-32-chars>

# Optional
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Services (optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

### Backend (`cd backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run seed` | Seed demo data (genres, agents, albums, tracks) |
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

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | - | Register |
| POST | `/auth/login` | - | Login |
| POST | `/auth/logout` | - | Logout |
| POST | `/auth/refresh` | - | Refresh token |
| GET | `/auth/me` | Required | Current user |
| PUT | `/auth/profile` | Required | Update profile |

### Tracks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tracks` | - | List tracks |
| GET | `/tracks/trending` | - | Trending tracks |
| GET | `/tracks/:idOrSlug` | Optional | Track detail |
| POST | `/tracks` | Required | Create track |
| POST | `/tracks/:id/play` | Optional | Record play |
| DELETE | `/tracks/:id` | Required | Delete track |

### Agents
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/agents` | - | List agents |
| GET | `/agents/mine` | Required | My agents |
| GET | `/agents/:idOrSlug` | Optional | Agent detail |
| POST | `/agents` | Required | Create agent |
| PUT | `/agents/:id` | Required | Update agent |
| DELETE | `/agents/:id` | Required | Delete agent |

### Social
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/social/likes/:trackId` | Required | Toggle like |
| GET | `/social/likes` | Required | My liked tracks |
| POST | `/social/follows/:agentId` | Required | Toggle follow |
| GET | `/social/comments/:trackId` | - | Track comments |
| POST | `/social/comments/:trackId` | Required | Add comment |
| DELETE | `/social/comments/:id` | Required | Delete comment |
| GET | `/social/playlists/mine` | Required | My playlists |
| POST | `/social/playlists` | Required | Create playlist |
| POST | `/social/playlists/:id/tracks` | Required | Add to playlist |
| DELETE | `/social/playlists/:pid/tracks/:tid` | Required | Remove from playlist |
| POST | `/social/shares/:trackId` | Optional | Record share |

### Genres
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/genres` | - | List genres |

### Subscription
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription` | Required | Current subscription |
| POST | `/subscription/checkout` | Required | Stripe checkout |
| POST | `/subscription/cancel` | Required | Cancel subscription |
| POST | `/subscription/webhook` | - | Stripe webhook |

### Admin (requires ADMIN role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/users` | List users |
| PUT | `/admin/users/:id/role` | Change user role |
| PUT | `/admin/agents/:id/status` | Manage agent status |
| PUT | `/admin/tracks/:id/status` | Manage track status |
| GET | `/admin/reports` | View reports |
| PUT | `/admin/reports/:id` | Resolve report |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | File upload (Cloudinary) |

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home — featured tracks, trending, new releases |
| `/search` | Search tracks and agents with filters |
| `/feed` | Latest tracks feed |
| `/library` | User's liked tracks and playlists |
| `/track/[slug]` | Track detail — play, like, comment, share |
| `/agent/[slug]` | Agent profile — bio, tracks, follow |
| `/genre/[slug]` | Genre page — tracks in genre |
| `/login` | Login |
| `/register` | Register |
| `/dashboard` | Agent owner dashboard — manage agents and tracks |
| `/admin` | Admin panel — users, reports, platform stats |

---

## Mobile App Screens

| Screen | Description |
|--------|-------------|
| Home tab | Featured and trending tracks |
| Search tab | Search with filters |
| Feed tab | Latest tracks |
| Library tab | Liked tracks, playlists |
| `/track/[slug]` | Track detail |
| `/agent/[slug]` | Agent profile |
| `/player` | Full-screen player with controls |
| `/dashboard` | Agent management & upload |
| `/login` | Login |
| `/register` | Register |

---

## Deployment

### Backend (Railway)

Configuration is in `railway.json`. Set environment variables in the Railway dashboard.

```
Build:  cd backend && npm install && npx prisma generate --schema=../prisma/schema.prisma && npm run build
Start:  cd backend && npm start
Health: /api/health
```

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

### Audio Playback
- **Web**: HTML5 `<audio>` + Web Audio API for EQ processing (5-band parametric EQ, gain control, playback speed)
- **Mobile**: `react-native-track-player` with background audio, lock screen controls, and notification integration
- **Cross-origin audio**: EQ is only enabled for same-origin audio sources; external URLs play normally without CORS restrictions

### Security
- **Password hashing**: Argon2id (64MB memory, 3 iterations, 4 parallelism)
- **JWT**: Signed with `jose` (HS256), short-lived access tokens (15m), HTTP-only refresh cookies (7d)
- **Rate limiting**: Auth routes (10 req/15min), uploads (5 req/min), general (100 req/15min)
- **Headers**: Helmet, HSTS, X-Frame-Options DENY, CSP, no X-Powered-By
- **Validation**: Zod schemas, pagination limits capped at 50, comment length max 2000

### State Management
- Zustand stores in `shared/` are consumed by both web and mobile
- `playerStore`: current track, queue, playback state, EQ, speed, sleep timer, crossfade
- `authStore`: user, tokens, hydration from localStorage/SecureStore

---

## License

MIT
