/**
 * Predefined theme presets for the store
 * Each theme includes primary, secondary, and accent colors in HSL format
 */

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string; // HSL format: "h s% l%"
  secondaryColor: string;
  accentColor: string;
  category: 'vibrant' | 'elegant' | 'nature' | 'modern' | 'warm';
}

export const THEME_PRESETS: ThemePreset[] = [
  // Vibrant Themes
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calming blue tones inspired by the sea',
    primaryColor: '200 80% 50%',
    secondaryColor: '195 75% 60%',
    accentColor: '190 70% 95%',
    category: 'vibrant',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and pinks like a beautiful sunset',
    primaryColor: '15 95% 55%',
    secondaryColor: '340 75% 60%',
    accentColor: '20 90% 95%',
    category: 'warm',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Rich green tones for a fresh, natural feel',
    primaryColor: '150 70% 45%',
    secondaryColor: '160 65% 55%',
    accentColor: '150 50% 95%',
    category: 'nature',
  },
  
  // Elegant Themes
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple and indigo for a sophisticated look',
    primaryColor: '260 70% 50%',
    secondaryColor: '250 60% 60%',
    accentColor: '260 40% 95%',
    category: 'elegant',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft pink and rose tones for elegance',
    primaryColor: '340 75% 55%',
    secondaryColor: '330 70% 65%',
    accentColor: '340 50% 96%',
    category: 'elegant',
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Modern gray tones for a professional appearance',
    primaryColor: '220 15% 45%',
    secondaryColor: '210 20% 55%',
    accentColor: '220 10% 96%',
    category: 'modern',
  },
  
  // Nature Themes
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep greens like a peaceful forest',
    primaryColor: '140 60% 40%',
    secondaryColor: '130 55% 50%',
    accentColor: '140 40% 95%',
    category: 'nature',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Gentle purple tones for a calming atmosphere',
    primaryColor: '270 65% 60%',
    secondaryColor: '280 60% 70%',
    accentColor: '270 50% 96%',
    category: 'elegant',
  },
  
  // Modern Themes
  {
    id: 'coral',
    name: 'Coral',
    description: 'Vibrant coral and peach for energy',
    primaryColor: '10 85% 60%',
    secondaryColor: '20 80% 70%',
    accentColor: '15 70% 95%',
    category: 'warm',
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Golden amber tones for warmth and luxury',
    primaryColor: '40 90% 55%',
    secondaryColor: '35 85% 65%',
    accentColor: '40 60% 96%',
    category: 'warm',
  },
];

/**
 * Get theme preset by ID
 */
export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(theme => theme.id === id);
}

/**
 * Get themes by category
 */
export function getThemesByCategory(category: ThemePreset['category']): ThemePreset[] {
  return THEME_PRESETS.filter(theme => theme.category === category);
}

/**
 * Get all categories
 */
export function getThemeCategories(): ThemePreset['category'][] {
  return Array.from(new Set(THEME_PRESETS.map(theme => theme.category)));
}
