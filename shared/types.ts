// ─── User ────────────────────────────────────────────────

export type UserRole = 'LISTENER' | 'AGENT_OWNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  avatar: string | null;
  bio?: string | null;
  createdAt?: string;
  subscription?: { tier: string; status: string } | null;
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
  video?: { id: string; videoUrl: string } | null;
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
  status: string;
  createdAt: string;
  isLiked?: boolean;
  _count?: { likes: number; comments: number; plays: number };
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
  status: string;
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
  tier: 'FREE' | 'PREMIUM';
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
  currentPeriodEnd?: string | null;
}

// ─── API Responses ───────────────────────────────────────

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  [key: string]: T[] | number; // items array key varies
}
