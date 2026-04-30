import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { usePlayerStore, useAuthStore, getApi, formatDuration } from '@makeyourmusic/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Share2,
  ListMusic,
  SlidersHorizontal,
  Mic2,
} from 'lucide-react-native';
import TrackPlayer from 'react-native-track-player';
import Slider from '../components/ui/Slider';
import { SwipeableDismiss } from '../components/ui/SwipeableDismiss';
import { hapticLight } from '../services/hapticService';
import { createTrackShareLink } from '../lib/linking';
import PlayerSettingsModal from '../components/player/PlayerSettings';
import { Karaoke } from '../components/player/Karaoke';
import { useTokens, useIsVintage } from '../lib/theme';
import { Cassette, Readout, TransportButton } from '../components/vintage';

export default function FullScreenPlayer() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const [showSettings, setShowSettings] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const {
    currentTrack,
    queue,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    progress,
    duration,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    setProgress,
    playbackSpeed,
    eqEnabled,
    sleepTimerEnd,
  } = usePlayerStore();

  // Reset/refresh liked state when the active track changes.
  useEffect(() => {
    setLiked(Boolean((currentTrack as any)?.isLiked));
    if (!currentTrack || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const api = getApi();
        const res = await api.get(`/tracks/${(currentTrack as any).slug || currentTrack.id}`);
        const fresh = res.data.track || res.data;
        if (!cancelled && fresh?.id === currentTrack.id) {
          setLiked(Boolean(fresh.isLiked));
        }
      } catch {
        // best-effort — fall back to whatever the store already had
      }
    })();
    return () => { cancelled = true; };
  }, [currentTrack?.id, isAuthenticated]);

  const handleLike = async () => {
    if (!currentTrack) return;
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Log in to save tracks to your library.');
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic toggle
    setLiked((prev) => !prev);
    hapticLight();
    try {
      const api = getApi();
      const res = await api.post(`/social/likes/${currentTrack.id}`);
      setLiked(Boolean(res.data?.liked));
    } catch {
      // Roll back on failure
      setLiked((prev) => !prev);
      Alert.alert('Like failed', 'Could not update like. Try again.');
    } finally {
      setLikeBusy(false);
    }
  };

  // Sync playback speed to native player
  useEffect(() => {
    try {
      TrackPlayer.setRate(playbackSpeed);
    } catch {
      // player may not be initialized
    }
  }, [playbackSpeed]);

  // Sleep timer tick
  const { sleepTimer, tickSleepTimer } = usePlayerStore();
  useEffect(() => {
    if (!sleepTimerEnd) return;
    const interval = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  // Navigate away in an effect — calling router.back() during render causes
  // "Cannot update a component while rendering" warnings and a navigation
  // race when the modal is dismissed concurrently with other navigation.
  useEffect(() => {
    if (!currentTrack) router.back();
  }, [currentTrack]);

  if (!currentTrack) return null;

  const handleTogglePlay = () => {
    togglePlay();
    hapticLight();
  };

  const handleNext = () => {
    nextTrack();
    hapticLight();
  };

  const handlePrev = () => {
    prevTrack();
    hapticLight();
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      const url = createTrackShareLink(currentTrack.slug);
      // Prefer the vertical preview video when available — Instagram/TikTok
      // pull it as a rich preview, which converts dramatically better than
      // a plain audio link. Fall back to the canonical track URL.
      const shareUrl = currentTrack.previewVideoUrl || url;
      await Share.share({
        message: `Listen to "${currentTrack.title}" by ${currentTrack.agent.name} on MakeYourMusic — ${url}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  };

  const hasActiveSettings = eqEnabled || playbackSpeed !== 1 || sleepTimerEnd !== null;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  const formatTimerRemaining = () => {
    if (!sleepTimerEnd) return null;
    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onAccent = tokens.accent;
  const onMuted = tokens.textMute;
  const onText = tokens.text;
  const tapeProgress = duration > 0 ? progress / duration : 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeableDismiss onDismiss={() => router.back()}>
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ChevronDown size={28} color={onText} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: onMuted,
                  fontSize: 14,
                  fontWeight: '500',
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                  letterSpacing: isVintage ? 1.5 : undefined,
                }}
              >
                Now Playing
              </Text>
              {playbackSpeed !== 1 && (
                <Text style={{ color: onAccent, fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                  {playbackSpeed}× speed
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                style={{ padding: 8 }}
                accessibilityLabel="Audio settings"
                onPress={() => {
                  setShowSettings(true);
                  hapticLight();
                }}
              >
                <SlidersHorizontal size={20} color={hasActiveSettings ? onAccent : onMuted} />
                {hasActiveSettings && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: onAccent,
                    }}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                accessibilityLabel="Queue"
                onPress={() => {
                  const queueNames = queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
                  Alert.alert('Queue', queueNames || 'Queue is empty');
                }}
              >
                <ListMusic size={20} color={onMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cover / Cassette */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {isVintage ? (
              <Cassette
                width={300}
                title={currentTrack.title}
                artist={currentTrack.agent.name}
                coverArt={currentTrack.coverArt}
                spinning={isPlaying}
                progress={tapeProgress}
                side="A"
              />
            ) : (
              <View
                style={{
                  width: 288,
                  height: 288,
                  borderRadius: 24,
                  overflow: 'hidden',
                  backgroundColor: tokens.card,
                  shadowColor: '#000',
                  shadowOpacity: 0.4,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                {currentTrack.coverArt ? (
                  <Image
                    source={{ uri: currentTrack.coverArt }}
                    style={{ width: 288, height: 288 }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                    recyclingKey={currentTrack.id}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
                    <Text style={{ fontSize: 72 }}>🎵</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Track Info */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: onText,
                    fontSize: 22,
                    fontWeight: '700',
                    fontFamily: isVintage ? tokens.fontDisplay : undefined,
                    textTransform: isVintage ? 'uppercase' : undefined,
                    letterSpacing: isVintage ? 1 : undefined,
                  }}
                >
                  {currentTrack.title}
                </Text>
                <TouchableOpacity onPress={() => {
                  router.dismiss();
                  router.push(`/agent/${currentTrack.agent.slug}`);
                }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: onAccent,
                      fontSize: 16,
                      marginTop: 4,
                      fontFamily: isVintage ? tokens.fontLabel : undefined,
                    }}
                  >
                    {currentTrack.agent.name}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={handleLike}
                disabled={likeBusy}
                accessibilityLabel={liked ? 'Unlike track' : 'Like track'}
              >
                <Heart
                  size={22}
                  color={liked ? '#ef4444' : onMuted}
                  fill={liked ? '#ef4444' : 'none'}
                />
              </TouchableOpacity>
            </View>

            {/* Sleep Timer */}
            {sleepTimerEnd && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  backgroundColor: tokens.accentSoft,
                  borderRadius: 999,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: onAccent }} />
                <Text style={{ color: onAccent, fontSize: 11, fontWeight: '500' }}>
                  Sleep in {formatTimerRemaining()}
                </Text>
              </View>
            )}

            {/* Progress + counter */}
            <View style={{ marginTop: 20 }}>
              <Slider value={progress} max={duration || 1} onValueChange={setProgress} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {isVintage ? (
                  <>
                    <Readout size="sm" value={formatDuration(Math.floor(progress))} />
                    <Readout size="sm" value={`-${formatDuration(Math.max(0, Math.floor(duration - progress)))}`} glow="amber" />
                  </>
                ) : (
                  <>
                    <Text style={{ color: onMuted, fontSize: 12 }}>
                      {formatDuration(Math.floor(progress))}
                    </Text>
                    <Text style={{ color: onMuted, fontSize: 12 }}>
                      {formatDuration(Math.floor(duration))}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Controls */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 24,
                paddingHorizontal: 16,
              }}
            >
              <TouchableOpacity onPress={toggleShuffle} style={{ padding: 12 }}>
                <Shuffle size={20} color={shuffle ? onAccent : onMuted} />
              </TouchableOpacity>

              {isVintage ? (
                <>
                  <TransportButton size="sm" onPress={handlePrev} accessibilityLabel="Rewind">
                    <SkipBack size={20} color={onText} fill={onText} />
                  </TransportButton>
                  <TransportButton size="lg" variant="red" onPress={handleTogglePlay} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={28} color="#fff" fill="#fff" /> : <Play size={28} color="#fff" fill="#fff" />}
                  </TransportButton>
                  <TransportButton size="sm" onPress={handleNext} accessibilityLabel="Fast forward">
                    <SkipForward size={20} color={onText} fill={onText} />
                  </TransportButton>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={handlePrev} style={{ padding: 12 }}>
                    <SkipBack size={28} color={onText} fill={onText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleTogglePlay}
                    style={{
                      backgroundColor: tokens.accent,
                      borderRadius: 32,
                      width: 64,
                      height: 64,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isPlaying ? <Pause size={28} color="#fff" fill="#fff" /> : <Play size={28} color="#fff" fill="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNext} style={{ padding: 12 }}>
                    <SkipForward size={28} color={onText} fill={onText} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={toggleRepeat} style={{ padding: 12 }}>
                <RepeatIcon size={20} color={repeat !== 'none' ? onAccent : onMuted} />
              </TouchableOpacity>
            </View>

            {/* Bottom actions */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 24,
                marginBottom: 16,
                gap: 24,
              }}
            >
              <TouchableOpacity style={{ padding: 12 }} onPress={handleShare}>
                <Share2 size={20} color={onMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 12 }}
                onPress={() => {
                  setShowKaraoke(true);
                  hapticLight();
                }}
                accessibilityLabel="Karaoke"
              >
                <Mic2 size={20} color={onMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 12 }}
                onPress={() => {
                  setShowSettings(true);
                  hapticLight();
                }}
              >
                <SlidersHorizontal size={20} color={hasActiveSettings ? onAccent : onMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
      </SwipeableDismiss>

      {/* Settings Modal */}
      <PlayerSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Karaoke Modal */}
      <Karaoke
        visible={showKaraoke}
        onClose={() => setShowKaraoke(false)}
        trackId={currentTrack.id}
        trackTitle={currentTrack.title}
        positionSec={progress}
      />
    </>
  );
}
