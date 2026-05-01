import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Image,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Sparkles, Film, Wand2, AlertCircle, Loader2, Image as ImageIcon, X,
} from 'lucide-react-native';
import { getApi } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { pickAndUploadImage } from '../../lib/uploadImage';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';

type VideoStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
interface VideoGen {
  id: string;
  status: VideoStatus;
  prompt?: string | null;
  title?: string | null;
  imageRefUrl?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
}

const RESOLUTIONS = ['720P', '768P', '1080P'] as const;
type Resolution = typeof RESOLUTIONS[number];
const MAX_PROMPT = 1500;

export default function VideoStudioScreen() {
  const router = useRouter();
  // Resolve the api client lazily on each call rather than capturing once on
  // mount — a logout/login between mount and the next request would
  // otherwise be served by a stale auth interceptor.
  const api = () => getApi();

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageRefUrl, setImageRefUrl] = useState('');
  const [resolution, setResolution] = useState<Resolution>('768P');
  const [duration, setDuration] = useState<6 | 10>(6);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gen, setGen] = useState<VideoGen | null>(null);
  const [error, setError] = useState('');
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag observed inside the poll loop. Without this, an in-flight `tick`
  // could resolve after the cleanup ran and schedule a NEW setTimeout that
  // escaped cleanup → memory leak + setState-after-unmount warning.
  const pollStoppedRef = useRef(false);

  useEffect(() => {
    pollStoppedRef.current = false;
    return () => {
      pollStoppedRef.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const startPolling = (id: string) => {
    pollStoppedRef.current = false;
    const tick = async () => {
      if (pollStoppedRef.current) return;
      try {
        const r = await api().get(`/ai/video/${id}`);
        if (pollStoppedRef.current) return;
        const latest: VideoGen = r.data.generation;
        setGen(latest);
        if (latest.status === 'PENDING' || latest.status === 'PROCESSING') {
          if (!pollStoppedRef.current) {
            pollTimer.current = setTimeout(tick, 5000);
          }
        } else if (latest.status === 'COMPLETED') {
          hapticSuccess();
        }
      } catch (err: any) {
        if (pollStoppedRef.current) return;
        setError(err?.response?.data?.error || 'Failed to fetch status');
      }
    };
    pollTimer.current = setTimeout(tick, 3000);
  };

  const onSubmit = async () => {
    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }
    if (prompt.length > MAX_PROMPT) {
      setError(`Prompt must be ${MAX_PROMPT} characters or less`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api().post('/ai/video', {
        title: title.trim() || undefined,
        prompt: prompt.trim(),
        imageRefUrl: imageRefUrl || undefined,
        resolution,
        duration,
      });
      const created: VideoGen = res.data.generation;
      setGen(created);
      hapticSelection();
      startPolling(created.id);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to start video generation';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setGen(null);
    setError('');
  };

  const onPickImage = async () => {
    try {
      setUploadingImage(true);
      const asset = await pickAndUploadImage();
      if (asset?.url) setImageRefUrl(asset.url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Try a different image');
    } finally {
      setUploadingImage(false);
    }
  };

  const isWorking = gen && (gen.status === 'PENDING' || gen.status === 'PROCESSING');
  const isDone = gen && gen.status === 'COMPLETED' && gen.videoUrl;
  const failed = gen && gen.status === 'FAILED';

  return (
    <ScreenContainer scrollable={false}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={20} color="#a1a1aa" />
        </TouchableOpacity>
        <View>
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color="#a855f7" />
            <Text className="text-purple-300 text-[10px] font-bold uppercase tracking-wider">AI Video</Text>
          </View>
          <Text className="text-mym-text text-lg font-bold">Generate a video</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {!gen && (
            <View className="bg-mym-card border border-mym-border rounded-2xl p-4 gap-4">
              <View>
                <Text className="text-white text-sm font-medium mb-2">Title (optional)</Text>
                <TextInput
                  value={title}
                  onChangeText={(v) => setTitle(v.slice(0, 200))}
                  placeholder="e.g. Neon Skyline"
                  placeholderTextColor="#71717a"
                  className="bg-mym-bg border border-mym-border rounded-lg px-3 py-2.5 text-white"
                />
              </View>

              <View>
                <Text className="text-white text-sm font-medium mb-2">
                  Prompt <Text className="text-rose-400">*</Text>
                </Text>
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Describe the scene, lighting, mood, motion…"
                  placeholderTextColor="#71717a"
                  multiline
                  numberOfLines={5}
                  className="bg-mym-bg border border-mym-border rounded-lg px-3 py-2.5 text-white"
                  style={{ minHeight: 110, textAlignVertical: 'top' }}
                />
                <Text className="text-mym-muted text-xs text-right mt-1">
                  {prompt.length}/{MAX_PROMPT}
                </Text>
              </View>

              <View>
                <Text className="text-white text-sm font-medium mb-2">
                  Reference image (optional, used as first frame)
                </Text>
                {imageRefUrl ? (
                  <View className="relative">
                    <Image
                      source={{ uri: imageRefUrl }}
                      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setImageRefUrl('')}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 items-center justify-center"
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={onPickImage}
                    disabled={uploadingImage}
                    className="bg-mym-bg border border-dashed border-mym-border rounded-xl py-8 items-center justify-center"
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color="#a855f7" />
                    ) : (
                      <>
                        <ImageIcon size={24} color="#71717a" />
                        <Text className="text-mym-muted text-sm mt-2">Tap to upload image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium mb-2">Resolution</Text>
                  <View className="flex-row gap-1.5">
                    {RESOLUTIONS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setResolution(r)}
                        className={`flex-1 py-2 rounded-lg ${
                          resolution === r ? 'bg-purple-500' : 'bg-mym-bg border border-mym-border'
                        }`}
                      >
                        <Text
                          className={`text-center text-xs font-bold ${
                            resolution === r ? 'text-white' : 'text-mym-muted'
                          }`}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium mb-2">Duration</Text>
                  <View className="flex-row gap-1.5">
                    {[6, 10].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setDuration(d as 6 | 10)}
                        className={`flex-1 py-2 rounded-lg ${
                          duration === d ? 'bg-purple-500' : 'bg-mym-bg border border-mym-border'
                        }`}
                      >
                        <Text
                          className={`text-center text-xs font-bold ${
                            duration === d ? 'text-white' : 'text-mym-muted'
                          }`}
                        >
                          {d}s
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {error && (
                <View className="flex-row items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <AlertCircle size={16} color="#fda4af" />
                  <Text className="text-rose-300 text-sm flex-1">{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onSubmit}
                disabled={submitting || !prompt.trim()}
                className={`flex-row items-center justify-center gap-2 px-5 py-3 rounded-xl ${
                  submitting || !prompt.trim() ? 'bg-purple-500/40' : 'bg-purple-500'
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Wand2 size={16} color="#fff" />
                )}
                <Text className="text-white font-bold">
                  {submitting ? 'Submitting…' : 'Generate video'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {gen && (
            <View className="bg-mym-card border border-mym-border rounded-2xl p-4 gap-4">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-full bg-purple-500 items-center justify-center">
                  <Film size={24} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold" numberOfLines={1}>
                    {gen.title || 'Untitled video'}
                  </Text>
                  <Text className="text-mym-muted text-xs" numberOfLines={1}>
                    {gen.prompt}
                  </Text>
                </View>
              </View>

              {isWorking && (
                <View className="flex-row items-center gap-3 py-3">
                  <ActivityIndicator color="#a855f7" />
                  <Text className="text-purple-300 text-sm flex-1">
                    Rendering your video… this usually takes 1-3 minutes.
                  </Text>
                </View>
              )}

              {failed && (
                <View className="flex-row items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <AlertCircle size={16} color="#fda4af" />
                  <Text className="text-rose-300 text-sm flex-1">
                    {gen.errorMessage || 'Video generation failed'}
                  </Text>
                </View>
              )}

              {isDone && gen.videoUrl && (
                <Video
                  source={{ uri: gen.videoUrl }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#000' }}
                />
              )}

              <TouchableOpacity
                onPress={reset}
                className="border border-mym-border rounded-xl py-3"
              >
                <Text className="text-white text-center font-medium">Generate another</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
