'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayerStore, EQ_PRESETS, PLAYBACK_SPEEDS, type PlaybackSpeed } from '@morlo/shared';
import {
  X, SlidersHorizontal, Clock, Gauge, Music2, RotateCcw,
  Disc3, Timer, Zap,
} from 'lucide-react';

const SLEEP_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

// ─── EQ Band Slider ──────────────────────────────────────

function EQBandSlider({
  label, gain, onChange, disabled,
}: {
  label: string;
  gain: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const percent = ((gain + 12) / 24) * 100;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
        {gain > 0 ? `+${gain}` : gain}
      </span>
      <div className="relative h-28 w-6 flex items-center justify-center">
        {/* Track background */}
        <div className="absolute w-1 h-full rounded-full bg-[hsl(var(--secondary))]" />
        {/* Fill */}
        <div
          className="absolute w-1 rounded-full transition-all duration-75"
          style={{
            background: disabled
              ? 'hsl(var(--muted-foreground))'
              : 'hsl(var(--accent))',
            height: `${Math.abs(gain) / 12 * 50}%`,
            bottom: gain >= 0 ? '50%' : undefined,
            top: gain < 0 ? '50%' : undefined,
          }}
        />
        {/* Center line */}
        <div className="absolute w-3 h-[1px] bg-[hsl(var(--muted-foreground))] opacity-40" style={{ top: '50%' }} />
        {/* Thumb position */}
        <div
          className={`absolute w-3.5 h-3.5 rounded-full border-2 shadow-md transition-all duration-75 ${
            disabled
              ? 'bg-[hsl(var(--muted))] border-[hsl(var(--muted-foreground))]'
              : 'bg-white border-[hsl(var(--accent))]'
          }`}
          style={{ bottom: `${percent}%`, transform: 'translateY(50%)' }}
        />
        <input
          type="range"
          min={-12}
          max={12}
          step={1}
          value={gain}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' } as React.CSSProperties}
          aria-label={`EQ band ${label}`}
        />
      </div>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">{label}</span>
    </div>
  );
}

// ─── Main PlayerSettings Panel ────────────────────────────

