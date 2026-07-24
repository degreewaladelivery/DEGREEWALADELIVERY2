export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export function hasMapbox(): boolean {
  return Boolean(MAPBOX_TOKEN);
}
