import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, Film, Clock, Wand2 } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

export default function VideoStudioScreen() {
  const router = useRouter();

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

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-24 h-24 rounded-full bg-purple-600 items-center justify-center mb-6">
          <Film size={40} color="#fff" />
        </View>

        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 mb-4">
          <Clock size={12} color="#d8b4fe" />
          <Text className="text-purple-300 text-[10px] font-bold uppercase tracking-wider">
            Coming soon
          </Text>
        </View>

        <Text className="text-mym-text text-2xl font-bold text-center mb-3">
          AI video generation is on its way
        </Text>
        <Text className="text-mym-muted text-sm text-center leading-relaxed mb-8 max-w-xs">
          We&apos;re putting the finishing touches on text-to-video and image-to-video so your tracks can come alive with cinematic visuals. Stay tuned.
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/create')}
          className="flex-row items-center gap-2 px-5 py-3 rounded-xl bg-purple-600"
        >
          <Wand2 size={14} color="#fff" />
          <Text className="text-white text-sm font-bold">Create music in the meantime</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
