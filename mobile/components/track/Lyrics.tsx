import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';

interface LyricsProps {
  lyrics?: string | null;
  defaultOpen?: boolean;
}

export function Lyrics({ lyrics, defaultOpen = false }: LyricsProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!lyrics || !lyrics.trim()) return null;

  const lines = lyrics.split('\n');
  const visibleLines = open ? lines : lines.slice(0, 4);
  const isLong = lines.length > 4;

  return (
    <View className="bg-morlo-card rounded-xl p-4 border border-morlo-border">
      <View className="flex-row items-center gap-2 mb-3">
        <BookOpen size={14} color="#8b5cf6" />
        <Text className="text-morlo-text text-sm font-semibold">Lyrics</Text>
      </View>

      <View>
        {visibleLines.map((line, i) => {
          const trimmed = line.trim();
          if (/^\[.+\]$/.test(trimmed)) {
            return (
              <Text
                key={i}
                className="text-[10px] font-bold uppercase tracking-widest text-morlo-accent mt-3"
                style={i === 0 ? { marginTop: 0 } : undefined}
              >
                {trimmed}
              </Text>
            );
          }
          if (trimmed === '') {
            return <View key={i} className="h-2" />;
          }
          return (
            <Text key={i} className="text-sm text-morlo-text/80 leading-5">
              {trimmed}
            </Text>
          );
        })}
      </View>

      {isLong && (
        <TouchableOpacity
          onPress={() => setOpen(!open)}
          className="flex-row items-center gap-1 mt-3"
        >
          <Text className="text-morlo-accent text-xs font-semibold">
            {open ? 'Show less' : `Show all lyrics (${lines.length} lines)`}
          </Text>
          {open ? (
            <ChevronUp size={12} color="#8b5cf6" />
          ) : (
            <ChevronDown size={12} color="#8b5cf6" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