export function PlayerSettings() {
  const {
    showSettings, toggleSettings,
    eqEnabled, eqPresetId, eqBands, toggleEQ, setEQPreset, setEQBandGain, resetEQ,
    playbackSpeed, setPlaybackSpeed,
    sleepTimer, sleepTimerEnd, setSleepTimer,
    crossfade, setCrossfade,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'eq' | 'speed' | 'timer' | 'more'>('eq');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) toggleSettings();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSettings, toggleSettings]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        toggleSettings();
      }
    };
    if (showSettings) {
      // Delay to avoid immediate close from the toggle click
      const timer = setTimeout(() => {
        window.addEventListener('mousedown', handleClick);
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('mousedown', handleClick);
      };
    }
  }, [showSettings, toggleSettings]);

  // Note: Sleep timer ticking + EQ/speed sync are handled by AudioPlayer.tsx
  // to avoid duplicate effects when this panel is open.

  const handleBandChange = useCallback((index: number, gain: number) => {
    setEQBandGain(index, gain);
  }, [setEQBandGain]);

  if (!showSettings) return null;

  const formatTimerRemaining = () => {
    if (!sleepTimerEnd) return null;
    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'eq' as const, label: 'Equalizer', icon: SlidersHorizontal },
    { id: 'speed' as const, label: 'Speed', icon: Gauge },
    { id: 'timer' as const, label: 'Timer', icon: Timer },
    { id: 'more' as const, label: 'More', icon: Zap },
  ];

  return (
    <div className="fixed bottom-[var(--player-height)] left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        ref={panelRef}
        className="w-full max-w-lg mx-4 mb-2 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl backdrop-blur-xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-[hsl(var(--accent))]" />
            <h3 className="text-sm font-semibold text-white">Audio Settings</h3>
          </div>
          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-full text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary))] transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[hsl(var(--border))]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[hsl(var(--accent))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[hsl(var(--accent))] rounded-full" />
              )}
              {/* Timer badge */}
              {tab.id === 'timer' && sleepTimerEnd && (
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 min-h-[220px]">
          {/* ═══ EQ Tab ═══ */}
          {activeTab === 'eq' && (
            <div>
              {/* EQ Toggle + Preset */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleEQ}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      eqEnabled ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--secondary))]'
                    }`}
                    aria-label={eqEnabled ? 'Disable equalizer' : 'Enable equalizer'}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        eqEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {eqEnabled ? 'On' : 'Off'}
                  </span>
                </div>
                <button
                  onClick={resetEQ}
                  className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                  aria-label="Reset equalizer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              {/* Preset Selector */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {EQ_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setEQPreset(preset.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        eqPresetId === preset.id
                          ? 'bg-[hsl(var(--accent))] text-white'
                          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--secondary)/0.8)]'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                  {eqPresetId === 'custom' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[hsl(var(--accent))] text-white">
                      Custom
                    </span>
                  )}
                </div>
              </div>

              {/* EQ Bands */}
              <div className="flex items-end justify-between gap-1 px-2">
                {eqBands.map((band, i) => (
                  <EQBandSlider
                    key={band.frequency}
                    label={band.label}
                    gain={band.gain}
                    onChange={(g) => handleBandChange(i, g)}
                    disabled={!eqEnabled}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-[hsl(var(--muted-foreground))] mt-1 px-4">
                <span>+12 dB</span>
                <span>0 dB</span>
                <span>-12 dB</span>
              </div>
            </div>
          )}

          {/* ═══ Speed Tab ═══ */}
          {activeTab === 'speed' && (
            <div>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-white">{playbackSpeed}x</span>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Playback Speed</p>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`w-14 h-10 rounded-xl text-sm font-semibold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-[hsl(var(--accent))] text-white scale-110 shadow-lg'
                        : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white hover:scale-105'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">0.5x</span>
                <div className="flex-1 relative group">
                  <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))]">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
                      style={{ width: `${((playbackSpeed - 0.5) / 1.5) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.25}
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value) as PlaybackSpeed)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Playback speed slider"
                  />
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">2x</span>
              </div>
            </div>
          )}

          {/* ═══ Timer Tab ═══ */}
          {activeTab === 'timer' && (
            <div>
              <div className="text-center mb-6">
                {sleepTimerEnd ? (
                  <>
                    <div className="text-4xl font-bold text-[hsl(var(--accent))] font-mono">
                      {formatTimerRemaining()}
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">remaining</p>
                    <button
                      onClick={() => setSleepTimer(null)}
                      className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Cancel Timer
                    </button>
                  </>
                ) : (
                  <>
                    <Clock className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Set a sleep timer to stop playback
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSleepTimer(opt.value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      (opt.value === null && !sleepTimerEnd) ||
                      (opt.value !== null && sleepTimer === opt.value)
                        ? 'bg-[hsl(var(--accent))] text-white'
                        : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ More Tab ═══ */}
          {activeTab === 'more' && (
            <div className="space-y-5">
              {/* Crossfade */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm text-white font-medium">Crossfade</span>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                    {crossfade === 0 ? 'Off' : `${crossfade}s`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Off</span>
                  <div className="flex-1 relative group">
                    <div className="h-1.5 rounded-full bg-[hsl(var(--secondary))]">
                      <div
                        className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
                        style={{ width: `${(crossfade / 12) * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={crossfade}
                      onChange={(e) => setCrossfade(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Crossfade duration"
                    />
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">12s</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="rounded-xl bg-[hsl(var(--secondary)/0.5)] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Current Settings
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">EQ</span>
                    <span className="text-white font-medium">
                      {eqEnabled
                        ? EQ_PRESETS.find((p) => p.id === eqPresetId)?.name || 'Custom'
                        : 'Off'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Speed</span>
                    <span className="text-white font-medium">{playbackSpeed}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Timer</span>
                    <span className="text-white font-medium">
                      {sleepTimerEnd ? formatTimerRemaining() : 'Off'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Crossfade</span>
                    <span className="text-white font-medium">
                      {crossfade === 0 ? 'Off' : `${crossfade}s`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
