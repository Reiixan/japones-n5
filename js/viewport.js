export function initViewport() {
  function update() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    const kh = Math.max(0, window.innerHeight - h);
    document.documentElement.style.setProperty('--viewport-height', h + 'px');
    document.documentElement.style.setProperty('--keyboard-height', kh + 'px');
  }
  update();
  (window.visualViewport ?? window).addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
}
