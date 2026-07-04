import { useState } from 'react';
import { Image, View, Text, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

interface ThumbProps {
  /** Local image module (from lib/images.ts). Falls back to the emoji tile if absent. */
  src?: number;
  emoji: string;
  tint?: string;
  style?: StyleProp<ImageStyle>;
  fontSize?: number;
}

/** Renders a real photo when one exists, otherwise a branded emoji tile. */
export function Thumb({ src, emoji, tint = '#FFF3E0', style, fontSize = 32 }: ThumbProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        source={src}
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
