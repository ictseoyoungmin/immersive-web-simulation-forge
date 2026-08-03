export function createCanvasFieldRenderer(canvas, { field, layers = [], maxDpr = 2 } = {}) {
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  let width = 1;
  let height = 1;
  let dpr = 1;

  function resize(nextWidth, nextHeight, nextDpr = 1) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    dpr = Math.min(maxDpr, Math.max(0.5, nextDpr));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function render(state, time) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const frame = { context, width, height, dpr, field, state, time };
    for (const layer of layers) {
      context.save();
      layer.render?.(frame);
      context.restore();
    }
  }

  function inspect(x, y, state) {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const hit = layers[i].inspect?.({ x, y, width, height, field, state });
      if (hit) return hit;
    }
    return null;
  }

  function destroy() {
    layers.forEach(layer => layer.destroy?.());
    canvas.width = 1;
    canvas.height = 1;
  }

  return { resize, render, inspect, destroy, context };
}
