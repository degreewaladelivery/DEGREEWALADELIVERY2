import { useState } from 'react';
import { Image, View, Text, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

interface ThumbProps {

  src?: number | string;
  emoji: string;
  tint?: string;
  style?: StyleProp<ImageStyle>;
  fontSize?: number;
}

export function Thumb({ src, emoji, tint = '#FFF3E0', style, fontSize = 32 }: ThumbProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        source={typeof src === 'string' ? { uri: src } : src}
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
