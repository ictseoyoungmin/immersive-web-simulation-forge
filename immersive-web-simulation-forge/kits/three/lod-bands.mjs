export class LodBands {
  constructor(bands = []) {
    this.bands = bands.map((band, index) => ({
      index,
      near: Number(band.near ?? 0),
      far: Number(band.far ?? Infinity),
      hysteresis: Number(band.hysteresis ?? 0),
      updateRate: Number(band.updateRate ?? 1),
      objects: new Set()
    }));
  }

  add(object, bandIndex = 0) {
    const band = this.bands[bandIndex];
    if (!band) throw new RangeError(`unknown band ${bandIndex}`);
    band.objects.add(object);
    object.userData ??= {};
    object.userData.lodBand = bandIndex;
    return object;
  }

  remove(object) {
    for (const band of this.bands) band.objects.delete(object);
  }

  update(cameraPosition, getPosition = object => object.position, frame = 0) {
    for (const band of this.bands) {
      if (frame % Math.max(1, band.updateRate | 0) !== 0) continue;
      for (const object of band.objects) {
        const position = getPosition(object);
        const distance = position.distanceTo ? position.distanceTo(cameraPosition) : Math.hypot(position.x-cameraPosition.x, position.y-cameraPosition.y, position.z-cameraPosition.z);
        const visible = distance >= Math.max(0, band.near - band.hysteresis) && distance <= band.far + band.hysteresis;
        object.visible = visible;
        object.userData.lodDistance = distance;
      }
    }
  }

  dispose(disposeObject) {
    for (const band of this.bands) {
      for (const object of band.objects) disposeObject?.(object);
      band.objects.clear();
    }
  }
}
