export function createPostChain(THREE, renderer, passes = []) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  scene.add(quad);
  let width = 1;
  let height = 1;
  let targets = [
    new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true }),
    new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
  ];

  function resize(nextWidth, nextHeight) {
    width = Math.max(1, nextWidth | 0);
    height = Math.max(1, nextHeight | 0);
    targets.forEach(target => target.setSize(width, height));
    passes.forEach(pass => pass.resize?.(width, height));
  }

  function render(renderScene, renderCamera) {
    renderer.setRenderTarget(targets[0]);
    renderer.clear();
    renderer.render(renderScene, renderCamera);
    let read = targets[0];
    let write = targets[1];
    for (let i = 0; i < passes.length; i += 1) {
      const pass = passes[i];
      const last = i === passes.length - 1;
      if (pass.enabled === false) continue;
      pass.material.uniforms.tInput.value = read.texture;
      pass.beforeRender?.({ read, write, width, height });
      quad.material = pass.material;
      renderer.setRenderTarget(last ? null : write);
      renderer.render(scene, camera);
      [read, write] = [write, read];
    }
    if (!passes.length) {
      renderer.setRenderTarget(null);
      renderer.render(renderScene, renderCamera);
    }
  }

  function dispose() {
    quad.geometry.dispose();
    passes.forEach(pass => { pass.dispose?.(); pass.material?.dispose?.(); });
    targets.forEach(target => target.dispose());
    targets = [];
  }

  return { resize, render, dispose, targets };
}
