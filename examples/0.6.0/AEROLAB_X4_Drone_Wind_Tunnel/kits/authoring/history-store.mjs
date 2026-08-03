const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export class HistoryStore extends EventTarget {
  constructor({ limit = 80 } = {}) {
    super();
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.snapshots = [];
    this.suspended = false;
  }
  bind(parameterStore) {
    const listener = event => {
      const { path, value, previous, meta } = event.detail;
      if (this.suspended || meta?.history || meta?.transient || meta?.restore) return;
      this.push({ type: 'parameter', path, before: clone(previous), after: clone(value), at: performance.now?.() ?? Date.now() });
    };
    parameterStore.addEventListener('change', listener);
    return () => parameterStore.removeEventListener('change', listener);
  }
  push(command) {
    const last = this.undoStack.at(-1);
    // Merge slider scrubs occurring within 220 ms.
    if (last && last.type === command.type && last.path === command.path && command.at - last.at < 220) {
      last.after = clone(command.after); last.at = command.at;
    } else {
      this.undoStack.push(clone(command));
      if (this.undoStack.length > this.limit) this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.#emit();
  }
  undo(parameterStore) {
    const command = this.undoStack.pop(); if (!command) return false;
    this.suspended = true;
    try { parameterStore.set(command.path, clone(command.before), { history: true }); }
    finally { this.suspended = false; }
    this.redoStack.push(command); this.#emit(); return true;
  }
  redo(parameterStore) {
    const command = this.redoStack.pop(); if (!command) return false;
    this.suspended = true;
    try { parameterStore.set(command.path, clone(command.after), { history: true }); }
    finally { this.suspended = false; }
    this.undoStack.push(command); this.#emit(); return true;
  }
  saveTelemetrySnapshot(snapshot, label = '') {
    const item = { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, label: label || `Snapshot ${this.snapshots.length + 1}`, createdAt: new Date().toISOString(), data: clone(snapshot) };
    this.snapshots.push(item);
    if (this.snapshots.length > 24) this.snapshots.shift();
    this.dispatchEvent(new CustomEvent('snapshot', { detail: item }));
    return item;
  }
  clear() { this.undoStack.length = 0; this.redoStack.length = 0; this.#emit(); }
  #emit() { this.dispatchEvent(new CustomEvent('state', { detail: { canUndo: !!this.undoStack.length, canRedo: !!this.redoStack.length, undoDepth: this.undoStack.length, redoDepth: this.redoStack.length } })); }
}
