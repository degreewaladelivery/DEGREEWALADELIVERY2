const isAdminRoute = () => window.location.pathname.startsWith('/admin');

export function enableDesignPreviewMode() {

  document.addEventListener(
    'click',
    (e) => {
      if (isAdminRoute()) return;
      const target = e.target as HTMLElement | null;
      const el = target?.closest('a, button, [role="button"]');

      if (el && !el.closest('.nav-toggle')) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  document.addEventListener(
    'submit',
    (e) => {
      if (isAdminRoute()) return;
      e.preventDefault();
    },
    true,
  );
}
