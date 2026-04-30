import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTokens } from '../../lib/theme';
import { ArrowLeft, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface AgentOption {
  id: string;
  name: string;
}

interface GenreOption {
  id: string;
  name: string;
}

export default function UploadScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const api = getApi();
        const [agentsRes, genresRes] = await Promise.all([
          api.get('/agents/mine'),
          api.get('/genres'),
        ]);
        const a = agentsRes.data.agents || [];
        setAgents(a);
        if (a.length > 0) setSelectedAgent(a[0].id);
        setGenres(genresRes.data.genres || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setAudioFile(result.assets[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !selectedAgent || !audioFile) {
      Alert.alert('Missing Info', 'Please fill in the title, select an agent, and pick an audio file.');
      return;
    }

    setUploading(true);
    try {
      const api = getApi();

      // Upload audio file first
      const formData = new FormData();
      formData.append('file', {
        uri: audioFile.uri,
        type: audioFile.mimeType || 'audio/mpeg',
        name: audioFile.name || 'track.mp3',
      } as any);
      formData.append('type', 'audio');

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Create track (use duration from Cloudinary response, fall back to 120s)
      await api.post('/tracks', {
        title: title.trim(),
        agentId: selectedAgent,
        audioUrl: uploadRes.data.url,
        duration: Math.round(uploadRes.data.duration || 120),
        genreId: selectedGenreId || undefined,
        aiModel: aiModel.trim() || undefined,
        aiPrompt: aiPrompt.trim() || undefined,
        isPublic,
      });

      Alert.alert('Success', 'Track uploaded successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerTitle: 'Upload Track',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2" accessibilityLabel="Go back" accessibilityRole="button">
              <ArrowLeft size={24} color={tokens.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        <ScrollView className="px-4">
          {/* Agent Selector */}
          <Text className="text-mym-muted text-sm mb-2 font-medium">Agent</Text>
          <View className="flex-row flex-wrap mb-4">
            {agents.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAgent(a.id)}
                className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                  selectedAgent === a.id
                    ? 'bg-mym-accent border-mym-accent'
                    : 'bg-mym-card border-mym-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedAgent === a.id ? 'text-white' : 'text-mym-muted'
                  }`}
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Title *" placeholder="Track title" value={title} onChangeText={setTitle} />

          {/* Genre selector */}
          <Text className="text-mym-muted text-sm mb-2 font-medium">Genre</Text>
          <View className="flex-row flex-wrap mb-4">
            <TouchableOpacity
              onPress={() => setSelectedGenreId('')}
              className={`mr-2 mb-2 px-4 py-2 rounded-full border ${!selectedGenreId ? 'bg-mym-accent border-mym-accent' : 'bg-mym-card border-mym-border'}`}
            >
              <Text className={`text-sm font-medium ${!selectedGenreId ? 'text-white' : 'text-mym-muted'}`}>None</Text>
            </TouchableOpacity>
            {genres.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setSelectedGenreId(g.id)}
                className={`mr-2 mb-2 px-4 py-2 rounded-full border ${selectedGenreId === g.id ? 'bg-mym-accent border-mym-accent' : 'bg-mym-card border-mym-border'}`}
              >
                <Text className={`text-sm font-medium ${selectedGenreId === g.id ? 'text-white' : 'text-mym-muted'}`}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="AI Model" placeholder="e.g. Suno v3, Udio" value={aiModel} onChangeText={setAiModel} />
          <Input
            label="AI Prompt"
            placeholder="The prompt used to generate this track"
            value={aiPrompt}
            onChangeText={setAiPrompt}
            multiline
            numberOfLines={3}
          />

          {/* Audio file picker */}
          <Text className="text-mym-muted text-sm mb-2 font-medium">Audio File *</Text>
          <TouchableOpacity
            onPress={pickAudio}
            className="border-2 border-dashed border-mym-border rounded-xl p-6 items-center mb-6"
          >
            <Upload size={32} color={audioFile ? '#8b5cf6' : '#71717a'} />
            <Text className={`mt-2 text-sm ${audioFile ? 'text-mym-accent' : 'text-mym-muted'}`}>
              {audioFile ? audioFile.name : 'Tap to select audio file'}
            </Text>
          </TouchableOpacity>

          {/* Visibility */}
          <Text className="text-mym-muted text-sm mb-2 font-medium">Visibility</Text>
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={() => setIsPublic(true)}
              className={`flex-1 p-3 rounded-xl border ${isPublic ? 'bg-mym-accent/10 border-mym-accent' : 'bg-mym-card border-mym-border'}`}
            >
              <Text className={`text-sm font-semibold ${isPublic ? 'text-mym-accent' : 'text-mym-text'}`}>
                🌍 Public
              </Text>
              <Text className="text-mym-muted text-xs mt-0.5">Anyone can listen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPublic(false)}
              className={`flex-1 p-3 rounded-xl border ${!isPublic ? 'bg-mym-accent/10 border-mym-accent' : 'bg-mym-card border-mym-border'}`}
            >
              <Text className={`text-sm font-semibold ${!isPublic ? 'text-mym-accent' : 'text-mym-text'}`}>
                🔒 Private
              </Text>
              <Text className="text-mym-muted text-xs mt-0.5">Only you</Text>
            </TouchableOpacity>
          </View>

          <Button title="Upload Track" onPress={handleUpload} loading={uploading} size="lg" />
          <View className="h-32" />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
