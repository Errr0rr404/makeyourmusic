'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Bot, Plus, Music, Users, Play, Heart, Upload, Trash2, BarChart3,
} from 'lucide-react';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { AudioUpload } from '@/components/upload/AudioUpload';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const confirm = useConfirm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showUploadTrack, setShowUploadTrack] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentForm, setAgentForm] = useState({ name: '', bio: '', avatar: '', coverImage: '' });
  const [trackForm, setTrackForm] = useState({
    title: '', audioUrl: '', coverArt: '', duration: '', genreId: '', mood: '',
    aiModel: '', aiPrompt: '', videoUrl: '', isPublic: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [genres, setGenres] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      try {
        const [agentsRes, genresRes] = await Promise.all([
          api.get('/agents/mine'),
          api.get('/genres'),
        ]);
        setAgents(agentsRes.data.agents || []);
        setGenres(genresRes.data.genres || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      }
      setLoading(false);
    }
    load();
  }, [isAuthenticated]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, string> = { name: agentForm.name };
      if (agentForm.bio) payload.bio = agentForm.bio;
      if (agentForm.avatar) payload.avatar = agentForm.avatar;
      if (agentForm.coverImage) payload.coverImage = agentForm.coverImage;
      const res = await api.post('/agents', payload);
      setAgents([res.data.agent, ...agents]);
      setShowCreateAgent(false);
      setAgentForm({ name: '', bio: '', avatar: '', coverImage: '' });
      toast.success(`Agent "${res.data.agent.name}" created`);
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setSubmitting(true);
    try {
      await api.post('/tracks', { ...trackForm, agentId: selectedAgentId });
      setShowUploadTrack(false);
      setTrackForm({ title: '', audioUrl: '', coverArt: '', duration: '', genreId: '', mood: '', aiModel: '', aiPrompt: '', videoUrl: '', isPublic: true });
      const res = await api.get('/agents/mine');
      setAgents(res.data.agents || []);
      toast.success('Track uploaded');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to upload track');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: `This will permanently remove the agent and all its tracks, followers, and stats. This cannot be undone.`,
      confirmLabel: 'Delete agent',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/agents/${id}`);
      setAgents(agents.filter(a => a.id !== id));
      toast.success('Agent deleted');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete agent');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Creator Studio</h2>
          <p className="text-[color:var(--text-mute)] mb-4">Log in to manage your AI agents</p>
          <Link href="/login" className="mym-cta">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-start gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[color:var(--text)] flex items-center gap-2 leading-tight">
              <BarChart3 className="w-6 h-6 text-[color:var(--brand)]" />
              Creator Studio
            </h1>
            <p className="text-[color:var(--text-mute)] text-sm mt-1">Manage your AI agents and tracks</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
            <Link
              href="/dashboard/earnings"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--bg-elev-2)] border border-[color:var(--stroke)] text-[color:var(--text)] text-sm font-semibold hover:bg-[color:var(--bg-elev-3)] transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Earnings
            </Link>
            <button onClick={() => setShowCreateAgent(true)} className="mym-cta mym-cta-sm">
              <Plus className="w-4 h-4" /> New Agent
            </button>
          </div>
        </div>

        {/* Create Agent Modal */}
        {showCreateAgent && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateAgent(false)}>
            <div className="bg-[color:var(--bg-elev-1)] rounded-xl p-4 sm:p-6 w-full max-w-lg border border-[color:var(--stroke)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[color:var(--text)] mb-4">Create AI Agent</h2>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-[auto_1fr]">
                  <div className="w-full max-w-[7rem]">
                    <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Avatar</label>
                    <ImageUpload
                      value={agentForm.avatar}
                      onChange={(url) => setAgentForm(p => ({ ...p, avatar: url }))}
                      aspectRatio="square"
                      maxSizeMB={5}
                      label="Upload"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Name *</label>
                      <input value={agentForm.name} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} required maxLength={100}
                        className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Bio</label>
                      <textarea value={agentForm.bio} onChange={e => setAgentForm(p => ({ ...p, bio: e.target.value }))} rows={3} maxLength={500}
                        className="w-full px-3 py-2 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors resize-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Cover image (optional)</label>
                  <ImageUpload
                    value={agentForm.coverImage}
                    onChange={(url) => setAgentForm(p => ({ ...p, coverImage: url }))}
                    aspectRatio="banner"
                    maxSizeMB={8}
                    label="Upload banner"
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button type="button" onClick={() => setShowCreateAgent(false)} className="px-4 py-2 text-sm text-[color:var(--text-mute)] hover:text-[color:var(--text)] transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting || !agentForm.name} className="mym-cta mym-cta-sm disabled:opacity-50">
                    {submitting ? 'Creating…' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Track Modal */}
        {showUploadTrack && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadTrack(false)}>
            <div className="bg-[color:var(--bg-elev-1)] rounded-xl p-4 sm:p-6 w-full max-w-xl border border-[color:var(--stroke)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[color:var(--text)] mb-4">Upload Track</h2>
              <form onSubmit={handleUploadTrack} className="space-y-4">
                <div>
                  <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Audio file *</label>
                  <AudioUpload
                    value={trackForm.audioUrl}
                    onChange={(url, meta) => {
                      setTrackForm(p => ({
                        ...p,
                        audioUrl: url,
                        duration: meta?.duration ? String(Math.round(meta.duration)) : p.duration,
                      }));
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-[auto_1fr]">
                  <div className="w-full max-w-[7rem]">
                    <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Cover art</label>
                    <ImageUpload
                      value={trackForm.coverArt}
                      onChange={(url) => setTrackForm(p => ({ ...p, coverArt: url }))}
                      aspectRatio="square"
                      maxSizeMB={5}
                      label="Upload"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Title *</label>
                      <input value={trackForm.title} onChange={e => setTrackForm(p => ({ ...p, title: e.target.value }))} required maxLength={200}
                        className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Duration (s) *</label>
                        <input type="number" value={trackForm.duration} onChange={e => setTrackForm(p => ({ ...p, duration: e.target.value }))} required min={1} max={36000}
                          className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Genre</label>
                        <select value={trackForm.genreId} onChange={e => setTrackForm(p => ({ ...p, genreId: e.target.value }))}
                          className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors">
                          <option value="">Select genre</option>
                          {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">AI Model</label>
                    <input value={trackForm.aiModel} onChange={e => setTrackForm(p => ({ ...p, aiModel: e.target.value }))} placeholder="e.g. Suno v3" maxLength={100}
                      className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Mood</label>
                    <input value={trackForm.mood} onChange={e => setTrackForm(p => ({ ...p, mood: e.target.value }))} placeholder="e.g. Chill" maxLength={50}
                      className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">AI Prompt</label>
                  <textarea value={trackForm.aiPrompt} onChange={e => setTrackForm(p => ({ ...p, aiPrompt: e.target.value }))} rows={2} maxLength={2000}
                    className="w-full px-3 py-2 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-[color:var(--text-mute)] mb-1.5">Video URL (optional)</label>
                  <input value={trackForm.videoUrl} onChange={e => setTrackForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://..." type="url"
                    className="w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-[color:var(--text)] text-sm border border-[color:var(--stroke)] focus:border-[color:var(--brand)] focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-[color:var(--text-mute)] mb-2">Visibility</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${trackForm.isPublic ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand)]' : 'bg-[color:var(--bg-elev-2)] border-[color:var(--stroke)] hover:border-[color:var(--stroke-strong)]'}`}>
                      <input
                        type="radio"
                        name="visibility"
                        checked={trackForm.isPublic}
                        onChange={() => setTrackForm(p => ({ ...p, isPublic: true }))}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text)]">Public</p>
                        <p className="text-xs text-[color:var(--text-mute)]">Anyone can listen</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${!trackForm.isPublic ? 'bg-[color:var(--brand-soft)] border-[color:var(--brand)]' : 'bg-[color:var(--bg-elev-2)] border-[color:var(--stroke)] hover:border-[color:var(--stroke-strong)]'}`}>
                      <input
                        type="radio"
                        name="visibility"
                        checked={!trackForm.isPublic}
                        onChange={() => setTrackForm(p => ({ ...p, isPublic: false }))}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text)]">Private</p>
                        <p className="text-xs text-[color:var(--text-mute)]">Only you can listen</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button type="button" onClick={() => setShowUploadTrack(false)} className="px-4 py-2 text-sm text-[color:var(--text-mute)] hover:text-[color:var(--text)] transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting || !trackForm.audioUrl || !trackForm.title || !trackForm.duration} className="mym-cta mym-cta-sm disabled:opacity-50">
                    {submitting ? 'Uploading…' : 'Upload Track'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Agent Cards */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 bg-[color:var(--bg-elev-1)] rounded-xl shimmer" />
            ))}
          </div>
        ) : agents.length > 0 ? (
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-[color:var(--bg-elev-1)] rounded-xl p-5 border border-[color:var(--stroke)]">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-[color:var(--brand-glow)]"
                    style={{ background: agent.avatar ? undefined : 'var(--aurora)' }}
                  >
                    {agent.avatar ? (
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Bot className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Link href={`/agent/${agent.slug}`} className="text-lg font-bold text-[color:var(--text)] hover:underline">{agent.name}</Link>
                      <div className="flex gap-2 sm:shrink-0">
                        <button
                          onClick={() => { setSelectedAgentId(agent.id); setShowUploadTrack(true); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--brand)] text-white text-xs font-bold hover:bg-[color:var(--brand-strong)] transition-colors">
                          <Upload className="w-3 h-3" /> Upload Track
                        </button>
                        <button onClick={() => handleDeleteAgent(agent.id, agent.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          aria-label={`Delete ${agent.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {agent.bio && <p className="text-sm text-[color:var(--text-mute)] mt-1 line-clamp-2">{agent.bio}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-[color:var(--text-mute)]">
                      <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {agent._count?.tracks || 0} tracks</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {agent.followerCount} followers</span>
                      <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {agent.totalPlays} plays</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {agent.totalLikes} likes</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                 style={{ background: 'var(--aurora)', opacity: 0.18 }}>
              <Bot className="w-6 h-6 text-[color:var(--brand)]" />
            </div>
            <h2 className="text-lg font-bold text-[color:var(--text)] mb-2">No AI Agents Yet</h2>
            <p className="text-sm text-[color:var(--text-mute)] mb-4 max-w-sm mx-auto">Create your first AI agent to start uploading tracks</p>
            <button onClick={() => setShowCreateAgent(true)} className="mym-cta mym-cta-sm">
              <Plus className="w-4 h-4" /> Create Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
