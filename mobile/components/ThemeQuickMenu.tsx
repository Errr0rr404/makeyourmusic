import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Disc3, Monitor, Moon, Palette, Radio, Sun } from 'lucide-react-native';
import { useTheme, useTokens } from '../lib/theme';

interface Props {
  /** Override the trigger icon size. Defaults to 20 to match nearby header icons. */
  size?: number;
  /** Override the trigger icon color. Defaults to `tokens.textMute`. */
  color?: string;
}

export function ThemeQuickMenu({ size = 20, color }: Props) {
  const tokens = useTokens();
  const { skin, palette, setSkin, setPalette } = useTheme();
  const [open, setOpen] = useState(false);

  const styles = [
    { id: 'modern' as const, label: 'Modern', sub: 'Electric · Studio', icon: Radio },
    { id: 'vintage' as const, label: 'Vintage', sub: 'Cassette · Hi-Fi', icon: Disc3 },
  ];
  const modes = [
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Theme"
        hitSlop={8}
      >
        <Palette size={size} color={color ?? tokens.textMute} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tokens.card,
              borderTopLeftRadius: tokens.radiusLg,
              borderTopRightRadius: tokens.radiusLg,
              borderColor: tokens.border,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 32,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: tokens.border,
                  marginBottom: 16,
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Palette size={18} color={tokens.text} />
                <Text style={{ color: tokens.text, fontSize: 17, fontWeight: '700' }}>
                  Theme
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: tokens.textMute,
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Style
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {styles.map((opt) => {
                const Icon = opt.icon;
                const active = skin === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSkin(opt.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.border,
                      backgroundColor: active ? tokens.accentSoft : tokens.surface,
                    }}
                  >
                    <Icon size={20} color={active ? tokens.accent : tokens.textMute} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>
                        {opt.label}
                      </Text>
                      <Text style={{ color: tokens.textMute, fontSize: 10 }}>{opt.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={{
                color: tokens.textMute,
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Mode
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {modes.map((opt) => {
                const Icon = opt.icon;
                const active = palette === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPalette(opt.id)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.border,
                      backgroundColor: active ? tokens.accentSoft : tokens.surface,
                    }}
                  >
                    <Icon size={16} color={active ? tokens.accent : tokens.textMute} />
                    <Text
                      style={{
                        color: active ? tokens.accent : tokens.textMute,
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
