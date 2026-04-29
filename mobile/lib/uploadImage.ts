import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { getApi } from '@makeyourmusic/shared';

export interface UploadedAsset {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

/**
 * Lets the user pick an image from their library and uploads it to the
 * backend. Returns the secure URL, or null if they cancel.
 */
export async function pickAndUploadImage(options?: {
  aspect?: [number, number];
  quality?: number;
}): Promise<UploadedAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'We need access to your photos to upload an image.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    // `mediaTypes: ['images']` is the new API (SDK 50+). Older `MediaTypeOptions.Images`
    // is deprecated and will be removed in a future Expo major.
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect,
    quality: options?.quality ?? 0.85,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType || 'image/jpeg',
    name: asset.fileName || `upload-${Date.now()}.jpg`,
  } as any);

  const res = await getApi().post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return {
    url: res.data.url,
    publicId: res.data.publicId,
    width: res.data.width,
    height: res.data.height,
    format: res.data.format,
  };
}

export async function pickAndUploadAudio(): Promise<{ url: string; duration?: number } | null> {
  // Re-exporting so screens have a single import surface
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset) return null;

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType || 'audio/mpeg',
    name: asset.name || `audio-${Date.now()}.mp3`,
  } as any);

  const res = await getApi().post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return { url: res.data.url, duration: res.data.duration };
}
