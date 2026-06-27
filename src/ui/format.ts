/** Formatta un valore in euro in forma compatta (es. 12.500.000 → "€12.5M"). */
export function formatMoney(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`;
  return `€${value}`;
}
