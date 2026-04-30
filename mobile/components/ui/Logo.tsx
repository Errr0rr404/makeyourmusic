import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** Renders only the gradient mark + glyph (no rounded square frame). */
  bare?: boolean;
}

export function Logo({ size = 56, bare = false }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="logoGrad" x1="76" y1="77" x2="443" y2="434" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#8B5CF6" />
          <Stop offset="0.52" stopColor="#D946EF" />
          <Stop offset="1" stopColor="#EC4899" />
        </LinearGradient>
      </Defs>
      {!bare && <Rect width="512" height="512" rx="112" fill="#0A0A0D" />}
      <Rect
        x={bare ? '0' : '44'}
        y={bare ? '0' : '44'}
        width={bare ? '512' : '424'}
        height={bare ? '512' : '424'}
        rx={bare ? '112' : '96'}
        fill="url(#logoGrad)"
      />
      <Path
        d={
          bare
            ? 'M120 334V180L204 302L256 220L308 302L392 180V334'
            : 'M120 334V180L204 302L256 220L308 302L392 180V334'
        }
        stroke="white"
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M156 354H356"
        stroke="white"
        strokeOpacity="0.34"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <Circle cx="389" cy="139" r="24" fill="#2DD4BF" />
      <Circle cx="389" cy="139" r="10" fill="white" fillOpacity="0.72" />
    </Svg>
  );
}
