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

  if (src && !failed) {
    return (
      <Image
        source={typeof src === 'string' ? { uri: sizedImage(src, { width }) } : src}
        style={[styles.img, style]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.img, styles.emojiTile, { backgroundColor: tint }, style]}>
      <Text style={{ fontSize }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    width: '100%',
    height: '100%',
  },
  emojiTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
