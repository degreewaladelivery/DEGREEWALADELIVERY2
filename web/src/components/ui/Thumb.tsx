import { useState } from 'react';
import { EmojiThumb } from './EmojiThumb';
import './Thumb.css';

interface ThumbProps {

  src?: string;
  emoji: string;
  tint?: string;
  color?: string;
  alt?: string;
  fontSize?: number;
}

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
