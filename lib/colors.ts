export const DAY_COLORS = [
  "#1D4ED8", // blue
  "#B91C1C", // red
  "#047857", // green
  "#A16207", // ochre
  "#6D28D9", // violet
];

export function dayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
}