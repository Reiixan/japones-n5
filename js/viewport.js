export function initViewport() {
  const appEl = document.getElementById('app');
  function update() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    const kh = Math.max(0, window.innerHeight - h);
    if (appEl) appEl.style.height = h + 'px';
    document.documentElement.style.setProperty('--keyboard-height', kh + 'px');
    document.documentElement.style.setProperty('--viewport-height', h + 'px');
  }
  update();
  (window.visualViewport ?? window).addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
}
