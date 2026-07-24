import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MAPBOX_TOKEN, hasMapbox } from '../lib/mapbox';
import { colors, spacing, radius, fontSizes } from '../theme';

const DEFAULT_LAT = 13.6741;
const DEFAULT_LNG = 75.4736;

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

function buildHtml(token: string, lat: number, lng: number, zoomedIn: boolean): string {
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
    center: [${lng}, ${lat}],
    zoom: ${zoomedIn ? 15 : 12}
  });
  var marker = new mapboxgl.Marker({ draggable: true, color: '#ff6b00' })
    .setLngLat([${lng}, ${lat}])
    .addTo(map);
  function send(lngLat) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lngLat.lat, lng: lngLat.lng }));
  }
  marker.on('dragend', function () { send(marker.getLngLat()); });
  map.on('click', function (e) {
    marker.setLngLat(e.lngLat);
    send(e.lngLat);
  });
</script>
</body>
</html>`;
}

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const [html] = useState(() =>
    buildHtml(MAPBOX_TOKEN, latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LNG, latitude != null)
  );

  if (!hasMapbox()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Map isn't configured yet — add a Mapbox token to enable location picking.
        </Text>
      </View>
    );
  }

  const onMessage = (e: WebViewMessageEvent) => {
    const { lat, lng } = JSON.parse(e.nativeEvent.data) as { lat: number; lng: number };
    onChange(lat, lng);
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
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
