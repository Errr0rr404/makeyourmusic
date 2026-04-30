import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { getApi } from '@makeyourmusic/shared';

interface KaraokeLine {
  text: string;
  startSec: number;
  endSec: number;
  isSection?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
  positionSec: number;
}

const LINE_HEIGHT = 44;

export function Karaoke({ visible, onClose, trackId, trackTitle, positionSec }: Props) {
  const [lines, setLines] = useState<KaraokeLine[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible || !trackId) return;
    let cancelled = false;
    setError('');
    setLoading(true);
    setLines(null);
    (async () => {
      try {
        const api = getApi();
        const r = await api.get(`/tracks/${trackId}/karaoke`);
        if (!cancelled) setLines(r.data.lines || []);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || 'No synced lyrics for this track');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, trackId]);

  const activeIdx = lines
    ? lines.findIndex((l) => positionSec >= l.startSec && positionSec < l.endSec)
    : -1;

  useEffect(() => {
    if (activeIdx < 0 || !scrollRef.current) return;
    const offset = Math.max(0, activeIdx * LINE_HEIGHT - 120);
    scrollRef.current.scrollTo({ y: offset, animated: true });
  }, [activeIdx]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-mym-bg">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-mym-border">
          <View className="flex-1">
            <Text className="text-mym-muted text-[10px] uppercase font-bold tracking-wider">Karaoke</Text>
            <Text className="text-white text-lg font-bold" numberOfLines={1}>
              {trackTitle}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={22} color="#fafafa" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#8b5cf6" />
          </View>
        )}

        {error && !loading && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-mym-muted text-center">{error}</Text>
          </View>
        )}

        {!loading && !error && lines && lines.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-mym-muted text-center">No lyrics available for this track.</Text>
          </View>
        )}

        {!loading && !error && lines && lines.length > 0 && (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
          >
            {lines.map((line, i) => {
              const isActive = i === activeIdx;
              const isPast = i < activeIdx;
              if (line.isSection) {
                return (
                  <Text
                    key={`${i}-${line.startSec}`}
                    className="text-mym-muted text-[11px] uppercase font-bold tracking-wider mt-4 mb-2"
                  >
                    {line.text}
                  </Text>
                );
              }
              return (
                <Text
                  key={`${i}-${line.startSec}`}
                  style={{
                    fontSize: isActive ? 22 : 18,
                    lineHeight: 32,
                    color: isActive ? '#fff' : isPast ? '#52525b' : '#a1a1aa',
                    fontWeight: isActive ? '700' : '500',
                    marginBottom: 8,
                  }}
                >
                  {line.text}
                </Text>
              );
            })}
            <View style={{ height: 200 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
