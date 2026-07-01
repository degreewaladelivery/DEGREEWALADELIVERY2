import { useState } from 'react';
import { EmojiThumb } from './EmojiThumb';
import './Thumb.css';

interface ThumbProps {
  /** Image URL (from lib/images). If absent/broken, we show the emoji tile. */
  src?: string;
  emoji: string;
  tint?: string;
  color?: string;
  alt?: string;
  fontSize?: number;
}

/**
 * Renders a real photo when one exists, otherwise the branded emoji tile.
 * Also falls back if the image URL is set but fails to load (onError).
 */
export function Thumb({ src, emoji, tint, color, alt = '', fontSize }: ThumbProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        className="thumb-img"
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return <EmojiThumb emoji={emoji} tint={tint} color={color} fontSize={fontSize} />;
}
