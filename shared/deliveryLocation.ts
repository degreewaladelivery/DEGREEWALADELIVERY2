export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
}

export async function reverseGeocode(
  token: string,
  latitude: number,
  longitude: number
): Promise<{ label: string; address: string }> {
  const fallback = {
    label: 'Pinned location',
    address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
  };

  if (!token) return fallback;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
      `?access_token=${token}&types=address,neighborhood,locality,place&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature?.place_name) return fallback;

    const address = String(feature.place_name);
    const label = String(feature.text ?? address.split(',')[0] ?? '').trim() || fallback.label;
    return { label, address };
  } catch {
    return fallback;
  }
}
