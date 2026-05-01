// ─── Enums ───────────────────────────────────────────────

export type UserRole = 'LISTENER' | 'AGENT_OWNER' | 'ADMIN';
export type TrackStatus = 'PROCESSING' | 'ACTIVE' | 'REMOVED' | 'FLAGGED';
export type AgentStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
// CREATOR is the lead paid tier ($3.99) and grants the same access as PREMIUM
// for most paywalled features. Higher-tier-only features can additionally
// gate on `tier === 'PREMIUM'`.
export type SubscriptionTier = 'FREE' | 'CREATOR' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
export type NotificationType = 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
export type PlaylistAccessTier = 'PUBLIC' | 'PRIVATE' | 'PAID';
export type ConnectAccountStatus = 'PENDING' | 'ACTIVE' | 'RESTRICTED' | 'DISCONNECTED';
export type TipStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type ChannelSubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type GenerationKind = 'MUSIC' | 'VIDEO';
export type TakedownStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type SyncLicenseStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'REVOKED';
export type DistributionStatus = 'PENDING' | 'SUBMITTED' | 'LIVE' | 'REJECTED' | 'TAKEDOWN';
export type StemStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

// ─── User ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  avatar: string | null;
  bio?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  subscription?: { tier: SubscriptionTier; status: SubscriptionStatus } | null;
  _count?: { likes: number; playlists: number; follows: number };
}

// ─── Track ───────────────────────────────────────────────

export interface TrackItem {
  id: string;
  title: string;
  slug: string;
  audioUrl: string;
  coverArt: string | null;
  duration: number;
  agent: AgentBrief;
  genre?: GenreBrief | null;
  video?: Video | null;
  // 15-30s vertical clip for TikTok/Reels share. Set when the auto-preview
  // video pipeline has finished. Optional everywhere.
  previewVideoUrl?: string | null;
}

export interface Track extends TrackItem {
  mood: string | null;
  tags: string[];
  bpm: number | null;
  key: string | null;
  lyrics?: string | null;
  aiModel: string | null;
  aiPrompt: string | null;
  isPublic?: boolean;
  playCount: number;
  likeCount: number;
  shareCount: number;
  downloadCount?: number;
  status: TrackStatus;
  createdAt: string;
  isLiked?: boolean;
  // Sync licensing
  licenseable?: boolean;
  licensePriceCents?: number | null;
  licenseCurrency?: string | null;
  // DMCA / takedown — null when no takedown is open.
  takedownStatus?: TakedownStatus | null;
  // Trending / recs (read-only — populated by cron).
  trendingScore?: number;
  // Lineage when created via section regen / song extension.
  parentTrackId?: string | null;
  _count?: { likes: number; comments: number; plays: number };
}

// ─── Video ──────────────────────────────────────────────

export interface Video {
  id: string;
  videoUrl: string;
  thumbnail?: string | null;
  duration?: number | null;
  createdAt?: string;
}

// ─── Agent ───────────────────────────────────────────────

export interface AgentBrief {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
}

export interface Agent extends AgentBrief {
  coverImage: string | null;
  bio: string | null;
  status: AgentStatus;
  aiModel: string | null;
  totalPlays: number;
  totalLikes: number;
  followerCount: number;
  createdAt: string;
  isFollowing?: boolean;
  genres?: Array<{ genre: Genre }>;
  owner?: { id: string; username: string; displayName?: string | null };
  _count?: { tracks: number; followers: number };
}

// ─── Genre ───────────────────────────────────────────────

export interface GenreBrief {
  name: string;
  slug: string;
}

export interface Genre extends GenreBrief {
  id: string;
  color: string | null;
  _count?: { tracks: number };
}

// ─── Comment ─────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string | null; avatar: string | null };
  replies?: Comment[];
}

// ─── Playlist ────────────────────────────────────────────

