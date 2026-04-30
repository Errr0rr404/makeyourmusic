import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTokens, useIsVintage } from '../../lib/theme';
import { ArrowLeft, Upload, Globe, LockKeyhole } from 'lucide-react-native';
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
  const isVintage = useIsVintage();
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
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={tokens.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        <ScrollView style={{ paddingHorizontal: 16 }}>
          {/* Agent Selector */}
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Agent</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 }}>
            {agents.map((a) => {
              const active = selectedAgent === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setSelectedAgent(a.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: active ? tokens.brand : tokens.card,
                    borderColor: active ? tokens.brand : tokens.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: active ? tokens.brandText : tokens.textMute,
                    }}
                  >
                    {a.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input label="Title *" placeholder="Track title" value={title} onChangeText={setTitle} />

          {/* Genre selector */}
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Genre</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 }}>
            {[{ id: '', name: 'None' }, ...genres].map((g) => {
              const active = selectedGenreId === g.id;
              return (
                <TouchableOpacity
                  key={g.id || 'none'}
                  onPress={() => setSelectedGenreId(g.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: active ? tokens.brand : tokens.card,
                    borderColor: active ? tokens.brand : tokens.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: active ? tokens.brandText : tokens.textMute,
                    }}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Audio File *</Text>
          <TouchableOpacity
            onPress={pickAudio}
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: audioFile ? tokens.accent : tokens.border,
              borderRadius: tokens.radiusLg,
              padding: 24,
              alignItems: 'center',
              marginBottom: 24,
              backgroundColor: tokens.card,
            }}
            accessibilityRole="button"
            accessibilityLabel="Select audio file"
          >
            <Upload size={32} color={audioFile ? tokens.accent : tokens.textMute} />
            <Text
              style={{
                marginTop: 8,
                fontSize: 13,
                color: audioFile ? tokens.accent : tokens.textMute,
                fontWeight: audioFile ? '600' : '500',
              }}
              numberOfLines={1}
            >
              {audioFile ? audioFile.name : 'Tap to select audio file'}
            </Text>
          </TouchableOpacity>

          {/* Visibility */}
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 8, fontWeight: '500' }}>Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setIsPublic(true)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: tokens.radiusLg,
                borderWidth: 1,
                backgroundColor: isPublic ? tokens.accentSoft : tokens.card,
                borderColor: isPublic ? tokens.accent : tokens.border,
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPublic }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Globe size={14} color={isPublic ? tokens.accent : tokens.textMute} />
                <Text style={{ color: isPublic ? tokens.accent : tokens.text, fontSize: 13, fontWeight: '600' }}>
                  Public
                </Text>
              </View>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 4 }}>Anyone can listen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPublic(false)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: tokens.radiusLg,
                borderWidth: 1,
                backgroundColor: !isPublic ? tokens.accentSoft : tokens.card,
                borderColor: !isPublic ? tokens.accent : tokens.border,
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: !isPublic }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LockKeyhole size={14} color={!isPublic ? tokens.accent : tokens.textMute} />
                <Text style={{ color: !isPublic ? tokens.accent : tokens.text, fontSize: 13, fontWeight: '600' }}>
                  Private
                </Text>
              </View>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 4 }}>Only you</Text>
            </TouchableOpacity>
          </View>

          <Button title="Upload Track" onPress={handleUpload} loading={uploading} size="lg" />
          <View style={{ height: 128 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
