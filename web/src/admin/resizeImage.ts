/**
 * Shrink a catalogue photo before it is uploaded.
 *
 * Photos arrive straight from a phone or a supplier's sheet — several
 * megapixels, sometimes over 5 MB. Nothing in the app draws them larger than a
 * product card, so the full resolution is never seen by anyone. Resizing on
 * delivery already fixed what customers download; this fixes what we store and
 * what has to be re-rendered on every cache miss.
 *
 * WebP rather than JPEG because product cut-outs often have a transparent
 * background, and JPEG would fill it with black.
 */

/** Longest side, in pixels. Comfortably above the largest size we ever draw. */
const MAX_DIMENSION = 1400;
const QUALITY = 0.82;

function canResize(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    typeof HTMLCanvasElement !== 'undefined'
  );
}

/**
 * Returns a smaller file, or the original when shrinking isn't possible or
 * wouldn't help. Never throws: a failed resize must not block an upload.
 */
export async function resizeForUpload(file: File): Promise<File> {
  // SVGs are already tiny and would be rasterised; GIFs would lose animation.
  if (!canResize() || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    // Already small enough — re-encoding would only lose quality.
    if (scale === 1 && file.size < 300_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}