export interface Playlist {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverArt: string | null;
  isPublic: boolean;
  createdAt: string;
  user?: { id: string; username: string; displayName: string | null; avatar: string | null };
  tracks?: Array<{ track: Track; position: number }>;
  _count?: { tracks: number };
}

// ─── Subscription ────────────────────────────────────────

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

// ─── Creator economy ─────────────────────────────────────

export interface ConnectAccount {
  id: string;
  status: ConnectAccountStatus;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string | null;
  defaultCurrency?: string | null;
}

export interface Tip {
  id: string;
  amountCents: number;
  platformFeeCents: number;
  netCents: number;
  currency: string;
  message?: string | null;
  status: TipStatus;
  createdAt: string;
  fromUser?: { id: string; username: string; displayName: string | null; avatar: string | null } | null;
  toUserId: string;
  trackId?: string | null;
}

export interface ChannelSubscription {
  id: string;
  amountCents: number;
  platformFeeBps: number;
  currency: string;
  status: ChannelSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  playlist?: { id: string; title: string; slug: string; coverArt?: string | null; monthlyPriceCents?: number | null };
  creator?: { id: string; username: string; displayName: string | null; avatar: string | null };
  subscriber?: { id: string; username: string; displayName: string | null; avatar: string | null };
}

export interface SyncLicense {
  id: string;
  status: SyncLicenseStatus;
  amountCents: number;
  platformFeeCents: number;
  netCents: number;
  currency: string;
  licenseTier: string;
  buyerEmail?: string | null;
  buyerName?: string | null;
  intendedUse?: string | null;
  downloadExpiresAt?: string | null;
  createdAt: string;
  trackId: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  rateLimitPerMin: number;
  createdAt: string;
}

export interface ReferralEarning {
  id: string;
  amountCents: number;
  currency: string;
  source: 'tip' | 'channel_sub' | 'sync_license';
  paidOut: boolean;
  createdAt: string;
}

export interface MusicGeneration {
  id: string;
  status: GenerationStatus;
  title?: string | null;
  prompt?: string | null;
  lyrics?: string | null;
  audioUrl?: string | null;
  coverArt?: string | null;
  errorMessage?: string | null;
  provider: string;
  providerModel?: string | null;
  trackId?: string | null;
  createdAt: string;
}

export interface VideoGeneration {
  id: string;
  status: GenerationStatus;
  purpose: string;
  videoUrl?: string | null;
  thumbnail?: string | null;
  errorMessage?: string | null;
  trackId?: string | null;
  createdAt: string;
}

export interface Takedown {
  id: string;
  status: TakedownStatus;
  reason: string;
  claimantName: string;
  claimantEmail: string;
  evidenceUrl?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  trackId: string;
}

export interface TrackDistribution {
  id: string;
  status: DistributionStatus;
  partner: string;
  upc?: string | null;
  isrc?: string | null;
  releaseDate?: string | null;
  createdAt: string;
  trackId: string;
}

export interface TrackStems {
  id: string;
  status: StemStatus;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  vocalsUrl?: string | null;
  otherUrl?: string | null;
  forSaleCents?: number | null;
  currency?: string | null;
  trackId: string;
}

// ─── Notification ────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any> | null;
  createdAt: string;
}

// ─── Report ──────────────────────────────────────────────

export interface Report {
  id: string;
  reason: string;
  status: ReportStatus;
  notes?: string | null;
  createdAt: string;
  user?: { id: string; username: string };
  track?: { id: string; title: string; slug: string };
}

// ─── API Responses ───────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  items: T[];
}

/**
 * Loosely-typed legacy paginated response. Use only as a transitional bridge
 * for backend endpoints that still return one of the named-field shapes
 * (`tracks` / `agents` / etc.) instead of `items`. New code should consume
 * `PaginatedResponse<T>` and the backend should normalize its responses.
 */
export interface LegacyPaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  items?: T[];
  tracks?: T[];
  agents?: T[];
  genres?: T[];
  comments?: T[];
  playlists?: T[];
}
