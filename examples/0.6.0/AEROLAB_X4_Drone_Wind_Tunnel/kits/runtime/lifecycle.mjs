export function createLifecycle(container, hooks = {}) {
  if (!(container instanceof Element)) throw new TypeError('container must be an Element');
  let mounted = false, suspended = false, destroyed = false, observer = null, aborter = null;
  let width = 1, height = 1, dpr = 1;
  const disposers = new Set();
  const call = (name, ...args) => { if (typeof hooks[name] === 'function') hooks[name](...args); };
  const measure = () => { const rect = container.getBoundingClientRect(); resize(rect.width, rect.height, globalThis.devicePixelRatio || 1); };
  function addDisposer(fn) { disposers.add(fn); return () => disposers.delete(fn); }
  function listen(target, type, handler, options = {}) {
    if (!aborter) aborter = new AbortController();
    target.addEventListener(type, handler, { ...options, signal: aborter.signal }); return handler;
  }
  function mount() {
    if (destroyed) throw new Error('cannot mount a destroyed lifecycle'); if (mounted) return;
    mounted = true; aborter = new AbortController(); observer = new ResizeObserver(measure); observer.observe(container); measure(); call('onMount', api);
  }
  function resize(nextWidth, nextHeight, nextDpr = 1) {
    width = Math.max(1, Number(nextWidth) || 1); height = Math.max(1, Number(nextHeight) || 1); dpr = Math.max(.5, Number(nextDpr) || 1); call('onResize', { width, height, dpr });
  }
  function suspend(reason = 'hidden') { if (!mounted || suspended || destroyed) return; suspended = true; call('onSuspend', reason); }
  function resume() { if (!mounted || !suspended || destroyed) return; suspended = false; call('onResume'); }
  function destroy() {
    if (destroyed) return; destroyed = true; suspended = true; observer?.disconnect(); aborter?.abort();
    for (const dispose of [...disposers].reverse()) try { dispose(); } catch (error) { console.warn('dispose failed', error); }
    disposers.clear(); call('onDestroy'); mounted = false;
  }
  const api = { mount, resize, suspend, resume, destroy, listen, addDisposer,
    get mounted(){return mounted}, get suspended(){return suspended}, get destroyed(){return destroyed}, get size(){return{width,height,dpr}} };
  return api;
}
