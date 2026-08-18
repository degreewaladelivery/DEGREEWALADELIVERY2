/**
 * Ask Supabase for an image at the size we actually draw it.
 *
 * Catalogue photos are uploaded straight from a phone or a supplier sheet, so
 * they are full-resolution: averaging ~700 KB, with individual files past 5 MB.
 * Every one of those was being downloaded in full to fill a 40–160 px
 * thumbnail. On a rural mobile connection that is the difference between a list
 * that appears instantly and one that fills in photo by photo.
 *
 * Supabase Storage can resize on the fly, so we simply request the size we
 * need: about 89% smaller in practice.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

export interface ImageSize {
  /** Pixel width to render at. Pass the largest the image is ever drawn. */
  width: number;
  /** 1–100. 70 is indistinguishable from source at thumbnail sizes. */
  quality?: number;
}

/**
 * Returns a resized URL for Supabase-hosted images, and leaves anything else
 * untouched — bundled assets and third-party URLs must pass through unchanged.
 */
export function sizedImage(url: string | undefined | null, size: ImageSize): string | undefined {
  if (!url) return undefined;
  if (!url.includes(OBJECT_PATH)) return url;

  const rendered = url.replace(OBJECT_PATH, RENDER_PATH);
  const separator = rendered.includes('?') ? '&' : '?';
  // resize=contain keeps the whole product visible; cropping a packet in half
  // makes it harder to recognise, which is the one job these images have.
  return `${rendered}${separator}width=${size.width}&quality=${size.quality ?? 70}&resize=contain`;
}

/** Sizes matched to where images are actually drawn, so nothing over-fetches. */
export const IMAGE_SIZES = {
  /** Order item rows, cart lines, agent item lists. */
  thumb: { width: 120 },
  /** Product cards in a grid or list. */
  card: { width: 320 },
  /** Category and shop banners. */
  banner: { width: 720 },
  /** Full-width product detail. */
  hero: { width: 900, quality: 80 },
} as const;
