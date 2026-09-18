(() => {
  const root = document.documentElement;
  const loader = document.querySelector('#entry-loader');
  if (!loader) return root.classList.remove('is-preloading');

  const bar = loader.querySelector('.entry-loader__bar');
  const value = loader.querySelector('.entry-loader__value');
  const status = loader.querySelector('.entry-loader__status');
  const startedAt = performance.now();
  const minimumDuration = 900;
  const slowNoticeDelay = 25000;
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

  const release = async () => {
    if (finished) return;
    finished = true;
    const remaining = Math.max(0, minimumDuration - (performance.now() - startedAt));
    if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
    target = displayed = 100;
    bar.style.width = '100%';
    value.textContent = '100%';
    status.textContent = '遠征準備完成';
    loader.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', '100');
    await new Promise(resolve => setTimeout(resolve, 420));
    loader.classList.add('is-leaving');
    root.classList.remove('is-preloading');
    document.querySelectorAll('body > header, body > main, body > footer').forEach(node => node.removeAttribute('inert'));
    setTimeout(() => loader.remove(), 850);
    window.dispatchEvent(new CustomEvent('expedition:entered', { detail: { timedOut: false } }));
  };

  document.querySelectorAll('body > header, body > main, body > footer').forEach(node => node.setAttribute('inert', ''));
  window.addEventListener('expedition:loading-progress', event => setProgress(event.detail?.value, event.detail?.label));
  window.addEventListener('expedition:ready', () => release(), { once: true });
  // 經過時間不是完成證據；場景尚未就緒時維持進度與捲動鎖定。
  setTimeout(() => {
    if (!finished) {
      loader.dataset.slow = 'true';
      status.textContent = '場景仍在準備中，完成後會自動進入。';
    }
  }, slowNoticeDelay);
  requestAnimationFrame(render);
})();
