export function initViewport() {
  const appEl = document.getElementById('app');
  // visualViewport.height always reflects the area above the virtual keyboard.
  // We set #app height directly so the flex layout shrinks correctly when the
  // keyboard opens, regardless of whether dvh/interactive-widget is supported.
  function update() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    if (appEl) appEl.style.height = h + 'px';
  }
  update();
  (window.visualViewport ?? window).addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
}
