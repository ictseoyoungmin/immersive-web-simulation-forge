function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function createMeasurementSeries({ maxPoints = 10000 } = {}) {
  const runs = new Map();
  const record = (runId, point) => {
    if (!runId) throw new TypeError('runId is required');
    const run = runs.get(runId) || [];
    run.push({ ...point });
    if (run.length > maxPoints) run.splice(0, run.length - maxPoints);
    runs.set(runId, run);
  };
  const points = runId => (runs.get(runId) || []).map(point => ({ ...point }));
  const summarize = (runId, field) => {
    const values = (runs.get(runId) || []).map(point => Number(point[field])).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) return { count: 0, min: null, max: null, mean: null, p50: null, p95: null };
    return {
      count: values.length,
      min: values[0], max: values.at(-1),
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      p50: percentile(values, .5), p95: percentile(values, .95)
    };
  };
  const plot = (runId, xField, yField, limit = 1200) => {
    const source = (runs.get(runId) || []).filter(point => Number.isFinite(Number(point[xField])) && Number.isFinite(Number(point[yField])));
    if (source.length <= limit) return source.map(point => ({ x: Number(point[xField]), y: Number(point[yField]) }));
    const stride = source.length / limit;
    return Array.from({ length: limit }, (_, index) => {
      const point = source[Math.min(source.length - 1, Math.floor(index * stride))];
      return { x: Number(point[xField]), y: Number(point[yField]) };
    });
  };
  const toCSV = runId => {
    const source = runs.get(runId) || [];
    const fields = [...new Set(source.flatMap(point => Object.keys(point)))];
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [fields.map(quote).join(','), ...source.map(point => fields.map(field => quote(point[field])).join(','))].join('\n');
  };
  return { record, points, summarize, plot, toCSV, clear(runId) { runId ? runs.delete(runId) : runs.clear(); }, get runIds() { return [...runs.keys()]; } };
}
