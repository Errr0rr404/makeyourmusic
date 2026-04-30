import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTokens } from '../../lib/theme';

interface CassetteProps {
  coverArt?: string | null;
  title?: string;
  artist?: string;
  side?: 'A' | 'B';
  spinning?: boolean;
  progress?: number; // 0..1
  width?: number;
  grade?: 'ferric' | 'chrome' | 'metal';
}

/** Cassette tape illustration with optional cover art and rotating reels. */
export function Cassette({
  coverArt,
  title,
  artist,
  side = 'A',
  spinning = false,
  progress = 0.5,
  width = 240,
  grade = 'ferric',
}: CassetteProps) {
  const tokens = useTokens();
  const height = Math.round(width / 1.6);
  const minR = 0.45;
  const maxR = 0.95;
  const leftR = maxR - (maxR - minR) * progress;
  const rightR = minR + (maxR - minR) * progress;

  const stripeColor =
    grade === 'chrome' ? '#ffd95a' : grade === 'metal' ? '#c8c4b8' : '#c5b692';
  const stripeBg =
    grade === 'chrome' ? '#1c3a8c' : grade === 'metal' ? '#1a1a1a' : '#a89968';

  return (
    <View style={{ width, height }}>
      {/* Cassette body */}
      <View
        style={{
          ...absoluteFill(),
          backgroundColor: '#1a120a',
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#050200',
        }}
      />
      {/* Stripe */}
      <View
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          top: '6%',
          height: 4,
          backgroundColor: stripeBg,
          borderTopWidth: 2,
          borderTopColor: stripeColor,
        }}
      />
      {/* Paper label */}
      <View
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          top: '7%',
          height: '34%',
          backgroundColor: '#fbf3df',
          paddingHorizontal: 8,
          paddingVertical: 6,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text
            numberOfLines={1}
            style={{
              color: '#2b1d10',
              fontFamily: tokens.fontLabel,
              fontWeight: '700',
              fontSize: Math.max(11, width * 0.05),
            }}
          >
            {title ?? 'Untitled Tape'}
          </Text>
          {artist && (
            <Text
              numberOfLines={1}
              style={{
                color: '#5a4126',
                fontFamily: tokens.fontLabel,
                fontSize: Math.max(9, width * 0.04),
                marginTop: 2,
              }}
            >
              {artist}
            </Text>
          )}
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderWidth: 1,
            borderColor: '#2b1d10',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#2b1d10', fontWeight: '700', fontSize: 12 }}>{side}</Text>
        </View>
      </View>
      {/* Cover art chip */}
      {coverArt && (
        <View
          style={{
            position: 'absolute',
            right: '8%',
            top: '8%',
            width: '20%',
            height: '24%',
            borderWidth: 1,
            borderColor: '#2b1d10',
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: coverArt }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      )}
      {/* Reel window */}
      <View
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          bottom: '8%',
          height: '46%',
          backgroundColor: '#0a0604',
          borderRadius: 2,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 12,
        }}
      >
        <SpinningReel size={width * 0.16} radiusFrac={leftR} spinning={spinning} />
        <View
          style={{
            position: 'absolute',
            left: '20%',
            right: '20%',
            top: '50%',
            height: 2,
            backgroundColor: '#3a2a1a',
            transform: [{ translateY: -1 }],
          }}
        />
        <SpinningReel size={width * 0.16} radiusFrac={rightR} spinning={spinning} />
      </View>
    </View>
  );
}

function SpinningReel({ size, radiusFrac, spinning }: { size: number; radiusFrac: number; spinning: boolean }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (spinning) {
      animRef.current = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      animRef.current = null;
    }
    return () => {
      animRef.current?.stop();
    };
  }, [spinning, rotate]);

  const tapeR = (size / 2) * radiusFrac;
  const interp = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Tape (the wound spool) */}
      <View
        style={{
          position: 'absolute',
          width: tapeR * 2,
          height: tapeR * 2,
          borderRadius: tapeR,
          backgroundColor: '#3a2a1a',
        }}
      />
      <Animated.View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size * 0.18,
          backgroundColor: '#1a120a',
          borderWidth: 1,
          borderColor: '#2a1f12',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: interp }],
        }}
      >
        {/* Three spoke arms */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 2,
              height: size * 0.18,
              backgroundColor: '#2a1f12',
              top: 0,
              transform: [{ rotate: `${i * 120}deg` }],
            }}
          />
        ))}
        <View
          style={{
            width: size * 0.10,
            height: size * 0.10,
            borderRadius: size * 0.05,
            backgroundColor: '#0a0604',
          }}
        />
      </Animated.View>
    </View>
  );
}

function absoluteFill() {
  return { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
}
