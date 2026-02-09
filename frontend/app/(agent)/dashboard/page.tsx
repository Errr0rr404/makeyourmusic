'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Bot, Plus, Music, Users, Play, Heart, Upload, Pencil, Trash2, BarChart3,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showUploadTrack, setShowUploadTrack] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentForm, setAgentForm] = useState({ name: '', bio: '' });
  const [trackForm, setTrackForm] = useState({
    title: '', audioUrl: '', coverArt: '', duration: '', genreId: '', mood: '',
    aiModel: '', aiPrompt: '', videoUrl: '',
  });
  const [genres, setGenres] = useState<any[]>([]);

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
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
      }
      setLoading(false);
    }
    load();
  }, [isAuthenticated]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/agents', agentForm);
      setAgents([res.data.agent, ...agents]);
      setShowCreateAgent(false);
      setAgentForm({ name: '', bio: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create agent');
    }
  };

  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    try {
      await api.post('/tracks', { ...trackForm, agentId: selectedAgentId });
      setShowUploadTrack(false);
      setTrackForm({ title: '', audioUrl: '', coverArt: '', duration: '', genreId: '', mood: '', aiModel: '', aiPrompt: '', videoUrl: '' });
      // Refresh agents
      const res = await api.get('/agents/mine');
      setAgents(res.data.agents || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload track');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure? This will delete the agent and all its tracks.')) return;
    try {
      await api.delete(`/agents/${id}`);
      setAgents(agents.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete agent');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Creator Studio</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to manage your AI agents</p>
          <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[hsl(var(--accent))]" />
              Creator Studio
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Manage your AI agents and tracks</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateAgent(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 transition-colors">
              <Plus className="w-4 h-4" /> New Agent
            </button>
          </div>
        </div>

        {/* Create Agent Modal */}
        {showCreateAgent && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[hsl(var(--card))] rounded-xl p-6 w-full max-w-md border border-[hsl(var(--border))]">
              <h2 className="text-lg font-bold text-white mb-4">Create AI Agent</h2>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Name</label>
                  <input value={agentForm.name} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} required
                    className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Bio</label>
                  <textarea value={agentForm.bio} onChange={e => setAgentForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCreateAgent(false)} className="px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upload Track Modal */}
        {showUploadTrack && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[hsl(var(--card))] rounded-xl p-6 w-full max-w-lg border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Upload Track</h2>
              <form onSubmit={handleUploadTrack} className="space-y-3">
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Title *</label>
                  <input value={trackForm.title} onChange={e => setTrackForm(p => ({ ...p, title: e.target.value }))} required
                    className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Audio URL *</label>
                  <input value={trackForm.audioUrl} onChange={e => setTrackForm(p => ({ ...p, audioUrl: e.target.value }))} required placeholder="https://..."
                    className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Duration (seconds) *</label>
                    <input type="number" value={trackForm.duration} onChange={e => setTrackForm(p => ({ ...p, duration: e.target.value }))} required
                      className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Genre</label>
                    <select value={trackForm.genreId} onChange={e => setTrackForm(p => ({ ...p, genreId: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none">
                      <option value="">Select genre</option>
                      {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Cover Art URL</label>
                  <input value={trackForm.coverArt} onChange={e => setTrackForm(p => ({ ...p, coverArt: e.target.value }))} placeholder="https://..."
                    className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">AI Model</label>
                    <input value={trackForm.aiModel} onChange={e => setTrackForm(p => ({ ...p, aiModel: e.target.value }))} placeholder="e.g. Suno v3"
                      className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Mood</label>
                    <input value={trackForm.mood} onChange={e => setTrackForm(p => ({ ...p, mood: e.target.value }))} placeholder="e.g. Chill"
                      className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">AI Prompt</label>
                  <textarea value={trackForm.aiPrompt} onChange={e => setTrackForm(p => ({ ...p, aiPrompt: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">Video URL (optional)</label>
                  <input value={trackForm.videoUrl} onChange={e => setTrackForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://..."
                    className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowUploadTrack(false)} className="px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium">Upload Track</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Agent Cards */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 bg-[hsl(var(--card))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : agents.length > 0 ? (
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-[hsl(var(--card))] rounded-xl p-5 border border-[hsl(var(--border))]">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    {agent.avatar ? (
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Bot className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Link href={`/agent/${agent.slug}`} className="text-lg font-bold text-white hover:underline">{agent.name}</Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedAgentId(agent.id); setShowUploadTrack(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-medium hover:bg-[hsl(var(--primary))]/90">
                          <Upload className="w-3 h-3" /> Upload Track
                        </button>
                        <button onClick={() => handleDeleteAgent(agent.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {agent.bio && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">{agent.bio}</p>}
                    <div className="flex gap-4 mt-3 text-xs text-[hsl(var(--muted-foreground))]">
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
          <div className="text-center py-20 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
            <Bot className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">No AI Agents Yet</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Create your first AI agent to start uploading tracks</p>
            <button onClick={() => setShowCreateAgent(true)}
              className="px-5 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white text-sm font-medium">
              Create Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
