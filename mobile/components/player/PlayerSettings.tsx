import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  X,
  SlidersHorizontal,
  Clock,
  Gauge,
  RotateCcw,
  Music2,
  Zap,
  Timer,
} from 'lucide-react-native';
import {
  usePlayerStore,
  EQ_PRESETS,
  PLAYBACK_SPEEDS,
  DEFAULT_EQ_BANDS,
  type PlaybackSpeed,
} from '@morlo/shared';
import Slider from '../ui/Slider';
import { hapticLight } from '../../services/hapticService';

const SLEEP_OPTIONS = [
  { label: 'Off', value: null as null | number },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

// ─── EQ Vertical Slider ──────────────────────────────────

function EQBandControl({
  label,
  gain,
  disabled,
  onChange,
}: {
  label: string;
  gain: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <View className="items-center" style={{ width: 40 }}>
      <Text className="text-[10px] text-zinc-500 font-mono mb-1">
        {gain > 0 ? `+${gain}` : gain}
      </Text>
      <View
        className="h-24 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        {/* Track */}
        <View className="absolute w-0.5 h-20 bg-zinc-700 rounded-full" />
        {/* Center mark */}
        <View className="absolute w-3 h-px bg-zinc-600" style={{ top: '50%' }} />
        {/* Fill bar */}
        <View
          className="absolute w-1 rounded-full"
          style={{
            backgroundColor: disabled ? '#52525b' : '#8b5cf6',
            height: `${(Math.abs(gain) / 12) * 40}%`,
            bottom: gain >= 0 ? '50%' : undefined,
            top: gain < 0 ? '50%' : undefined,
          }}
        />
        {/* Thumb */}
        <View
          className="absolute w-3 h-3 rounded-full border-2"
          style={{
            backgroundColor: disabled ? '#3f3f46' : '#fff',
            borderColor: disabled ? '#52525b' : '#8b5cf6',
            bottom: `${((gain + 12) / 24) * 100}%`,
            transform: [{ translateY: 6 }],
          }}
        />
      </View>
      <Text className="text-[10px] text-zinc-500 font-medium mt-1">{label}</Text>
    </View>
  );
}

// ─── Main Modal ───────────────────────────────────────────

export default function PlayerSettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    eqEnabled,
    eqPresetId,
    eqBands,
    toggleEQ,
    setEQPreset,
    setEQBandGain,
    resetEQ,
    playbackSpeed,
    setPlaybackSpeed,
    sleepTimer,
    sleepTimerEnd,
    setSleepTimer,
    crossfade,
    setCrossfade,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'eq' | 'speed' | 'timer' | 'more'>('eq');

  // Note: Sleep timer ticking is handled by the parent player screen.

  const formatTimerRemaining = () => {
    if (!sleepTimerEnd) return null;
    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'eq' as const, label: 'EQ', Icon: SlidersHorizontal },
    { id: 'speed' as const, label: 'Speed', Icon: Gauge },
    { id: 'timer' as const, label: 'Timer', Icon: Timer },
    { id: 'more' as const, label: 'More', Icon: Zap },
  ];

  const handleEQBandChange = (index: number, direction: 'up' | 'down') => {
    const current = eqBands[index]?.gain ?? 0;
    const newGain = direction === 'up'
      ? Math.min(12, current + 1)
      : Math.max(-12, current - 1);
    setEQBandGain(index, newGain);
    hapticLight();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-morlo-bg">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800">
          <View className="flex-row items-center gap-2">
            <SlidersHorizontal size={20} color="#8b5cf6" />
            <Text className="text-white text-base font-semibold">Audio Settings</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="p-2 rounded-full bg-zinc-800"
            accessibilityLabel="Close settings"
          >
            <X size={18} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-zinc-800">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                hapticLight();
              }}
              className="flex-1 items-center py-3"
            >
              <View className="flex-row items-center gap-1">
                <tab.Icon
                  size={14}
                  color={activeTab === tab.id ? '#8b5cf6' : '#71717a'}
                />
                <Text
                  className={`text-xs font-medium ${
                    activeTab === tab.id ? 'text-violet-400' : 'text-zinc-500'
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.id === 'timer' && sleepTimerEnd && (
                  <View className="w-1.5 h-1.5 rounded-full bg-violet-500 ml-0.5" />
                )}
              </View>
              {activeTab === tab.id && (
                <View
                  className="absolute bottom-0 h-0.5 bg-violet-500 rounded-full"
                  style={{ width: '50%' }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>
          {/* ═══ EQ Tab ═══ */}
          {activeTab === 'eq' && (
            <View>
              {/* Toggle + Reset */}
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      toggleEQ();
                      hapticLight();
                    }}
                    className={`w-12 h-6 rounded-full justify-center ${
                      eqEnabled ? 'bg-violet-500' : 'bg-zinc-700'
                    }`}
                  >
                    <View
                      className="w-5 h-5 rounded-full bg-white shadow-sm"
                      style={{
                        transform: [{ translateX: eqEnabled ? 26 : 2 }],
                      }}
                    />
                  </TouchableOpacity>
                  <Text className="text-zinc-400 text-sm">
                    {eqEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    resetEQ();
                    hapticLight();
                  }}
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800"
                >
                  <RotateCcw size={12} color="#a1a1aa" />
                  <Text className="text-zinc-400 text-xs">Reset</Text>
                </TouchableOpacity>
              </View>

              {/* Presets */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-5"
              >
                <View className="flex-row gap-2">
                  {EQ_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => {
                        setEQPreset(preset.id);
                        hapticLight();
                      }}
                      className={`px-3 py-1.5 rounded-full ${
                        eqPresetId === preset.id
                          ? 'bg-violet-500'
                          : 'bg-zinc-800'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          eqPresetId === preset.id
                            ? 'text-white'
                            : 'text-zinc-400'
                        }`}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* EQ Bands */}
              <View className="bg-zinc-900 rounded-2xl p-4">
                <View className="flex-row justify-between px-1">
                  {eqBands.map((band, i) => (
                    <View key={band.frequency} className="items-center">
                      <TouchableOpacity
                        onPress={() => handleEQBandChange(i, 'up')}
                        disabled={!eqEnabled}
                        className="p-1 mb-1"
                      >
                        <Text className={`text-base ${eqEnabled ? 'text-violet-400' : 'text-zinc-700'}`}>
                          +
                        </Text>
                      </TouchableOpacity>
                      <EQBandControl
                        label={band.label}
                        gain={band.gain}
                        disabled={!eqEnabled}
                        onChange={(g) => setEQBandGain(i, g)}
                      />
                      <TouchableOpacity
                        onPress={() => handleEQBandChange(i, 'down')}
                        disabled={!eqEnabled}
                        className="p-1 mt-1"
                      >
                        <Text className={`text-base ${eqEnabled ? 'text-violet-400' : 'text-zinc-700'}`}>
                          −
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View className="flex-row justify-between mt-2 px-2">
                  <Text className="text-[9px] text-zinc-600">+12 dB</Text>
                  <Text className="text-[9px] text-zinc-600">0 dB</Text>
                  <Text className="text-[9px] text-zinc-600">-12 dB</Text>
                </View>
              </View>
            </View>
          )}

          {/* ═══ Speed Tab ═══ */}
          {activeTab === 'speed' && (
            <View>
              <View className="items-center mb-8">
                <Text className="text-5xl font-bold text-white">
                  {playbackSpeed}x
                </Text>
                <Text className="text-xs text-zinc-500 mt-1">
                  Playback Speed
                </Text>
              </View>

              <View className="flex-row flex-wrap justify-center gap-3 mb-8">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    onPress={() => {
                      setPlaybackSpeed(speed);
                      hapticLight();
                    }}
                    className={`w-16 h-12 rounded-2xl items-center justify-center ${
                      playbackSpeed === speed
                        ? 'bg-violet-500'
                        : 'bg-zinc-800'
                    }`}
                    style={
                      playbackSpeed === speed
                        ? { transform: [{ scale: 1.1 }] }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        playbackSpeed === speed
                          ? 'text-white'
                          : 'text-zinc-400'
                      }`}
                    >
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row items-center gap-3">
                <Text className="text-xs text-zinc-500">0.5x</Text>
                <View className="flex-1">
                  <Slider
                    value={(playbackSpeed - 0.5) / 1.5}
                    max={1}
                    onValueChange={(v) => {
                      const speed = Math.round((v * 1.5 + 0.5) * 4) / 4;
                      const clamped = Math.max(0.5, Math.min(2, speed));
                      setPlaybackSpeed(clamped as PlaybackSpeed);
                    }}
                  />
                </View>
                <Text className="text-xs text-zinc-500">2x</Text>
              </View>
            </View>
          )}

          {/* ═══ Timer Tab ═══ */}
          {activeTab === 'timer' && (
            <View>
              <View className="items-center mb-8">
                {sleepTimerEnd ? (
                  <>
                    <Text className="text-5xl font-bold text-violet-400 font-mono">
                      {formatTimerRemaining()}
                    </Text>
                    <Text className="text-xs text-zinc-500 mt-1">remaining</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSleepTimer(null);
                        hapticLight();
                      }}
                      className="mt-4 px-5 py-2 rounded-full bg-red-500/20"
                    >
                      <Text className="text-red-400 text-sm font-medium">
                        Cancel Timer
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Clock size={40} color="#71717a" />
                    <Text className="text-sm text-zinc-500 mt-3 text-center">
                      Set a sleep timer to{'\n'}automatically stop playback
                    </Text>
                  </>
                )}
              </View>

              <View className="flex-row flex-wrap gap-3 justify-center">
                {SLEEP_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      setSleepTimer(opt.value);
                      hapticLight();
                    }}
                    className={`px-5 py-3 rounded-2xl ${
                      (opt.value === null && !sleepTimerEnd) ||
                      (opt.value !== null && sleepTimer === opt.value)
                        ? 'bg-violet-500'
                        : 'bg-zinc-800'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        (opt.value === null && !sleepTimerEnd) ||
                        (opt.value !== null && sleepTimer === opt.value)
                          ? 'text-white'
                          : 'text-zinc-400'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ═══ More Tab ═══ */}
          {activeTab === 'more' && (
            <View>
              {/* Crossfade */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <Music2 size={16} color="#71717a" />
                    <Text className="text-white text-sm font-medium">
                      Crossfade
                    </Text>
                  </View>
                  <Text className="text-xs text-zinc-500 font-mono">
                    {crossfade === 0 ? 'Off' : `${crossfade}s`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="text-xs text-zinc-500">Off</Text>
                  <View className="flex-1">
                    <Slider
                      value={crossfade}
                      max={12}
                      onValueChange={(v) => setCrossfade(Math.round(v))}
                    />
                  </View>
                  <Text className="text-xs text-zinc-500">12s</Text>
                </View>
              </View>

              {/* Current Settings Summary */}
              <View className="bg-zinc-900 rounded-2xl p-4 mt-4">
                <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Current Settings
                </Text>
                <View className="space-y-2">
                  <View className="flex-row justify-between py-1">
                    <Text className="text-zinc-400 text-sm">Equalizer</Text>
                    <Text className="text-white text-sm font-medium">
                      {eqEnabled
                        ? EQ_PRESETS.find((p) => p.id === eqPresetId)?.name || 'Custom'
                        : 'Off'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-zinc-400 text-sm">Speed</Text>
                    <Text className="text-white text-sm font-medium">
                      {playbackSpeed}x
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-zinc-400 text-sm">Sleep Timer</Text>
                    <Text className="text-white text-sm font-medium">
                      {sleepTimerEnd ? formatTimerRemaining() : 'Off'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-zinc-400 text-sm">Crossfade</Text>
                    <Text className="text-white text-sm font-medium">
                      {crossfade === 0 ? 'Off' : `${crossfade}s`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Bottom spacer */}
          <View className="h-8" />
        </ScrollView>
      </View>
    </Modal>
  );
}
