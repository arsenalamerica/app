import type { Font } from 'opentype.js';

export function fitText(
  font: Font,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize = 24,
): number {
  if (!text) return maxFontSize;
  const w = font.getAdvanceWidth(text, maxFontSize);
  if (w <= maxWidth) return maxFontSize;
  return Math.max(Math.floor((maxFontSize * maxWidth) / w), minFontSize);
}
