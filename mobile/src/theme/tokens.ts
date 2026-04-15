export const colors = {
  page: '#fffdfa',
  surface: '#ffffff',
  surfaceMuted: '#f6f7f3',
  surfaceTint: '#eef8f7',
  border: '#d6d7d2',
  borderSoft: '#e8e8e0',
  text: '#0f172a',
  textMuted: '#64748b',
  textSoft: '#94a3b8',
  primary: '#36b5ac',
  primaryDark: '#2b938c',
  secondary: '#355d74',
  accent: '#f6b93f',
  olive: '#c7d579',
  danger: '#d96543',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1f2937',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
} as const;
