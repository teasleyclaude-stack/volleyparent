/**
 * Color contrast utilities for team colors.
 *
 * Team colors are user-picked HEX values that may be too dark (e.g. navy on
 * black background) or too light (white on light surfaces). These helpers
 * compute WCAG contrast ratios and return readable variants for text use,
 * while leaving the original color available for non-text accents (dots,
 * borders, glows).
 */

const BG_DARK = { r: 13, g: 17, b: 23 }; // approximates --background in dark theme
const BG_LIGHT = { r: 255, g: 255, b: 255 };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const num = Number.parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function toHex(r: number, g: number, b: number) {
  const v = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${v(r)}${v(g)}${v(b)}`;
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function mix(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

const MIN_CONTRAST = 4.5;

/**
 * Return a readable text color for the given team color against the current
 * surface (defaults to dark background). If the source color already meets
 * 4.5:1 contrast it is returned unchanged. Otherwise the color is blended
 * toward white (on dark) or black (on light) just enough to clear the bar,
 * preserving hue.
 */
export function readableTextColor(hex: string, onLight = false): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const bg = onLight ? BG_LIGHT : BG_DARK;
  if (contrastRatio(rgb, bg) >= MIN_CONTRAST) return hex;

  const target = onLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  // Step toward target until contrast is acceptable.
  for (let t = 0.1; t <= 1; t += 0.1) {
    const mixed = mix(rgb, target, t);
    if (contrastRatio(mixed, bg) >= MIN_CONTRAST) {
      return toHex(mixed.r, mixed.g, mixed.b);
    }
  }
  return toHex(target.r, target.g, target.b);
}

/** True when the original team color is unsafe for text on the given surface. */
export function needsContrastFix(hex: string, onLight = false): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const bg = onLight ? BG_LIGHT : BG_DARK;
  return contrastRatio(rgb, bg) < MIN_CONTRAST;
}
