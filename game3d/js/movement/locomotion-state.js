// A collision can alternate tiny slides with blocked substeps. Once standing,
// wait for sustained movement before restarting the clip and its crossfade.
export class LocomotionState {
  constructor() {
    this.travelMoving = false;
    this.reset();
  }
  reset(source = null) {
    this.source = source;
    this.contact = false;
    this.restart = 0;
  }
  step({ moving: was, v, path, steer, keyFrame, aside }, moved, dt, limited, keys) {
    const source = keys ? keyFrame : steer || path || aside,
      speed = moved / Math.max(dt, 1e-4);
    // Keep the public physical movement flag independent of clip restarts.
    this.travelMoving = was ? speed > 0.04 && v > 0.04 : speed > 0.1 && v > 0.1;
    if (source !== this.source || !source) this.reset(source);
    if (!this.travelMoving) {
      if (limited && source) this.contact = true;
      this.restart = 0;
      return false;
    }
    if (this.contact) {
      this.restart = speed > 0.1 && v > 0.1 ? this.restart + dt : 0;
      if (this.restart < 0.12) return false;
    }
    this.contact = false;
    this.restart = 0;
    return true;
  }
}
