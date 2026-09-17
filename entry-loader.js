(() => {
  const root = document.documentElement;
  const loader = document.querySelector('#entry-loader');
  if (!loader) return root.classList.remove('is-preloading');

  const bar = loader.querySelector('.entry-loader__bar');
  const value = loader.querySelector('.entry-loader__value');
  const status = loader.querySelector('.entry-loader__status');
  const startedAt = performance.now();
  const minimumDuration = 900;
  const hardTimeout = 25000;
  let target = 7;
  let displayed = 0;
  let finished = false;

  const setProgress = (next, label) => {
    const requested = Math.min(100, Number(next) || 0);
    const advances = requested >= target;
    target = Math.max(target, requested);
    if (label && advances) status.textContent = label;
  };

  const render = () => {
    if (finished) return;
    const distance = target - displayed;
    displayed += Math.max(.08, distance * .075);
    displayed = Math.min(displayed, target);
    const rounded = Math.round(displayed);
    bar.style.width = `${rounded}%`;
    value.textContent = `${rounded}%`;
    loader.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(rounded));
    requestAnimationFrame(render);
  };

  const release = async (timedOut = false) => {
    if (finished) return;
    finished = true;
    const remaining = Math.max(0, minimumDuration - (performance.now() - startedAt));
    if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
    target = displayed = 100;
    bar.style.width = '100%';
    value.textContent = '100%';
    status.textContent = timedOut ? '先開始探索，其餘內容將在背景完成。' : '遠征準備完成';
    loader.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', '100');
    await new Promise(resolve => setTimeout(resolve, timedOut ? 260 : 420));
    loader.classList.add('is-leaving');
    root.classList.remove('is-preloading');
    document.querySelectorAll('body > header, body > main, body > footer').forEach(node => node.removeAttribute('inert'));
    setTimeout(() => loader.remove(), 850);
    window.dispatchEvent(new CustomEvent('expedition:entered', { detail: { timedOut } }));
  };

  document.querySelectorAll('body > header, body > main, body > footer').forEach(node => node.setAttribute('inert', ''));
  window.addEventListener('expedition:loading-progress', event => setProgress(event.detail?.value, event.detail?.label));
  window.addEventListener('expedition:ready', () => release(false), { once: true });
  setTimeout(() => release(true), hardTimeout);
  requestAnimationFrame(render);
})();
