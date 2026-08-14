/** Stateful, deterministic event director with optional semantic-region coupling. */
export function createWorldDirector({ seed = 1, events = [], minGap = 8, maxGap = 22, regionGraph = null, semanticField = null, traceLimit = 64 } = {}) {
  let state = seed >>> 0;
  let active = null;
  let elapsed = 0;
  let nextAt = minGap;
  let enabled = true;
  const listeners = new Set();
  const trace = [];

  const random = () => {
    state |= 0; state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const remember = item => { trace.push({ at: elapsed, ...item }); while (trace.length > traceLimit) trace.shift(); };
  const emit = (type, payload) => { remember({ type, event: payload?.event?.name || payload?.name || null, region: payload?.region || null }); listeners.forEach(fn => fn({ type, payload })); };
  const schedule = () => { nextAt = elapsed + minGap + random() * Math.max(0, maxGap - minGap); };

  function enrichContext(context = {}) {
    const region = context.region || null;
    return {
      ...context,
      region,
      regionGraph,
      semanticField,
      regionNode: region && regionGraph?.nodes?.get ? regionGraph.nodes.get(region) : null,
      semanticSample: region && context.position && semanticField?.sample ? semanticField.sample(context.position.x, context.position.z, context) : null
    };
  }

  function choose(context) {
    const enriched = enrichContext(context);
    const available = events.filter(event => !event.when || event.when(enriched));
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
    if (!event) return null;
    const enriched = enrichContext(context);
    active = { event, age: 0, duration: Number(event.duration ?? 8), phase: 'anticipation', context: enriched, region: enriched.region };
    event.start?.(enriched);
    emit('start', active);
    return active;
  }

  function update(dt, context = {}) {
    elapsed += dt;
    if (!enabled) return null;
    if (!active && elapsed >= nextAt) { start(choose(context), context); schedule(); }
    if (!active) return null;

    active.age += dt;
    const t = Math.min(1, active.age / Math.max(1e-6, active.duration));
    const anticipation = Number(active.event.anticipation ?? 0.18);
    const recovery = Number(active.event.recovery ?? 0.25);
    active.phase = t < anticipation ? 'anticipation' : (t > 1 - recovery ? 'recovery' : 'impact');
    const enriched = enrichContext({ ...active.context, ...context, region: active.region || context.region });
    active.event.update?.({ ...active, t }, enriched);
    if (t >= 1) {
      active.event.end?.(enriched);
      emit('end', active);
      active = null;
    }
    return active;
  }

  schedule();
  return {
    update,
    trigger(name, context = {}) { return start(events.find(event => event.name === name), context); },
    triggerInRegion(name, region, context = {}) { return start(events.find(event => event.name === name), { ...context, region }); },
    cancel(context = {}) { if (active) { active.event.end?.(enrichContext(context)); emit('cancel', active); } active = null; schedule(); },
    setEnabled(value) { enabled = Boolean(value); },
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getTrace() { return trace.map(item => ({ ...item })); },
    clearTrace() { trace.length = 0; },
    get active() { return active; }
  };
}
