import { useColorScheme } from 'react-native';
import { Colors, FontScale, type Palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export function useTheme(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Multiplier from the user's text size setting (Settings → Accessibility). */
export function useFontScale(): number {
  const { user } = useAuth();
  return FontScale[user?.textSize ?? 'default'];
}
