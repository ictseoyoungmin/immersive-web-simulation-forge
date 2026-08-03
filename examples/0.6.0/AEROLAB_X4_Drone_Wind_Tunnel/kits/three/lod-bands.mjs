export const QUALITY_BANDS = {
  low: { particleCount: 350, sceneScale: .72, dprCap: 1, postSamples: 2, label: 'LOW' },
  balanced: { particleCount: 700, sceneScale: .84, dprCap: 1.35, postSamples: 4, label: 'BALANCED' },
  high: { particleCount: 1200, sceneScale: .94, dprCap: 1.7, postSamples: 6, label: 'HIGH' },
  ultra: { particleCount: 2600, sceneScale: 1, dprCap: 2, postSamples: 8, label: 'ULTRA' }
};

export class LODBands extends EventTarget {
  constructor(initial = 'high') {
    super(); this.tier = initial; this.manual = false; this.lowSeconds = 0; this.highSeconds = 0;
  }
  setTier(tier, { manual = true } = {}) {
    if (!QUALITY_BANDS[tier] || tier === this.tier) return false;
    this.tier = tier; this.manual = manual; this.lowSeconds = this.highSeconds = 0;
    this.dispatchEvent(new CustomEvent('change', { detail: this.current })); return true;
  }
  sampleFPS(fps, elapsed = .5) {
    if (this.manual) return;
    this.lowSeconds = fps < 48 ? this.lowSeconds + elapsed : Math.max(0, this.lowSeconds - elapsed * .6);
    this.highSeconds = fps > 58 ? this.highSeconds + elapsed : 0;
    const order = ['low','balanced','high','ultra']; const i = order.indexOf(this.tier);
    if (this.lowSeconds > 2.5 && i > 0) this.setTier(order[i-1], { manual:false });
    else if (this.highSeconds > 7 && i < order.length-1) this.setTier(order[i+1], { manual:false });
  }
  get current() { return { tier:this.tier, ...QUALITY_BANDS[this.tier] }; }
}
