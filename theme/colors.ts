export const colors = {
  bg: '#0B0B0E',
  surface: '#15151B',
  surfaceAlt: '#1E1E26',
  border: '#2A2A33',
  accent: '#D4A857',
  text: '#F5F3EE',
  textMuted: '#9B9AA3',
  hotel: '#D4A857',
  restaurant: '#C77B5E',
  activity: '#6E9C8A',
} as const;

export type PlaceCategory = 'hotel' | 'restaurant' | 'activity';

export function colorForCategory(category: PlaceCategory): string {
  return colors[category];
}
