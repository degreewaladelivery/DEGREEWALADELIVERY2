import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, hasMapbox } from '../../lib/mapbox';
import './TrackingMap.css';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

const DEFAULT_CENTER: [number, number] = [75.4736, 13.6741];

const MARKER_COLORS: Record<string, string> = {
  pickup: '#6b7280',
  delivery: '#ff6b00',
  agent: '#00897b',
};

export function TrackingMap({
  pickup,
  delivery,
  agent,
}: {
  pickup: MapPoint | null;
  delivery: MapPoint | null;
  agent: MapPoint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  useEffect(() => {
    if (!hasMapbox() || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN as string;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 12,
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const entries: [string, MapPoint | null][] = [
      ['pickup', pickup],
      ['delivery', delivery],
      ['agent', agent],
    ];

    for (const [key, point] of entries) {
      const existing = markersRef.current[key];
      if (!point) {
        if (existing) {
          existing.remove();
          delete markersRef.current[key];
        }
        continue;
      }
      if (existing) {
        existing.setLngLat([point.longitude, point.latitude]);
      } else {
        markersRef.current[key] = new mapboxgl.Marker({ color: MARKER_COLORS[key] })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
      }
    }

    const present = entries.map(([, point]) => point).filter((p): p is MapPoint => p !== null);
    if (present.length === 1) {
      map.easeTo({ center: [present[0].longitude, present[0].latitude], zoom: 15 });
    } else if (present.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      for (const point of present) bounds.extend([point.longitude, point.latitude]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
    }
  }, [pickup, delivery, agent]);

  if (!hasMapbox()) {
    return <div className="tracking-map__fallback">Live map isn't available right now.</div>;
  }

  return <div ref={containerRef} className="tracking-map" />;
}
