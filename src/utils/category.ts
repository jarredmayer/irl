/**
 * Category color utilities
 */

export function getCategorySwatchColor(category: string): string {
  const map: Record<string, string> = {
    'Music': '#7A2D3A',
    'Nightlife': '#7A2D3A',
    'Outdoors': '#2E6560',
    'Fitness': '#2E6560',
    'Wellness': '#2E6560',
    'Art': '#7A5C72',
    'Arts & Culture': '#7A5C72',
    'Culture': '#7A5C72',
    'Food & Drink': '#9C6B28',
    'Community': '#3D5068',
    'Sports': '#3D5068',
    'Family': '#3D5068',
    'Comedy': '#5C4A7A',
  };
  return map[category] || '#787470';
}
