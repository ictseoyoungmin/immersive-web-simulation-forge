export function createWorldDirector({ seed = 1, events = [], minGap = 8, maxGap = 22 } = {}) {
  let state = seed >>> 0;
  let active = null;
  let elapsed = 0;
  let nextAt = minGap;
  let enabled = true;
  const listeners = new Set();

  const random = () => {
    state |= 0; state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const emit = (type, payload) => listeners.forEach(fn => fn({ type, payload }));
  const schedule = () => { nextAt = elapsed + minGap + random() * Math.max(0, maxGap - minGap); };

  function choose(context) {
    const available = events.filter(event => !event.when || event.when(context));
    if (!available.length) return null;
    const total = available.reduce((sum, event) => sum + Number(event.weight ?? 1), 0);
    let cursor = random() * total;
    for (const event of available) {
      cursor -= Number(event.weight ?? 1);
      if (cursor <= 0) return event;
    }
    return available.at(-1);
  }

  function start(event, context = {}) {
    if (!event) return;
    active = { event, age: 0, duration: Number(event.duration ?? 8), phase: 'anticipation', context };
    event.start?.(context);
    emit('start', active);
  }

  function update(dt, context = {}) {
    elapsed += dt;
    if (!enabled) return null;
    if (!active && elapsed >= nextAt) {
      start(choose(context), context);
      schedule();
    }
    if (!active) return null;

    active.age += dt;
    const t = Math.min(1, active.age / Math.max(1e-6, active.duration));
    const anticipation = Number(active.event.anticipation ?? 0.18);
    const recovery = Number(active.event.recovery ?? 0.25);
    active.phase = t < anticipation ? 'anticipation' : (t > 1 - recovery ? 'recovery' : 'impact');
    active.event.update?.({ ...active, t }, context);
    if (t >= 1) {
      active.event.end?.(context);
      emit('end', active);
      active = null;
    }
    return active;
  }

  schedule();
  return {
    update,
    trigger(name, context = {}) { start(events.find(event => event.name === name), context); },
    cancel(context = {}) { if (active) active.event.end?.(context); active = null; schedule(); },
    setEnabled(value) { enabled = Boolean(value); },
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get active() { return active; }
  };
}
