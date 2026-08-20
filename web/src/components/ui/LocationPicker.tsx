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
  /**
   * Shows a "paste coordinates" field alongside the map. Off by default —
   * customers picking a delivery address have no reason to paste raw
   * lat/lng. Admins setting a shop or the default pickup point often do:
   * dragging a pin by hand can't reliably hit 6 decimals of precision, and
   * the coordinates are usually sitting right there in a Google Maps link
   * or its search bar already.
   */
  allowManualEntry?: boolean;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  allowManualEntry = false,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

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

    return () => {
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

  const applyPasted = () => {
    // Accepts exactly what you'd copy out of Google Maps: "13.351447,
    // 75.466142", with or without the space, in either lat,lng order Google
    // itself uses.
    const match = pasted.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) {
      setPasteError('Paste as two numbers separated by a comma, e.g. 13.351447, 75.466142');
      return;
    }
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setPasteError('That doesn\u2019t look like a latitude, longitude pair.');
      return;
    }
    setPasteError(null);
    onChangeRef.current(lat, lng);
  };

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
      {allowManualEntry && (
        <div className="location-picker__paste">
          <input
            type="text"
            className="location-picker__paste-input"
            placeholder="Paste coordinates, e.g. 13.351447, 75.466142"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyPasted();
              }
            }}
          />
          <button type="button" className="location-picker__paste-go" onClick={applyPasted}>
            Go
          </button>
        </div>
      )}
      {pasteError && <p className="location-picker__error">{pasteError}</p>}
      <div ref={containerRef} className="location-picker" />
      <p className="location-picker__hint">
        Drag the pin or tap the map to adjust the exact spot.
      </p>
    </div>
  );
}
