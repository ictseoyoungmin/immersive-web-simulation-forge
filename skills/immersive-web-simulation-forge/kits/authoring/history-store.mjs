const defaultClone = value => typeof structuredClone === 'function'
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

export function createHistoryStore({ initialState, clone = defaultClone, equals = null, maxEntries = 100 } = {}) {
  if (initialState === undefined) throw new TypeError('initialState is required');
  if (!Number.isInteger(maxEntries) || maxEntries < 2) throw new RangeError('maxEntries must be at least 2');
  let entries = [{ state: clone(initialState), label: 'Initial state' }];
  let index = 0;
  const listeners = new Set();
  const same = equals || ((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const notify = reason => {
    const snapshot = api.snapshot();
    for (const listener of listeners) listener(snapshot, reason);
  };
  const commit = (nextState, label = 'Edit') => {
    const next = clone(nextState);
    if (same(entries[index].state, next)) return false;
    entries = entries.slice(0, index + 1);
    entries.push({ state: next, label });
    if (entries.length > maxEntries) entries.shift();
    index = entries.length - 1;
    notify('commit');
    return true;
  };
  const api = {
    get value() { return clone(entries[index].state); },
    get canUndo() { return index > 0; },
    get canRedo() { return index < entries.length - 1; },
    commit,
    transact(mutator, label = 'Edit') {
      const draft = clone(entries[index].state);
      const result = mutator(draft);
      return commit(result === undefined ? draft : result, label);
    },
    undo() { if (!api.canUndo) return null; index--; notify('undo'); return api.value; },
    redo() { if (!api.canRedo) return null; index++; notify('redo'); return api.value; },
    replace(nextState, label = 'Loaded state') { entries = [{ state: clone(nextState), label }]; index = 0; notify('replace'); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot() { return { value: api.value, canUndo: api.canUndo, canRedo: api.canRedo, index, length: entries.length, label: entries[index].label }; }
  };
  return api;
}
