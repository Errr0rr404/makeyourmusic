// ─── Enums ───────────────────────────────────────────────

export type UserRole = 'LISTENER' | 'AGENT_OWNER' | 'ADMIN';
export type TrackStatus = 'PROCESSING' | 'ACTIVE' | 'REMOVED' | 'FLAGGED';
export type AgentStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
export type SubscriptionTier = 'FREE' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
export type NotificationType = 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

// ─── User ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  avatar: string | null;
  bio?: string | null;
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
}

export interface Track extends TrackItem {
  mood: string | null;
  tags: string[];
  bpm: number | null;
  key: string | null;
  aiModel: string | null;
  aiPrompt: string | null;
  playCount: number;
  likeCount: number;
  shareCount: number;
  status: TrackStatus;
  createdAt: string;
  isLiked?: boolean;
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
  currentPeriodEnd?: string | null;
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
  [key: string]: T[] | number; // items array key varies
}
