const blend = (from, to, amount) =>
  Object.fromEntries(
    Object.entries(to).map(([name, points]) => [
      name,
      points.map((point, i) => ({
        x: from[name][i].x + (point.x - from[name][i].x) * amount,
        y: from[name][i].y + (point.y - from[name][i].y) * amount,
      })),
    ]),
  );

// Keep fingertips over the home keys while the palm follows a small part of the reach.
export function handPose(home, target, info, shiftTarget, thumbs, unit) {
  const pose = {
    tips: [...home, ...thumbs].map((point) => ({ x: point.x, y: point.y })),
    palms: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  };
  const reach = (finger, point) => {
    if (!point) return;
    const origin = pose.tips[finger];
    pose.tips[finger] = { x: point.x, y: point.y };
    const side = finger < 4 || finger === 9 ? 0 : 1;
    const limit = unit * 0.22;
    pose.palms[side] = {
      x: Math.max(-limit, Math.min(limit, (point.x - origin.x) * 0.18)),
      y: Math.max(-limit, Math.min(limit, (point.y - origin.y) * 0.12)),
    };
  };
  if (info && target) {
    // A short downward stroke makes home-row and space presses visible too.
    reach(info.finger, { x: target.x, y: target.y + unit * 0.08 });
    if (info.shift) reach(info.finger < 4 ? 7 : 0, shiftTarget);
  }
  return pose;
}

export class HandMotion {
  constructor({
    requestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame = (id) => cancelAnimationFrame(id),
    now = () => performance.now(),
  } = {}) {
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.now = now;
    this.current = null;
    this.frame = null;
  }
  stop() {
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
  }
  move(home, target, draw, { returnHome = false, demo = false, instant = false } = {}) {
    this.stop();
    this.current ??= home;
    if (instant) {
      this.current = target;
      draw(target);
      return;
    }
    const stages = demo
      ? [
          [home, 160],
          [target, 450],
          [target, 450],
          [home, 450],
          [home, 250],
          [target, 450],
        ]
      : returnHome
        ? [
            [home, 110],
            [target, 190],
          ]
        : [[target, 220]];
    let from = this.current,
      start = this.now(),
      index = 0;
    draw(this.current);
    const tick = (time) => {
      const [to, duration] = stages[index];
      const progress = Math.min(1, Math.max(0, (time - start) / duration));
      const eased = progress * progress * (3 - 2 * progress);
      this.current = blend(from, to, eased);
      draw(this.current);
      if (progress === 1) {
        index++;
        if (index === stages.length) {
          this.frame = null;
          return;
        }
        from = this.current;
        start = time;
      }
      this.frame = this.requestFrame(tick);
    };
    this.frame = this.requestFrame(tick);
  }
}
