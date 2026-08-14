function finiteOr(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

/**
 * Distance bands with representation policy.
 * Backward compatible with v0.6 near/far/updateRate visibility behavior while
 * allowing each band to declare geometry/material/shadow/interaction policies.
 */
export class LodBands {
  constructor(bands = []) {
    this.bands = bands.map((band, index) => ({
      index,
      name: band.name || `band-${index}`,
      near: finiteOr(band.near, 0),
      far: finiteOr(band.far, Infinity),
      hysteresis: Math.max(0, finiteOr(band.hysteresis, 0)),
      updateRate: Math.max(1, finiteOr(band.updateRate, 1) | 0),
      densityMultiplier: Math.max(0, finiteOr(band.densityMultiplier, 1)),
      representation: band.representation || 'default',
      geometryPolicy: band.geometryPolicy || 'default',
      materialPolicy: band.materialPolicy || 'default',
      shadowPolicy: band.shadowPolicy || 'default',
      interactionPolicy: band.interactionPolicy || 'default',
      objects: new Set()
    }));
  }

  add(object, bandIndex = 0) {
    const band = this.bands[bandIndex];
    if (!band) throw new RangeError(`unknown band ${bandIndex}`);
    band.objects.add(object);
    object.userData ??= {};
    object.userData.lodBand = bandIndex;
    object.userData.lodPolicy = this.policyFor(bandIndex);
    return object;
  }

  move(object, bandIndex) {
    this.remove(object);
    return this.add(object, bandIndex);
  }

  remove(object) { for (const band of this.bands) band.objects.delete(object); }

  policyFor(bandIndex) {
    const band = this.bands[bandIndex];
    if (!band) return null;
    const { objects, ...policy } = band;
    return { ...policy };
  }

  findBand(distance, currentBand = null) {
    const d = finiteOr(distance, Infinity);
    if (currentBand != null && this.bands[currentBand]) {
      const band = this.bands[currentBand];
      if (d >= Math.max(0, band.near - band.hysteresis) && d <= band.far + band.hysteresis) return currentBand;
    }
    const index = this.bands.findIndex(band => d >= band.near && d <= band.far);
    return index >= 0 ? index : null;
  }

  update(cameraPosition, getPosition = object => object.position, frame = 0, applyPolicy = null) {
    for (const band of this.bands) {
      if (frame % band.updateRate !== 0) continue;
      for (const object of band.objects) {
        const position = getPosition(object);
        const distance = position.distanceTo ? position.distanceTo(cameraPosition) : Math.hypot(position.x-cameraPosition.x, position.y-cameraPosition.y, position.z-cameraPosition.z);
        const visible = distance >= Math.max(0, band.near - band.hysteresis) && distance <= band.far + band.hysteresis;
        object.visible = visible;
        object.userData ??= {};
        object.userData.lodDistance = distance;
        object.userData.lodPolicy = this.policyFor(band.index);
        if (visible && typeof applyPolicy === 'function') applyPolicy(object, object.userData.lodPolicy, distance);
      }
    }
  }

  classify(object, cameraPosition, getPosition = value => value.position) {
    const position = getPosition(object);
    const distance = position.distanceTo ? position.distanceTo(cameraPosition) : Math.hypot(position.x-cameraPosition.x, position.y-cameraPosition.y, position.z-cameraPosition.z);
    const index = this.findBand(distance, object.userData?.lodBand ?? null);
    return { distance, bandIndex: index, policy: index == null ? null : this.policyFor(index) };
  }

  dispose(disposeObject) {
    for (const band of this.bands) {
      for (const object of band.objects) disposeObject?.(object);
      band.objects.clear();
    }
  }
}
