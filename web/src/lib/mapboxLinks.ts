/**
 * Mapbox's logo and attribution are links to mapbox.com. Keep them on screen —
 * Mapbox's terms want the attribution there — but swallow the click: nobody
 * picking a delivery address or watching their order arrive wants to be sent
 * off to a map vendor's marketing site. The (i) toggle still expands credits.
 *
 * Installed once for the whole app rather than per map, so maps added later are
 * covered without anyone having to remember this.
 */
export function blockMapboxAttributionLinks(): void {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.mapboxgl-ctrl a')) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
}
