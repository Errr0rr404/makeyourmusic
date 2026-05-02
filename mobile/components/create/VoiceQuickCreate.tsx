// One-tap voice → song button.
//
// Tap-and-hold to record (up to 30s); on release we POST the audio to
// /api/ai/voice-create which transcribes + generates in one round-trip.
// On success we redirect to the new generation's status page.
//
// Permissions: requires microphone permission (handled inline; we ask
// once on first use).

import { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, View, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, MicOff, Loader2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { hapticSelection } from '../../services/hapticService';

const MAX_RECORDING_SEC = 30;

export function VoiceQuickCreate({ onGenerationStarted }: { onGenerationStarted?: (id: string) => void }) {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      const r = recordingRef.current;
      if (r) {
        r.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    if (hasPermission === true) return true;
    const result = await Audio.requestPermissionsAsync();
    setHasPermission(result.status === 'granted');
    if (result.status !== 'granted') {
      Alert.alert(
        'Microphone needed',
        'Allow microphone access in Settings to use voice mode.',
      );
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    if (state !== 'idle') return;
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setState('recording');
      hapticSelection();

      // Auto-stop at MAX so a stuck press doesn't record forever.
      stopTimerRef.current = setTimeout(() => {
        void stopAndUpload();
      }, MAX_RECORDING_SEC * 1000);
    } catch (err) {
      console.warn('VoiceQuickCreate: failed to start recording', err);
      Alert.alert('Recording failed', 'Could not start recording. Try again.');
      setState('idle');
    }
  };

  const stopAndUpload = async () => {
    if (state !== 'recording') return;
    const r = recordingRef.current;
    if (!r) {
      setState('idle');
      return;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    setState('uploading');
    hapticSelection();
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      recordingRef.current = null;
      if (!uri) {
        setState('idle');
        Alert.alert('Recording failed', 'No audio was captured.');
        return;
      }

      // Resolve mime: Expo records m4a on iOS, 3gp on Android. The backend
      // accepts both via its mimetype allowlist.
      const formData = new FormData();
      // React Native's FormData accepts a { uri, name, type } object for
      // file fields; this is non-standard but expected by axios on RN.
      formData.append('audio', {
        // @ts-expect-error — RN FormData file shape
        uri,
        name: 'voice-create.m4a',
        type: 'audio/m4a',
      });

      const api = getApi();
      const r2 = await api.post('/ai/voice-create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const generationId = r2.data?.generation?.id as string | undefined;
      if (!generationId) {
        Alert.alert('Failed', 'Could not start generation.');
        setState('idle');
        return;
      }
      onGenerationStarted?.(generationId);
      // Route to the studio generations page so user can watch the job.
      router.push('/studio/generations' as never);
      setState('idle');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Voice generate failed';
      Alert.alert('Voice generate failed', msg);
      setState('idle');
    }
  };

  const label =
    state === 'recording' ? 'Release to send'
      : state === 'uploading' ? 'Sending…'
      : 'Hold to speak a song idea';

  return (
    <View>
      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopAndUpload}
        disabled={state === 'uploading'}
        accessibilityRole="button"
        accessibilityLabel="Hold to speak a song idea"
        className={`flex-row items-center justify-center gap-2 h-12 rounded-xl border ${
          state === 'recording'
            ? 'bg-rose-500/20 border-rose-500/50'
            : 'bg-mym-card border-mym-border'
        }`}
      >
        {state === 'uploading' ? (
          <ActivityIndicator size="small" />
        ) : state === 'recording' ? (
          <MicOff size={16} color="#fda4af" />
        ) : (
          <Mic size={16} color="#a78bfa" />
        )}
        <Text className={`text-sm font-semibold ${state === 'recording' ? 'text-rose-200' : 'text-mym-text'}`}>
          {label}
        </Text>
      </TouchableOpacity>
      <Text className="text-mym-muted text-[11px] text-center mt-1">
        Up to 30s — auto-generates a track from what you say
      </Text>
    </View>
  );
}
