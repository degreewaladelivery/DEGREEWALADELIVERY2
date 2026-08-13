/**
 * Shared pieces for the Mapbox maps we render inside WebViews.
 *
 * Every map in the app is an inline HTML document, so anything that has to be
 * true of all of them lives here rather than being copy-pasted per map.
 */

/**
 * Mapbox's logo and attribution are links. Keep them on screen — Mapbox's terms
 * want the attribution there — but swallow the click. Inside a WebView these
 * links navigate in place, replacing the map with mapbox.com and stranding the
 * customer with no way back. The (i) toggle still expands the credits.
 */
export const BLOCK_ATTRIBUTION_LINKS_JS = `
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest && e.target.closest('.mapboxgl-ctrl a');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
`;

/**
 * The maps are maps, not browsers: only the inline document may load. Belt and
 * braces alongside BLOCK_ATTRIBUTION_LINKS_JS, in case anything else in the
 * page tries to navigate the WebView away.
 */
export function allowMapOnly(request: { url: string }): boolean {
  return request.url.startsWith('about:') || request.url.startsWith('data:');
}
