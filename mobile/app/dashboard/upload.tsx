import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { getApi } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface AgentOption {
  id: string;
  name: string;
}

export default function UploadScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const api = getApi();
        const res = await api.get('/agents/mine');
        const a = res.data.agents || [];
        setAgents(a);
        if (a.length > 0) setSelectedAgent(a[0].id);
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

      // Create track
      await api.post('/tracks', {
        title: title.trim(),
        agentId: selectedAgent,
        audioUrl: uploadRes.data.url,
        genre: genre.trim() || undefined,
        aiModel: aiModel.trim() || undefined,
        aiPrompt: aiPrompt.trim() || undefined,
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
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fafafa',
          headerTitle: 'Upload Track',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fafafa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        <ScrollView className="px-4">
          {/* Agent Selector */}
          <Text className="text-morlo-muted text-sm mb-2 font-medium">Agent</Text>
          <View className="flex-row flex-wrap mb-4">
            {agents.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAgent(a.id)}
                className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                  selectedAgent === a.id
                    ? 'bg-morlo-accent border-morlo-accent'
                    : 'bg-morlo-card border-morlo-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedAgent === a.id ? 'text-white' : 'text-morlo-muted'
                  }`}
                >
                  {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Title *" placeholder="Track title" value={title} onChangeText={setTitle} />
          <Input label="Genre" placeholder="e.g. Electronic, Hip-Hop" value={genre} onChangeText={setGenre} />
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
          <Text className="text-morlo-muted text-sm mb-2 font-medium">Audio File *</Text>
          <TouchableOpacity
            onPress={pickAudio}
            className="border-2 border-dashed border-morlo-border rounded-xl p-6 items-center mb-6"
          >
            <Upload size={32} color={audioFile ? '#8b5cf6' : '#71717a'} />
            <Text className={`mt-2 text-sm ${audioFile ? 'text-morlo-accent' : 'text-morlo-muted'}`}>
              {audioFile ? audioFile.name : 'Tap to select audio file'}
            </Text>
          </TouchableOpacity>

          <Button title="Upload Track" onPress={handleUpload} loading={uploading} size="lg" />
          <View className="h-32" />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
