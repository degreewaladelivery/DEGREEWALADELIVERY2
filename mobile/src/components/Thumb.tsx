import { useState } from 'react';
import { Image, View, Text, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { sizedImage } from '@shared/imageUrl';

interface ThumbProps {

  src?: number | string;
  emoji: string;
  tint?: string;
  style?: StyleProp<ImageStyle>;
  fontSize?: number;
  /** Pixel width to fetch at. Catalogue photos average ~700 KB at full size,
   *  which is absurd for a thumbnail; this asks Supabase to resize first. */
  width?: number;
}

export function Thumb({
  src,
  emoji,
  tint = '#FFF3E0',
  style,
  fontSize = 32,
  width = 240,
}: ThumbProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (src && !failed) {
    return (
      // A tinted tile sits behind the photo so a loading row has shape instead
      // of a blank gap — the list reads as complete while pictures arrive.
      <View style={[styles.img, styles.placeholder, { backgroundColor: tint }, style]}>
        <Image
          source={typeof src === 'string' ? { uri: sizedImage(src, { width }) } : src}
          style={[styles.fill, loaded ? styles.shown : styles.hidden]}
          resizeMode="cover"
          onLoadEnd={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.img, styles.emojiTile, { backgroundColor: tint }, style]}>
      <Text style={{ fontSize }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  // Fading in rather than snapping avoids the flicker of a half-decoded image.
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
  img: {
    width: '100%',
    height: '100%',
  },
  emojiTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
