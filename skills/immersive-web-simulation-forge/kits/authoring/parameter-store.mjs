const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function normalize(definition, value, name) {
  let next = value;
  if (definition.type === 'number') {
    next = Number(next);
    if (!Number.isFinite(next)) throw new TypeError(`${name} must be finite`);
    if (Number.isFinite(definition.min)) next = Math.max(definition.min, next);
    if (Number.isFinite(definition.max)) next = Math.min(definition.max, next);
    if (Number.isFinite(definition.step) && definition.step > 0) {
      const base = Number.isFinite(definition.min) ? definition.min : 0;
      next = base + Math.round((next - base) / definition.step) * definition.step;
    }
  }
  if (definition.type === 'boolean') next = Boolean(next);
  if (definition.enum && !definition.enum.includes(next)) throw new RangeError(`${name} is not an allowed value`);
  if (definition.validate && definition.validate(next) !== true) throw new RangeError(`${name} failed validation`);
  return next;
}

export function createParameterStore({ schema, initial = {}, derived = {} } = {}) {
  if (!schema || typeof schema !== 'object') throw new TypeError('schema is required');
  const listeners = new Set();
  let revision = 0;
  let values = {};
  for (const [name, definition] of Object.entries(schema)) {
    const raw = Object.hasOwn(initial, name) ? initial[name] : definition.default;
    if (raw === undefined) throw new Error(`Missing parameter default: ${name}`);
    values[name] = normalize(definition, raw, name);
  }
  const snapshot = () => {
    const base = clone(values);
    for (const [name, derive] of Object.entries(derived)) base[name] = derive(Object.freeze(clone(base)));
    return Object.freeze(base);
  };
  const patch = (changes, reason = 'parameter-change') => {
    const next = { ...values };
    for (const [name, value] of Object.entries(changes)) {
      if (!Object.hasOwn(schema, name)) throw new Error(`Unknown parameter: ${name}`);
      next[name] = normalize(schema[name], value, name);
    }
    values = next;
    revision++;
    const state = snapshot();
    for (const listener of listeners) listener(state, { reason, revision, changed: Object.keys(changes) });
    return state;
  };
  return {
    get value() { return snapshot(); },
    get revision() { return revision; },
    set(name, value, reason) { return patch({ [name]: value }, reason); },
    patch,
    reset() {
      values = {};
      for (const [name, definition] of Object.entries(schema)) values[name] = normalize(definition, definition.default, name);
      revision++;
      const state = snapshot();
      for (const listener of listeners) listener(state, { reason: 'reset', revision, changed: Object.keys(schema) });
      return state;
    },
    describe() { return clone(Object.fromEntries(Object.entries(schema).map(([name, definition]) => [name, { ...definition, validate: undefined }]))); },
    serialize() { return { revision, values: clone(values) }; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}
