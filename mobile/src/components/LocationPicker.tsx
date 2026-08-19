import { useRef, useState, type ComponentType, type Ref } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView, type WebViewProps, type WebViewMessageEvent } from 'react-native-webview';
import { MAPBOX_TOKEN, hasMapbox } from '../lib/mapbox';
import { ensureLocationPermission, ensureLocationServicesOn } from '../lib/locationPermission';
import { getBestPosition, lastLocationError } from '../lib/getPosition';
import { BLOCK_ATTRIBUTION_LINKS_JS, allowMapOnly } from '../lib/mapHtml';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme';

const DEFAULT_LAT = 13.3506;
const DEFAULT_LNG = 75.4645;

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

const RefWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebViewHandle> }
>;

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
    zoom: ${zoomedIn ? 16 : 12}
  });
  var marker = new mapboxgl.Marker({ draggable: true, color: '#ff6b00' })
    .setLngLat([${lng}, ${lat}])
    .addTo(map);

  ${BLOCK_ATTRIBUTION_LINKS_JS}

  function send(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  marker.on('dragend', function () {
    var p = marker.getLngLat();
    send({ type: 'picked', lat: p.lat, lng: p.lng });
  });

  map.on('click', function (e) {
    marker.setLngLat(e.lngLat);
    send({ type: 'picked', lat: e.lngLat.lat, lng: e.lngLat.lng });
  });

  // The app locates the phone natively and tells us where to draw. The page
  // cannot do it itself: this document is inline HTML with no real origin, and
  // Chromium refuses geolocation to an opaque origin however the app is
  // permissioned — which looked exactly like a permission failure.
  window.setPin = function (lat, lng) {
    marker.setLngLat([lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: 16 });
  };
</script>
</body>
</html>`;
}

export function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const webRef = useRef<WebViewHandle>(null);
  const [html] = useState(() =>
    buildHtml(MAPBOX_TOKEN, latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LNG, latitude != null)
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  if (!hasMapbox()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Map isn't configured yet — add a Mapbox token to enable location picking.
        </Text>
      </View>
    );
  }

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type: string;
        lat?: number;
        lng?: number;
      };
      setLocating(false);
      if (payload.type === 'picked' && payload.lat != null && payload.lng != null) {
        setLocateError(null);
        onChange(payload.lat, payload.lng);
      } else if (payload.type === 'error') {
        setLocateError('Could not get your location. Tap the map to pick your spot instead.');
      }
    } catch {
      setLocating(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocateError(null);

    // The map runs in a WebView, and its geolocation request is refused flat
    // when the host app has no permission — so ask for it before asking the
    // page to locate, or the customer sees a failure with no prompt at all.
    const granted = await ensureLocationPermission();
    if (!granted) {
      setLocating(false);
      setLocateError(
        'Location permission is off, so we can\u2019t find you. Allow it in Settings, or tap the map to pick your spot.'
      );
      return;
    }

    // Permission granted is not the same as Location switched on. Ask Android
    // to turn it on here rather than failing and telling them to go digging in
    // Settings.
    await ensureLocationServicesOn();

    const position = await getBestPosition((better) => {
      // A sharper fix arrived after we'd already drawn one — move the pin to it
      // rather than making the customer tap again.
      webRef.current?.injectJavaScript(
        `window.setPin(${better.latitude}, ${better.longitude}); true;`
      );
      onChange(better.latitude, better.longitude);
    });

    setLocating(false);

    if (!position) {
      // Say which of the three things is actually wrong. "Could not find you"
      // leaves a customer with nothing to try.
      const err = lastLocationError();
      const detail =
        err?.code === 1
          ? 'Location permission is off for this app.'
          : err?.code === 2
            ? 'Your phone says location is unavailable — check Location is switched on in your phone settings.'
            : err?.code === 3
              ? 'Timed out looking for you. Try again near a window, or tap the map.'
              : 'Could not find you.';
      setLocateError(`${detail} You can also tap the map to pick your spot.`);
      return;
    }

    setLocateError(null);
    webRef.current?.injectJavaScript(
      `window.setPin(${position.latitude}, ${position.longitude}); true;`
    );
    onChange(position.latitude, position.longitude);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.locateBtn, locating && styles.locateBtnDisabled]}
        activeOpacity={0.9}
        disabled={locating}
        onPress={useCurrentLocation}
      >
        <Text style={styles.locateText}>
          {locating ? 'Finding you…' : '📍 Use my current location'}
        </Text>
      </TouchableOpacity>

      {locateError && <Text style={styles.error}>{locateError}</Text>}

      <View style={styles.container}>
        <RefWebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          geolocationEnabled
          onShouldStartLoadWithRequest={allowMapOnly}
          style={styles.webview}
        />
      </View>

      <Text style={styles.hint}>Drag the pin or tap the map to adjust the exact spot.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  container: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webview: { flex: 1 },

  locateBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fff',
  },
  locateBtnDisabled: { opacity: 0.6 },
  locateText: { color: colors.brand, fontWeight: fontWeights.bold, fontSize: fontSizes.sm },

  hint: { fontSize: fontSizes.xs, color: colors.textMuted },
  error: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    backgroundColor: '#fdecea',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },

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
