export function createSharedFieldTexture(THREE, field, options = {}) {
  if (!field?.data) throw new TypeError('field with typed data is required');
  const formatByChannels = {
    1: THREE.RedFormat,
    2: THREE.RGFormat,
    3: THREE.RGBFormat,
    4: THREE.RGBAFormat
  };
  const texture = new THREE.DataTexture(
    field.data,
    field.width,
    field.height,
    options.format ?? formatByChannels[field.channels] ?? THREE.RGBAFormat,
    options.type ?? THREE.FloatType
  );
  texture.minFilter = options.minFilter ?? THREE.LinearFilter;
  texture.magFilter = options.magFilter ?? THREE.LinearFilter;
  texture.wrapS = options.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = options.wrapT ?? THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = Boolean(options.generateMipmaps);
  texture.needsUpdate = true;
  let uploadedVersion = field.version;

  return {
    texture,
    sync(force = false) {
      if (force || uploadedVersion !== field.version) {
        texture.needsUpdate = true;
        uploadedVersion = field.version;
        return true;
      }
      return false;
    },
    dispose() { texture.dispose(); }
  };
}
