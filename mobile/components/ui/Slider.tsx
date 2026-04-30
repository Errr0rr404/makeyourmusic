import { useRef, useState } from 'react';
import { View, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

interface SliderProps {
  value: number;
  max: number;
  onValueChange: (value: number) => void;
}

export default function Slider({ value, max, onValueChange }: SliderProps) {
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const [, setWidth] = useState(0);
  const widthRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newVal = Math.max(0, Math.min(max, (x / widthRef.current) * max));
        onValueChange(newVal);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newVal = Math.max(0, Math.min(max, (x / widthRef.current) * max));
        onValueChange(newVal);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    widthRef.current = w;
  };

  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  if (isVintage) {
    // Tape-transport position indicator: a recessed rail filled with the LED
    // amber dial color, with a brushed-metal cap as the thumb. The squared
    // corners and inset shadow read as physical hardware, not a UI affordance.
    const railHeight = 8;
    const thumbWidth = 14;
    const thumbHeight = 22;
    return (
      <View
        onLayout={onLayout}
        style={{ height: 32, justifyContent: 'center' }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            height: railHeight,
            backgroundColor: tokens.metalShadow,
            borderRadius: 1,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#0a0604',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: tokens.ledAmber,
              opacity: 0.92,
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            width: thumbWidth,
            height: thumbHeight,
            left: `${percent}%`,
            marginLeft: -thumbWidth / 2,
            backgroundColor: tokens.metal,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: tokens.metalShadow,
            shadowColor: '#000',
            shadowOpacity: 0.55,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 4,
          }}
        />
      </View>
    );
  }

  return (
    <View
      onLayout={onLayout}
      style={{ height: 24, justifyContent: 'center' }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: 4,
          backgroundColor: tokens.border,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: tokens.brand,
            borderRadius: 999,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: 16,
          height: 16,
          left: `${percent}%`,
          marginLeft: -8,
          backgroundColor: tokens.brand,
          borderRadius: 8,
          shadowColor: tokens.brand,
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }}
      />
    </View>
  );
}
