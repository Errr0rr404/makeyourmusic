import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { getApi } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';

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
  const tokens = useTokens();
  const isVintage = useIsVintage();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: tokens.textMute,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontFamily: isVintage ? tokens.fontLabel : undefined,
              }}
            >
              Karaoke
            </Text>
            <Text
              style={{
                color: tokens.text,
                fontSize: 17,
                fontWeight: '700',
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
              }}
              numberOfLines={1}
            >
              {trackTitle}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close karaoke"
          >
            <X size={22} color={tokens.text} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={tokens.brand} />
          </View>
        )}

        {error && !loading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: tokens.textMute, textAlign: 'center', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {!loading && !error && lines && lines.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Text style={{ color: tokens.textMute, textAlign: 'center', fontSize: 14 }}>
              No lyrics available for this track.
            </Text>
          </View>
        )}

        {!loading && !error && lines && lines.length > 0 && (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
          >
            {lines.map((line, i) => {
              const isActive = i === activeIdx;
              const isPast = i < activeIdx;
              if (line.isSection) {
                return (
                  <Text
                    key={`${i}-${line.startSec}`}
                    style={{
                      color: tokens.accent,
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      marginTop: 16,
                      marginBottom: 8,
                      fontFamily: isVintage ? tokens.fontLabel : undefined,
                    }}
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
                    color: isActive ? tokens.text : isPast ? tokens.borderStrong : tokens.textMute,
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
      </SafeAreaView>
    </Modal>
  );
}
