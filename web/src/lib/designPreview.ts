/**
 * lib/designPreview.ts
 * --------------------------------------------------------------------------
 * DESIGN-PREVIEW MODE
 *
 * Makes every button and link NON-functional (no navigation, no cart changes,
 * no form submits) while keeping ALL animations live (hover, press, transitions
 * are pure CSS and are untouched). Use this to showcase the design without any
 * behaviour wired up.
 *
 * How it works: a capture-phase listener on `document` fires BEFORE the click
 * reaches React or the browser's default action.
 *   - preventDefault()  -> stops <a>/react-router <Link> navigation
 *                          (Link skips navigating when the event is already
 *                           defaultPrevented)
 *   - stopPropagation() -> stops React onClick handlers (Add to cart, Place
 *                          Order, steppers, hamburger, etc.) from firing
 * CSS :hover / :active still work because they depend on pointer state, not on
 * the click event propagating.
 *
 * TO RESTORE FULL FUNCTIONALITY: delete the `enableDesignPreviewMode()` call in
 * src/main.tsx (and, optionally, this file).
 */

/** The admin panel (/admin/*) is a real working tool, not part of the design
 *  preview — it's exempted from the click/submit interceptors below. */
const isAdminRoute = () => window.location.pathname.startsWith('/admin');

export function enableDesignPreviewMode() {
  // Neutralise clicks on links / buttons.
  document.addEventListener(
    'click',
    (e) => {
      if (isAdminRoute()) return;
      const target = e.target as HTMLElement | null;
      const el = target?.closest('a, button, [role="button"]');
      // Exception: keep the mobile hamburger (☰) menu toggle clickable.
      if (el && !el.closest('.nav-toggle')) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true, // capture phase — runs before React and before default navigation
  );

  // Neutralise form submissions (search, login, checkout) incl. Enter key.
  document.addEventListener(
    'submit',
    (e) => {
      if (isAdminRoute()) return;
      e.preventDefault();
    },
    true,
  );
}
