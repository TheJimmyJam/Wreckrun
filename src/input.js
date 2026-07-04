// input.js — keyboard (arrows/A-D) + touch (left/right screen halves), steer-only

export class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.left = false;
    this.right = false;
    this.pausePressed = false; // one-shot flag, consumed by game.js
    this.tapPoint = null;      // one-shot flag for menu/gameover taps, {x,y} in CSS px

    this._activeTouches = new Map(); // touch id -> "left" | "right"

    this._onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.right = true;
      if (e.code === "Escape" || e.code === "KeyP") this.pausePressed = true;
    };
    this._onKeyUp = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.right = false;
    };

    this._onTouchStart = (e) => {
      for (const t of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const xCss = t.clientX - rect.left;
        const half = xCss < rect.width / 2 ? "left" : "right";
        this._activeTouches.set(t.identifier, half);
        this.tapPoint = { x: xCss, y: t.clientY - rect.top };
      }
      this._recomputeTouchSteer();
      e.preventDefault();
    };
    this._onTouchEnd = (e) => {
      for (const t of e.changedTouches) this._activeTouches.delete(t.identifier);
      this._recomputeTouchSteer();
      e.preventDefault();
    };

    this._onMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const xCss = e.clientX - rect.left;
      const yCss = e.clientY - rect.top;
      this.tapPoint = { x: xCss, y: yCss };
      this._mouseHeld = xCss < rect.width / 2 ? "left" : "right";
      this._recomputeMouseSteer();
    };
    this._onMouseUp = () => {
      this._mouseHeld = null;
      this._recomputeMouseSteer();
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    canvas.addEventListener("touchstart", this._onTouchStart, { passive: false });
    canvas.addEventListener("touchend", this._onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", this._onTouchEnd, { passive: false });
    canvas.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
  }

  _recomputeTouchSteer() {
    let l = false, r = false;
    for (const half of this._activeTouches.values()) {
      if (half === "left") l = true;
      if (half === "right") r = true;
    }
    this._touchLeft = l;
    this._touchRight = r;
  }

  _recomputeMouseSteer() {
    this._mouseLeft = this._mouseHeld === "left";
    this._mouseRight = this._mouseHeld === "right";
  }

  /** -1 (left), 0 (straight), or 1 (right) */
  get steerDirection() {
    const left = this.left || this._touchLeft || this._mouseLeft;
    const right = this.right || this._touchRight || this._mouseRight;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  }

  consumeTap() {
    const t = this.tapPoint;
    this.tapPoint = null;
    return t;
  }

  consumePause() {
    const p = this.pausePressed;
    this.pausePressed = false;
    return p;
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.canvas.removeEventListener("touchstart", this._onTouchStart);
    this.canvas.removeEventListener("touchend", this._onTouchEnd);
    this.canvas.removeEventListener("touchcancel", this._onTouchEnd);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
  }
}
