import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

interface LyricsProps {
  lyrics?: string | null;
  defaultOpen?: boolean;
}

export function Lyrics({ lyrics, defaultOpen = false }: LyricsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const tokens = useTokens();
  const isVintage = useIsVintage();

  if (!lyrics || !lyrics.trim()) return null;

  const lines = lyrics.split('\n');
  const visibleLines = open ? lines : lines.slice(0, 4);
  const isLong = lines.length > 4;

  return (
    <View
      style={{
        backgroundColor: tokens.card,
        borderRadius: tokens.radiusLg,
        padding: 16,
        borderWidth: 1,
        borderColor: tokens.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BookOpen size={14} color={tokens.accent} />
        <Text
          style={{
            color: tokens.text,
            fontSize: 13,
            fontWeight: '600',
            fontFamily: isVintage ? tokens.fontDisplay : undefined,
            textTransform: isVintage ? 'uppercase' : undefined,
            letterSpacing: isVintage ? 1 : undefined,
          }}
        >
          Lyrics
        </Text>
      </View>

      <View>
        {visibleLines.map((line, i) => {
          const trimmed = line.trim();
          if (/^\[.+\]$/.test(trimmed)) {
            return (
              <Text
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: tokens.accent,
                  marginTop: i === 0 ? 0 : 12,
                  fontFamily: isVintage ? tokens.fontLabel : undefined,
                }}
              >
                {trimmed}
              </Text>
            );
          }
          if (trimmed === '') {
            return <View key={i} style={{ height: 8 }} />;
          }
          return (
            <Text key={i} style={{ fontSize: 14, color: tokens.textSoft, lineHeight: 20 }}>
              {trimmed}
            </Text>
          );
        })}
      </View>

      {isLong && (
        <TouchableOpacity
          onPress={() => setOpen(!open)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Collapse lyrics' : 'Show all lyrics'}
        >
          <Text style={{ color: tokens.accent, fontSize: 12, fontWeight: '600' }}>
            {open ? 'Show less' : `Show all lyrics (${lines.length} lines)`}
          </Text>
          {open ? (
            <ChevronUp size={12} color={tokens.accent} />
          ) : (
            <ChevronDown size={12} color={tokens.accent} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
