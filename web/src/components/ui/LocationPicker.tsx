import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, hasMapbox } from '../../lib/mapbox';
import './LocationPicker.css';

const DEFAULT_CENTER: [number, number] = [75.4645, 13.3506];

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN as string;

    const center: [number, number] =
      latitude != null && longitude != null ? [longitude, latitude] : DEFAULT_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: latitude != null ? 15 : 12,
    });
    mapRef.current = map;

    const marker = new mapboxgl.Marker({ draggable: true, color: '#ff6b00' })
      .setLngLat(center)
      .addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLngLat();
      onChangeRef.current(lat, lng);
    });

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    // Mapbox's logo and attribution are links. Keep them on screen for
    // attribution, but swallow the click so picking an address never turns
    // into a trip to mapbox.com. The (i) toggle still expands the credits.
    const container = containerRef.current;
    const blockLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.mapboxgl-ctrl a')) return;
      e.preventDefault();
      e.stopPropagation();
    };
    container.addEventListener('click', blockLinks, true);

    return () => {
      container.removeEventListener('click', blockLinks, true);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (latitude == null || longitude == null || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLngLat([longitude, latitude]);
    mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 });
  }, [latitude, longitude]);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocateError('This browser cannot detect your location.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChangeRef.current(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocating(false);
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser, or pick the spot on the map.'
            : 'Could not get your location. Please pick the spot on the map.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (!hasMapbox()) {
    return (
      <div className="location-picker__fallback">
        Map isn't configured yet — add VITE_MAPBOX_TOKEN to enable location picking.
      </div>
    );
  }

  return (
    <div className="location-picker__wrap">
      <button
        type="button"
        className="location-picker__locate"
        onClick={useCurrentLocation}
        disabled={locating}
      >
        {locating ? 'Finding you…' : '📍 Use my current location'}
      </button>
      {locateError && <p className="location-picker__error">{locateError}</p>}
      <div ref={containerRef} className="location-picker" />
      <p className="location-picker__hint">
        Drag the pin or tap the map to adjust the exact spot.
      </p>
    </div>
  );
}
