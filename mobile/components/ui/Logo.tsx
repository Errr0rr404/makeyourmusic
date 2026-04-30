import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';
import { useIsVintage, useTokens } from '../../lib/theme';

interface LogoProps {
  size?: number;
  /** Renders only the gradient mark + glyph (no rounded square frame). */
  bare?: boolean;
}

export function Logo({ size = 56, bare = false }: LogoProps) {
  const isVintage = useIsVintage();
  const tokens = useTokens();

  if (isVintage) {
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        {!bare && (
          <Rect
            width="512"
            height="512"
            rx="40"
            fill={tokens.bg}
            stroke={tokens.wood}
            strokeWidth="6"
          />
        )}
        <Rect x="60" y="80" width="392" height="14" fill={tokens.brand} />
        <Rect x="60" y="100" width="392" height="120" fill={tokens.paper} />
        <Rect x="80" y="125" width="220" height="10" fill={tokens.text} />
        <Rect x="80" y="150" width="160" height="6" fill={tokens.text} opacity="0.55" />
        <Rect x="350" y="120" width="80" height="80" fill="none" stroke={tokens.text} strokeWidth="3" />
        <Rect x="60" y="240" width="392" height="180" fill="#0a0604" />
        <G transform="translate(150 330)">
          <Circle r="58" fill={tokens.card} />
          <Circle r="22" fill={tokens.bg} />
          <Circle r="6" fill="#0a0604" />
          <Line x1="0" y1="0" x2="0" y2="-15" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
          <Line x1="0" y1="0" x2="13" y2="7" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
          <Line x1="0" y1="0" x2="-13" y2="7" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
        </G>
        <G transform="translate(362 330)">
          <Circle r="58" fill={tokens.card} />
          <Circle r="22" fill={tokens.bg} />
          <Circle r="6" fill="#0a0604" />
          <Line x1="0" y1="0" x2="0" y2="-15" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
          <Line x1="0" y1="0" x2="13" y2="7" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
          <Line x1="0" y1="0" x2="-13" y2="7" stroke={tokens.surface} strokeWidth="6" strokeLinecap="round" />
        </G>
        <Line x1="208" y1="330" x2="304" y2="330" stroke={tokens.card} strokeWidth="3" />
      </Svg>
    );
  }

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
