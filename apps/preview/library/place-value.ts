export const placeUnits = [
  "个",
  "十",
  "百",
  "千",
  "万",
  "十万",
  "百万",
  "千万",
  "亿",
] as const;
export function placeValueColumns(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999999999)
    throw Error("PLACE_VALUE_DOMAIN");
  return Array.from({ length: Math.max(3, String(value).length) }, (_, i) => {
    const power = Math.max(3, String(value).length) - i - 1,
      unit = 10 ** power;
    return {
      power,
      name: placeUnits[power],
      digit: Math.floor(value / unit) % 10,
      unit,
    };
  });
}
export function changeTens(value: number, delta: number) {
  placeValueColumns(value);
  if (delta !== 1 && delta !== -1) throw Error("TEN_STEP_REQUIRED");
  return Math.min(999999999, Math.max(0, value + delta * 10));
}
