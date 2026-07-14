import './EmojiThumb.css';

interface EmojiThumbProps {

  emoji: string;

  tint?: string;

  color?: string;

  fontSize?: number;
}

export function EmojiThumb({ emoji, tint = '#FFF3E0', color = '#FF6B00', fontSize = 44 }: EmojiThumbProps) {
  return (
    <div
      className="emoji-thumb"
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, #ffffff 0%, ${tint} 55%, ${tint} 100%)`,
        boxShadow: `inset 0 0 0 1px ${color}1f`,
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize }}>{emoji}</span>
    </div>
  );
}
