function abortError(reason = 'Task cancelled') {
  const error = new Error(String(reason));
  error.name = 'AbortError';
  return error;
}

export function createTaskRunner({ workerFactory = null, execute = null } = {}) {
  if (!workerFactory && typeof execute !== 'function') throw new TypeError('workerFactory or execute is required');
  let worker = null;
  let nextId = 1;
  let disposed = false;
  const pending = new Map();

  const ensureWorker = () => {
    if (!worker && workerFactory) {
      worker = workerFactory();
      worker.addEventListener('message', event => {
        const message = event.data || {};
        const task = pending.get(message.id);
        if (!task) return;
        if (message.kind === 'progress') task.onProgress?.(message.progress, message.detail);
        if (message.kind === 'result' || message.kind === 'error') {
          if (message.kind === 'result') task.resolve(message.result);
          else task.reject(Object.assign(new Error(message.error?.message || 'Worker task failed'), message.error || {}));
        }
      });
      worker.addEventListener('error', event => {
        const error = event.error || new Error(event.message || 'Worker failed');
        for (const task of pending.values()) { task.cleanup(); task.reject(error); }
        pending.clear();
      });
    }
    return worker;
  };

  const run = (type, payload, { signal, onProgress } = {}) => {
    if (disposed) throw new Error('Task runner is disposed');
    const id = nextId++;
    const controller = new AbortController();
    let settled = false;
    const onExternalAbort = () => cancel(signal?.reason || 'Task cancelled');
    const cleanupExternal = signal ? (() => signal.removeEventListener('abort', onExternalAbort)) : () => {};
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      pending.delete(id);
      cleanupExternal();
      fn(value);
    };
    function cancel(reason = 'Task cancelled') {
      if (settled) return;
      controller.abort(reason);
      if (worker) worker.postMessage({ forgeTask: true, kind: 'cancel', id });
      pending.delete(id);
      settle(rejectPromise, abortError(reason));
    }
    if (signal) {
      if (signal.aborted) cancel(signal.reason);
      else signal.addEventListener('abort', onExternalAbort, { once: true });
    }
    if (!settled) {
      pending.set(id, {
        onProgress,
        cleanup: cleanupExternal,
        cancel,
        resolve: value => settle(resolvePromise, value),
        reject: error => settle(rejectPromise, error)
      });
    }
    if (!settled && workerFactory) {
      ensureWorker().postMessage({ forgeTask: true, kind: 'run', id, type, payload });
    } else if (!settled) {
      Promise.resolve().then(() => execute(type, payload, {
        signal: controller.signal,
        progress: (value, detail) => { if (!settled) onProgress?.(value, detail); }
      })).then(value => settle(resolvePromise, value), error => settle(rejectPromise, error));
    }
    return { id, promise, cancel };
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const task of [...pending.values()]) task.cancel('Task runner disposed');
    worker?.terminate?.();
    worker = null;
  };

  return { run, dispose, get activeCount() { return pending.size; } };
}

export function installTaskWorker(handlers, scope = globalThis) {
  const cancelled = new Set();
  const listener = async event => {
    const message = event.data || {};
    if (!message.forgeTask) return;
    if (message.kind === 'cancel') { cancelled.add(message.id); return; }
    if (message.kind !== 'run') return;
    const handler = handlers[message.type];
    if (typeof handler !== 'function') {
      scope.postMessage({ id: message.id, kind: 'error', error: { message: `Unknown task: ${message.type}` } });
      return;
    }
    try {
      const result = await handler(message.payload, {
        isCancelled: () => cancelled.has(message.id),
        throwIfCancelled: () => { if (cancelled.has(message.id)) throw abortError(); },
        progress: (progress, detail) => scope.postMessage({ id: message.id, kind: 'progress', progress, detail })
      });
      if (!cancelled.has(message.id)) scope.postMessage({ id: message.id, kind: 'result', result });
    } catch (error) {
      scope.postMessage({ id: message.id, kind: 'error', error: { name: error?.name, message: error?.message || String(error) } });
    } finally {
      cancelled.delete(message.id);
    }
  };
  scope.addEventListener('message', listener);
  return () => scope.removeEventListener('message', listener);
}
