import './EmojiThumb.css';

interface EmojiThumbProps {
  /** The emoji to show (usually the category emoji). */
  emoji: string;
  /** Soft background tint (from the category palette). */
  tint?: string;
  /** Accent colour used for a subtle ring/glow. */
  color?: string;
  /** Emoji size in px. */
  fontSize?: number;
}

/**
 * A tasteful image placeholder: a soft tinted panel with a big centred emoji.
 * Used wherever a real photo will eventually go (shops, products, categories),
 * so the UI looks finished and on-brand without any image files or network.
 */
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
