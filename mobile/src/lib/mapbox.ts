export const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGVncmVld2FsYWRlbGl2ZXJ5IiwiYSI6ImNtcnl2cGs5MjBjc3oyd3M2cDY4eWx2dW0ifQ.PGY6Y1heZ7BhE8nBYfBrhw';

export function hasMapbox(): boolean {
  return Boolean(MAPBOX_TOKEN);
}
