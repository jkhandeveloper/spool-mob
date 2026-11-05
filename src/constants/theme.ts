import '@/global.css';

import { Platform } from 'react-native';

// Monochrome palette matching the concept mockups: black on white, soft greys.
export const Colors = {
  light: {
    text: '#0B0B0C',
    textSecondary: '#5C5F66',
    background: '#FFFFFF',
    surface: '#F4F4F6',
    border: '#D9DADF',
    primary: '#0B0B0C',
    onPrimary: '#FFFFFF',
    danger: '#B42318',
    dangerSurface: '#FDECEA',
    success: '#1F7A3A',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A6A8AE',
    background: '#0B0B0C',
    surface: '#1A1B1E',
    border: '#303238',
    primary: '#F5F5F7',
    onPrimary: '#0B0B0C',
    danger: '#FF7A6E',
    dangerSurface: '#3A1714',
    success: '#5CCB7E',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const FontScale = { default: 1, large: 1.15, 'extra-large': 1.3 } as const;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', sans: 'system-ui' },
  web: { rounded: 'var(--font-rounded)', sans: 'var(--font-display)' },
  default: { rounded: 'normal', sans: 'normal' },
});

export const MaxContentWidth = 640;
