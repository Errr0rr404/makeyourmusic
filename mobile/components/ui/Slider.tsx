import { useRef, useState } from 'react';
import { View, PanResponder, LayoutChangeEvent } from 'react-native';

interface SliderProps {
  value: number;
  max: number;
  onValueChange: (value: number) => void;
}

export default function Slider({ value, max, onValueChange }: SliderProps) {
  const [width, setWidth] = useState(0);
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

  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <View
      onLayout={onLayout}
      className="h-6 justify-center"
      {...panResponder.panHandlers}
    >
      <View className="h-1 bg-morlo-border rounded-full overflow-hidden">
        <View
          className="h-full bg-morlo-accent rounded-full"
          style={{ width: `${percent}%` }}
        />
      </View>
      {/* Thumb */}
      <View
        className="absolute w-4 h-4 bg-morlo-accent rounded-full -mt-1.5"
        style={{ left: `${Math.min(percent, 100)}%`, marginLeft: -8 }}
      />
    </View>
  );
}
