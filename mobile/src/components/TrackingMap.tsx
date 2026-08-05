import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import { MAPBOX_TOKEN, hasMapbox } from '../lib/mapbox';
import { colors, spacing, radius, fontSizes } from '../theme';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

const RefWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebViewHandle> }
>;

function buildHtml(token: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet" />
<style>body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; }</style>
</head>
<body>
<div id="map"></div>
<script>
  mapboxgl.accessToken = '${token}';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [75.4645, 13.3506],
    zoom: 12
  });
  var COLORS = { pickup: '#6b7280', delivery: '#ff6b00', agent: '#00897b' };
  var markers = {};
  var ready = false;
  var pending = null;

  window.updateMarkers = function (data) {
    if (!ready) { pending = data; return; }
    var present = [];
    ['pickup', 'delivery', 'agent'].forEach(function (key) {
      var point = data[key];
      if (!point) {
        if (markers[key]) { markers[key].remove(); delete markers[key]; }
        return;
      }
      present.push(point);
      if (markers[key]) {
        markers[key].setLngLat([point.lng, point.lat]);
      } else {
        markers[key] = new mapboxgl.Marker({ color: COLORS[key] })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      }
    });
    if (present.length === 1) {
      map.easeTo({ center: [present[0].lng, present[0].lat], zoom: 15 });
    } else if (present.length > 1) {
      var bounds = new mapboxgl.LngLatBounds();
      present.forEach(function (p) { bounds.extend([p.lng, p.lat]); });
      map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 600 });
    }
  };

  map.on('load', function () {
    ready = true;
    if (pending) { window.updateMarkers(pending); pending = null; }
  });
</script>
</body>
</html>`;
}

export function TrackingMap({
  pickup,
  delivery,
  agent,
}: {
  pickup: MapPoint | null;
  delivery: MapPoint | null;
  agent: MapPoint | null;
}) {
  const webRef = useRef<WebViewHandle>(null);
  const [html] = useState(() => buildHtml(MAPBOX_TOKEN));
  const [loaded, setLoaded] = useState(false);

  const payload = JSON.stringify({
    pickup: pickup ? { lat: pickup.latitude, lng: pickup.longitude } : null,
    delivery: delivery ? { lat: delivery.latitude, lng: delivery.longitude } : null,
    agent: agent ? { lat: agent.latitude, lng: agent.longitude } : null,
  });

  useEffect(() => {
    if (!loaded) return;
    webRef.current?.injectJavaScript(`window.updateMarkers(${payload}); true;`);
  }, [payload, loaded]);

  if (!hasMapbox()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Live map isn't available right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RefWebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onLoadEnd={() => setLoaded(true)}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webview: { flex: 1 },
  fallback: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  fallbackText: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center' },
});
