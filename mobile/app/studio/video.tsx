import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert,
  Image, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, Sparkles, Film, Lock, Loader2, AlertCircle, CheckCircle2,
  Image as ImageIcon, Download, Wand2, RotateCcw,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { pickAndUploadImage } from '../../lib/uploadImage';
import { Video, ResizeMode } from 'expo-av';

interface VideoGen {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  prompt?: string | null;
  title?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
}

export default function VideoStudioScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [imageRefUrl, setImageRefUrl] = useState('');
  const [gen, setGen] = useState<VideoGen | null>(null);
  const [starting, setStarting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, []);

  // Also stop polling when the user dismisses the modal (screen blur)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (pollTimer.current) {
          clearTimeout(pollTimer.current);
          pollTimer.current = null;
        }
        if (elapsedTimer.current) {
          clearInterval(elapsedTimer.current);
          elapsedTimer.current = null;
        }
      };
    }, [])
  );

  useEffect(() => {
    if (gen?.status === 'PENDING' || gen?.status === 'PROCESSING') {
      elapsedTimer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
    }
    return () => {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, [gen?.status]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Lock size={48} color="#71717a" />
          <Text className="text-morlo-text text-xl font-bold mt-4 mb-2">AI Video Generation</Text>
          <Text className="text-morlo-muted text-sm mb-6">Log in to generate videos</Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  const poll = (id: string) => {
    const tick = async () => {
      try {
        const res = await getApi().get(`/ai/video/${id}`);
        const g: VideoGen = res.data.generation;
        setGen(g);
        if (g.status === 'COMPLETED' || g.status === 'FAILED') return;
      } catch {
        /* transient */
      }
      pollTimer.current = setTimeout(tick, 10000);
    };
    tick();
  };

  const uploadFrame = async () => {
    setUploadingImage(true);
    try {
      const asset = await pickAndUploadImage({ aspect: [16, 9], quality: 0.9 });
      if (asset?.url) setImageRefUrl(asset.url);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleStart = async () => {
    if (!prompt.trim()) {
      Alert.alert('Missing prompt', 'Describe the video you want.');
      return;
    }
    setError('');
    setElapsed(0);
    setStarting(true);
    try {
      const res = await getApi().post('/ai/video', {
        title: title || undefined,
        prompt,
        imageRefUrl: imageRefUrl || undefined,
      });
      const g: VideoGen = res.data.generation;
      setGen(g);
      poll(g.id);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start generation');
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setGen(null);
    setPrompt('');
    setTitle('');
    setImageRefUrl('');
    setError('');
    setElapsed(0);
  };

  return (
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Sparkles size={12} color="#a855f7" />
              <Text className="text-purple-300 text-[10px] font-bold uppercase tracking-wider">AI Video</Text>
            </View>
            <Text className="text-morlo-text text-lg font-bold">Generate a video</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {!gen && (
            <View className="bg-morlo-card border border-morlo-border rounded-xl p-4">
              <Text className="text-morlo-text text-sm font-semibold mb-2">What should the video show?</Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                multiline
                maxLength={2000}
                placeholder="e.g. a neon-lit city street at night, camera slowly tracking forward, cinematic"
                placeholderTextColor="#71717a"
                className="bg-morlo-surface border border-morlo-border rounded-xl px-3 py-2 text-morlo-text text-sm"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
              <Text className="text-morlo-muted text-xs mt-1">{prompt.length}/2000</Text>

              <Text className="text-morlo-text text-sm font-semibold mb-2 mt-4">
                Title <Text className="text-morlo-muted font-normal">(optional)</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={200}
                placeholder="Name your video"
                placeholderTextColor="#71717a"
                className="bg-morlo-surface border border-morlo-border rounded-xl px-3 py-2.5 text-morlo-text text-sm"
              />

              <View className="flex-row items-center gap-1.5 mb-2 mt-4">
                <ImageIcon size={14} color="#a1a1aa" />
                <Text className="text-morlo-text text-sm font-semibold">
                  Starting frame <Text className="text-morlo-muted font-normal">(image-to-video, optional)</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={uploadFrame}
                disabled={uploadingImage}
                className="aspect-video rounded-xl border-2 border-dashed border-morlo-border items-center justify-center overflow-hidden bg-morlo-surface"
              >
                {imageRefUrl ? (
                  <Image source={{ uri: imageRefUrl }} className="w-full h-full" />
                ) : uploadingImage ? (
                  <ActivityIndicator color="#8b5cf6" />
                ) : (
                  <View className="items-center">
                    <ImageIcon size={20} color="#71717a" />
                    <Text className="text-morlo-muted text-xs mt-2">Tap to upload image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {error && (
                <View className="flex-row items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg p-2 mt-3">
                  <AlertCircle size={14} color="#f87171" />
                  <Text className="text-red-400 text-xs flex-1">{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleStart}
                disabled={starting || !prompt.trim()}
                className="flex-row items-center justify-center gap-2 mt-4 px-5 py-3 rounded-xl bg-purple-600"
                style={{ opacity: starting || !prompt.trim() ? 0.5 : 1 }}
              >
                {starting ? <ActivityIndicator size="small" color="#fff" /> : <Wand2 size={14} color="#fff" />}
                <Text className="text-white text-sm font-bold">{starting ? 'Starting…' : 'Generate video'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {gen && gen.status === 'COMPLETED' && gen.videoUrl && (
            <View className="bg-morlo-card border border-morlo-border rounded-xl p-4">
              <View className="flex-row items-start gap-3 mb-4">
                <CheckCircle2 size={20} color="#4ade80" />
                <View className="flex-1">
                  <Text className="text-morlo-text text-lg font-bold">Your video is ready</Text>
                  <Text className="text-morlo-muted text-sm" numberOfLines={2}>{gen.title || gen.prompt}</Text>
                </View>
              </View>
              <Video
                source={{ uri: gen.videoUrl }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12 }}
              />
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => Linking.openURL(gen.videoUrl!)}
                  className="flex-row items-center gap-1 px-4 py-2.5 rounded-lg bg-morlo-surface border border-morlo-border"
                >
                  <Download size={12} color="#a1a1aa" />
                  <Text className="text-morlo-text text-sm font-semibold">Download</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReset}
                  className="flex-row items-center gap-1 px-4 py-2.5 rounded-lg bg-morlo-accent"
                >
                  <Wand2 size={12} color="#fff" />
                  <Text className="text-white text-sm font-semibold">Generate another</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {gen && gen.status === 'FAILED' && (
            <View className="bg-morlo-card border border-red-500/30 rounded-xl p-6 items-center">
              <AlertCircle size={40} color="#f87171" />
              <Text className="text-morlo-text text-lg font-bold mt-3 mb-2">Generation failed</Text>
              <Text className="text-red-400 text-sm text-center mb-4">{gen.errorMessage || 'Unknown error'}</Text>
              <TouchableOpacity
                onPress={handleReset}
                className="flex-row items-center gap-1 px-4 py-2.5 rounded-lg bg-morlo-accent"
              >
                <RotateCcw size={12} color="#fff" />
                <Text className="text-white text-sm font-semibold">Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {gen && (gen.status === 'PENDING' || gen.status === 'PROCESSING') && (
            <View className="bg-morlo-card border border-morlo-border rounded-xl p-8 items-center">
              <View className="w-20 h-20 rounded-full bg-purple-600 items-center justify-center mb-4">
                <Film size={32} color="#fff" />
              </View>
              <Text className="text-morlo-text text-lg font-bold mb-1">
                {gen.status === 'PROCESSING' ? 'Rendering…' : 'Queued…'}
              </Text>
              <Text className="text-morlo-muted text-sm text-center mb-2">
                Video generation takes 2–5 minutes. You can leave this screen.
              </Text>
              <Text className="text-morlo-muted text-xs">
                Elapsed: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
