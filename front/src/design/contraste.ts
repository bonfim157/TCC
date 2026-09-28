/** Razão de contraste WCAG 2.x entre duas cores hexadecimais. */
export function contraste(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = (hex.slice(1).match(/../g) ?? []).map((h) => {
      const v = parseInt(h, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
