const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createProjectCodec({ schema, currentVersion, migrations = {}, validate = () => true } = {}) {
  if (!schema || !Number.isInteger(currentVersion) || currentVersion < 1) throw new TypeError('schema and positive currentVersion are required');
  const encode = data => {
    const copy = clone(data);
    const result = validate(copy);
    if (result !== true) throw new Error(typeof result === 'string' ? result : 'Project validation failed');
    return JSON.stringify({ schema, version: currentVersion, data: copy }, null, 2);
  };
  const decode = input => {
    const envelope = typeof input === 'string' ? JSON.parse(input) : clone(input);
    if (envelope.schema !== schema) throw new Error(`Unsupported schema: ${envelope.schema}`);
    if (!Number.isInteger(envelope.version) || envelope.version < 1 || envelope.version > currentVersion) throw new Error(`Unsupported version: ${envelope.version}`);
    let version = envelope.version;
    let data = clone(envelope.data);
    while (version < currentVersion) {
      const migrate = migrations[version];
      if (typeof migrate !== 'function') throw new Error(`Missing migration ${version} → ${version + 1}`);
      data = migrate(clone(data));
      version++;
    }
    const result = validate(data);
    if (result !== true) throw new Error(typeof result === 'string' ? result : 'Imported project validation failed');
    return { schema, version, data };
  };
  const roundTrip = data => {
    const decoded = decode(encode(data)).data;
    return { ok: JSON.stringify(decoded) === JSON.stringify(data), data: decoded };
  };
  return {
    encode, decode, roundTrip,
    toBlob(data) { return new Blob([encode(data)], { type: 'application/json' }); },
    async readFile(file) { return decode(await file.text()); }
  };
}
