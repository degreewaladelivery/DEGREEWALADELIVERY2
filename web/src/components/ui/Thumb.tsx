import { useState } from 'react';
import { EmojiThumb } from './EmojiThumb';
import { sizedImage } from '@shared/imageUrl';
import './Thumb.css';

interface ThumbProps {

  src?: string;
  emoji: string;
  tint?: string;
  color?: string;
  alt?: string;
  fontSize?: number;
  /** Pixel width to fetch at, so a 40px thumbnail doesn't pull a 5 MB photo. */
  width?: number;
}

export function Thumb({ src, emoji, tint, color, alt = '', fontSize, width = 240 }: ThumbProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        className="thumb-img"
        src={sizedImage(src, { width })}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return <EmojiThumb emoji={emoji} tint={tint} color={color} fontSize={fontSize} />;
}
