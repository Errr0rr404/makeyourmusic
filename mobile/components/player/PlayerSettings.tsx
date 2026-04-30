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
} from '@makeyourmusic/shared';
import Slider from '../ui/Slider';
import { hapticLight } from '../../services/hapticService';
import { useTokens, useIsVintage, type ThemeTokens } from '../../lib/theme';

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
  tokens,
  isVintage,
}: {
  label: string;
  gain: number;
  disabled: boolean;
  onChange: (v: number) => void;
  tokens: ThemeTokens;
  isVintage: boolean;
}) {
  const fillColor = disabled ? tokens.borderStrong : tokens.accent;
  const thumbBg = disabled ? tokens.border : isVintage ? tokens.metal : '#fff';
  return (
    <View className="items-center" style={{ width: 40 }}>
      <Text style={{ fontSize: 10, color: tokens.textMute, fontFamily: tokens.fontMono, marginBottom: 4 }}>
        {gain > 0 ? `+${gain}` : gain}
      </Text>
      <View
        className="h-24 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: tokens.surface }}
      >
        {/* Track */}
        <View style={{ position: 'absolute', width: 2, height: 80, backgroundColor: tokens.border, borderRadius: 999 }} />
        {/* Center mark */}
        <View style={{ position: 'absolute', width: 12, height: 1, backgroundColor: tokens.borderStrong, top: '50%' }} />
        {/* Fill bar */}
        <View
          style={{
            position: 'absolute',
            width: 4,
            borderRadius: 999,
            backgroundColor: fillColor,
            height: `${(Math.abs(gain) / 12) * 40}%`,
            bottom: gain >= 0 ? '50%' : undefined,
            top: gain < 0 ? '50%' : undefined,
          }}
        />
        {/* Thumb */}
        <View
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: 999,
            borderWidth: 2,
            backgroundColor: thumbBg,
            borderColor: disabled ? tokens.borderStrong : tokens.accent,
            bottom: `${((gain + 12) / 24) * 100}%`,
            transform: [{ translateY: 6 }],
          }}
        />
      </View>
      <Text style={{ fontSize: 10, color: tokens.textMute, fontWeight: '500', marginTop: 4 }}>{label}</Text>
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
  const tokens = useTokens();
  const isVintage = useIsVintage();
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
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={20} color={tokens.accent} />
            <Text
              style={{
                color: tokens.text,
                fontSize: 16,
                fontWeight: '600',
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                textTransform: isVintage ? 'uppercase' : undefined,
                letterSpacing: isVintage ? 1 : undefined,
              }}
            >
              Audio Settings
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
            hitSlop={8}
            style={{ padding: 8, borderRadius: 999, backgroundColor: tokens.surface }}
          >
            <X size={18} color={tokens.textMute} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: tokens.border }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  setActiveTab(tab.id);
                  hapticLight();
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, minHeight: 48 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <tab.Icon size={14} color={active ? tokens.accent : tokens.textMute} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: active ? tokens.accent : tokens.textMute,
                    }}
                  >
                    {tab.label}
                  </Text>
                  {tab.id === 'timer' && sleepTimerEnd && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: tokens.accent,
                        marginLeft: 2,
                      }}
                    />
                  )}
                </View>
                {active && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      height: 2,
                      width: '50%',
                      borderRadius: 999,
                      backgroundColor: tokens.accent,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>
          {/* ═══ EQ Tab ═══ */}
          {activeTab === 'eq' && (
            <View>
              {/* Toggle + Reset */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      toggleEQ();
                      hapticLight();
                    }}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: eqEnabled }}
                    style={{
                      width: 48,
                      height: 24,
                      borderRadius: 999,
                      justifyContent: 'center',
                      backgroundColor: eqEnabled ? tokens.accent : tokens.borderStrong,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        backgroundColor: '#fff',
                        transform: [{ translateX: eqEnabled ? 26 : 2 }],
                      }}
                    />
                  </TouchableOpacity>
                  <Text style={{ color: tokens.textSoft, fontSize: 14 }}>
                    {eqEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    resetEQ();
                    hapticLight();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: tokens.surface,
                  }}
                >
                  <RotateCcw size={12} color={tokens.textMute} />
                  <Text style={{ color: tokens.textSoft, fontSize: 12 }}>Reset</Text>
                </TouchableOpacity>
              </View>

              {/* Presets */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {EQ_PRESETS.map((preset) => {
                    const active = eqPresetId === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        onPress={() => {
                          setEQPreset(preset.id);
                          hapticLight();
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: active ? tokens.accent : tokens.surface,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: active ? tokens.brandText : tokens.textSoft,
                          }}
                        >
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* EQ Bands */}
              <View style={{ backgroundColor: tokens.card, borderRadius: tokens.radiusLg, padding: 16, borderWidth: 1, borderColor: tokens.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  {eqBands.map((band, i) => (
                    <View key={band.frequency} style={{ alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => handleEQBandChange(i, 'up')}
                        disabled={!eqEnabled}
                        accessibilityLabel={`Boost ${band.label}`}
                        style={{ padding: 4, marginBottom: 4, minHeight: 32, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 16, color: eqEnabled ? tokens.accent : tokens.borderStrong }}>+</Text>
                      </TouchableOpacity>
                      <EQBandControl
                        label={band.label}
                        gain={band.gain}
                        disabled={!eqEnabled}
                        onChange={(g) => setEQBandGain(i, g)}
                        tokens={tokens}
                        isVintage={isVintage}
                      />
                      <TouchableOpacity
                        onPress={() => handleEQBandChange(i, 'down')}
                        disabled={!eqEnabled}
                        accessibilityLabel={`Cut ${band.label}`}
                        style={{ padding: 4, marginTop: 4, minHeight: 32, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 16, color: eqEnabled ? tokens.accent : tokens.borderStrong }}>−</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 9, color: tokens.textMute, fontFamily: tokens.fontMono }}>+12 dB</Text>
                  <Text style={{ fontSize: 9, color: tokens.textMute, fontFamily: tokens.fontMono }}>0 dB</Text>
                  <Text style={{ fontSize: 9, color: tokens.textMute, fontFamily: tokens.fontMono }}>-12 dB</Text>
                </View>
              </View>
            </View>
          )}

          {/* ═══ Speed Tab ═══ */}
          {activeTab === 'speed' && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: '700',
                    color: tokens.text,
                    fontFamily: isVintage ? tokens.fontDisplay : undefined,
                    letterSpacing: isVintage ? 1 : undefined,
                  }}
                >
                  {playbackSpeed}x
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMute, marginTop: 4 }}>
                  Playback Speed
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
                {PLAYBACK_SPEEDS.map((speed) => {
                  const active = playbackSpeed === speed;
                  return (
                    <TouchableOpacity
                      key={speed}
                      onPress={() => {
                        setPlaybackSpeed(speed);
                        hapticLight();
                      }}
                      style={[
                        {
                          width: 64,
                          height: 48,
                          borderRadius: tokens.radiusLg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: active ? tokens.accent : tokens.surface,
                        },
                        active ? { transform: [{ scale: 1.1 }] } : null,
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: active ? tokens.brandText : tokens.textSoft,
                        }}
                      >
                        {speed}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 12, color: tokens.textMute }}>0.5x</Text>
                <View style={{ flex: 1 }}>
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
                <Text style={{ fontSize: 12, color: tokens.textMute }}>2x</Text>
              </View>
            </View>
          )}

          {/* ═══ Timer Tab ═══ */}
          {activeTab === 'timer' && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                {sleepTimerEnd ? (
                  <>
                    <Text
                      style={{
                        fontSize: 48,
                        fontWeight: '700',
                        color: tokens.accent,
                        fontFamily: tokens.fontMono,
                      }}
                    >
                      {formatTimerRemaining()}
                    </Text>
                    <Text style={{ fontSize: 12, color: tokens.textMute, marginTop: 4 }}>remaining</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSleepTimer(null);
                        hapticLight();
                      }}
                      style={{
                        marginTop: 16,
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '500' }}>
                        Cancel Timer
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Clock size={40} color={tokens.textMute} />
                    <Text style={{ fontSize: 14, color: tokens.textMute, marginTop: 12, textAlign: 'center' }}>
                      Set a sleep timer to{'\n'}automatically stop playback
                    </Text>
                  </>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {SLEEP_OPTIONS.map((opt) => {
                  const active =
                    (opt.value === null && !sleepTimerEnd) ||
                    (opt.value !== null && sleepTimer === opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => {
                        setSleepTimer(opt.value);
                        hapticLight();
                      }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: tokens.radiusLg,
                        backgroundColor: active ? tokens.accent : tokens.surface,
                        minHeight: 44,
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: active ? tokens.brandText : tokens.textSoft,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ═══ More Tab ═══ */}
          {activeTab === 'more' && (
            <View>
              {/* Crossfade */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Music2 size={16} color={tokens.textMute} />
                    <Text style={{ color: tokens.text, fontSize: 14, fontWeight: '500' }}>
                      Crossfade
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: tokens.textMute, fontFamily: tokens.fontMono }}>
                    {crossfade === 0 ? 'Off' : `${crossfade}s`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 12, color: tokens.textMute }}>Off</Text>
                  <View style={{ flex: 1 }}>
                    <Slider
                      value={crossfade}
                      max={12}
                      onValueChange={(v) => setCrossfade(Math.round(v))}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: tokens.textMute }}>12s</Text>
                </View>
              </View>

              {/* Current Settings Summary */}
              <View
                style={{
                  backgroundColor: tokens.card,
                  borderRadius: tokens.radiusLg,
                  padding: 16,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: tokens.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: tokens.textMute,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  Current Settings
                </Text>
                <View style={{ gap: 4 }}>
                  {[
                    { label: 'Equalizer', value: eqEnabled ? EQ_PRESETS.find((p) => p.id === eqPresetId)?.name || 'Custom' : 'Off' },
                    { label: 'Speed', value: `${playbackSpeed}x` },
                    { label: 'Sleep Timer', value: sleepTimerEnd ? formatTimerRemaining() : 'Off' },
                    { label: 'Crossfade', value: crossfade === 0 ? 'Off' : `${crossfade}s` },
                  ].map((row) => (
                    <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: tokens.textSoft, fontSize: 14 }}>{row.label}</Text>
                      <Text style={{ color: tokens.text, fontSize: 14, fontWeight: '500' }}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
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
