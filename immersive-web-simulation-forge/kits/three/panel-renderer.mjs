export function createThreePanelRenderer(THREE, container, options = {}) {
  if (!THREE || !container) throw new TypeError('THREE and container are required');
  const renderer = new THREE.WebGLRenderer({
    antialias: Boolean(options.antialias),
    alpha: options.alpha ?? true,
    powerPreference: options.powerPreference ?? 'high-performance',
    preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer)
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = Boolean(options.shadows);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = options.camera ?? new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  const disposables = new Set();
  let width = 1;
  let height = 1;
  let dpr = 1;
  let lost = false;

  const onContextLost = event => { event.preventDefault(); lost = true; options.onContextLost?.(event); };
  const onContextRestored = event => { lost = false; options.onContextRestored?.(event); };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

  function track(value) { if (value?.dispose) disposables.add(value); return value; }
  function resize(nextWidth, nextHeight, nextDpr = 1) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    dpr = Math.min(options.maxDpr ?? 2, Math.max(0.5, nextDpr));
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix?.();
  }
  function render(target = null) {
    if (lost) return;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }
  function destroy() {
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
    for (const value of [...disposables].reverse()) value.dispose?.();
    disposables.clear();
    scene.traverse(object => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach(material => {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose?.();
        material.dispose?.();
      });
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { renderer, scene, camera, resize, render, destroy, track, get size() { return { width, height, dpr }; } };
}
