export const AXIS_TEXT = '#7b8794';
export const SPLIT_LINE = 'rgba(255,255,255,0.055)';
export const GRID_BORDER = 'rgba(255,255,255,0.09)';

export const BASE_TOOLTIP = {
  backgroundColor: 'rgba(18,22,26,0.96)',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: '#e4e8ec', fontSize: 12 },
  extraCssText:
    'border-radius:10px;backdrop-filter:blur(12px);box-shadow:0 20px 40px -20px rgba(0,0,0,0.9);',
} as const;

export { CATEGORY_COLORS, CATEGORY_LABELS, ALL_CATEGORIES, STACKABLE_CATEGORIES } from './categoryTheme';
