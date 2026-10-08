/* Dependency-free circle solver: fixed substeps, positional constraints,
   mass-weighted impulses, Coulomb friction and angular velocity. */
(() => {
  'use strict';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  class PhysicsWorld {
    constructor({ width = 420, height = 600, levels, onMerge = () => {} } = {}) {
      this.width = width; this.height = height; this.levels = levels; this.onMerge = onMerge;
      this.left = 13; this.right = width - 13; this.floor = height - 18;
      this.gravity = 1100; this.bodies = []; this.time = 0; this.sequence = 0;
    }
    add(level, x, y, motion = {}) {
      const r = this.levels[level - 1].radius;
      const mass = r * r;
      const body = { id: ++this.sequence, level, r, x: clamp(x, this.left + r, this.right - r), y: Math.min(y, this.floor - r), vx: motion.vx || 0, vy: motion.vy || 0, angle: motion.angle || 0, omega: motion.omega || 0, invMass: 1 / mass, invInertia: 2 / (mass * r * r), born: this.time, touched: -Infinity, danger: 0 };
      this.bodies.push(body); return body;
    }
    clear() { this.bodies.length = 0; this.time = 0; this.sequence = 0; }
    step(dt) {
      this.time += dt;
      for (const b of this.bodies) {
        b.vy += this.gravity * dt;
        b.vx *= Math.exp(-0.32 * dt); b.omega *= Math.exp(-0.6 * dt);
        b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.omega * dt;
      }
      // Merge each participant at most once in this substep. Birth cooldown
      // keeps a newly grown circle from chaining through several pairs at once.
      const consumed = new Set(); const merges = [];
      for (let i = 0; i < this.bodies.length; i++) {
        const a = this.bodies[i];
        if (consumed.has(a.id) || this.time - a.born < 0.12) continue;
        for (let j = i + 1; j < this.bodies.length; j++) {
          const b = this.bodies[j];
          if (consumed.has(b.id) || a.level !== b.level || a.level >= this.levels.length || this.time - b.born < 0.12) continue;
          if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= (a.r + b.r + 0.5) ** 2) {
            consumed.add(a.id); consumed.add(b.id); merges.push([a, b]); break;
          }
        }
      }
      if (merges.length) {
        this.bodies = this.bodies.filter(b => !consumed.has(b.id));
        for (const [a, b] of merges) {
          const c = this.add(a.level + 1, (a.x + b.x) / 2, (a.y + b.y) / 2, { vx: (a.vx + b.vx) * 0.4, vy: (a.vy + b.vy) * 0.35 - 40, omega: (a.omega + b.omega) / 2, angle: (a.angle + b.angle) / 2 });
          this.onMerge(c, this.levels[c.level - 1].points);
        }
      }
      for (let iteration = 0; iteration < 7; iteration++) {
        for (let i = 0; i < this.bodies.length; i++) {
          const a = this.bodies[i];
          for (let j = i + 1; j < this.bodies.length; j++) this.collide(a, this.bodies[j]);
          this.boundaries(a);
        }
      }
      for (const b of this.bodies) { b.vx = clamp(b.vx, -950, 950); b.vy = clamp(b.vy, -950, 1200); b.omega = clamp(b.omega, -15, 15); }
    }
    collide(a, b) {
      let dx = b.x - a.x, dy = b.y - a.y;
      const radii = a.r + b.r, distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > (radii + 0.15) ** 2) return;
      let d = Math.sqrt(distanceSquared);
      if (d < 0.001) { dx = a.id < b.id ? 1 : -1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d, total = a.invMass + b.invMass;
      const correction = Math.max(radii - d - 0.03, 0) * 0.8 / total;
      a.x -= nx * correction * a.invMass; a.y -= ny * correction * a.invMass;
      b.x += nx * correction * b.invMass; b.y += ny * correction * b.invMass;
      a.touched = b.touched = this.time;
      const relativeNormal = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relativeNormal >= 0) return;
      const restitution = relativeNormal < -90 ? 0.18 : 0;
      const impulse = -(1 + restitution) * relativeNormal / total;
      a.vx -= impulse * nx * a.invMass; a.vy -= impulse * ny * a.invMass;
      b.vx += impulse * nx * b.invMass; b.vy += impulse * ny * b.invMass;
      const tx = -ny, ty = nx;
      const tangentSpeed = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.omega * b.r - a.omega * a.r;
      const friction = clamp(-tangentSpeed / (total + a.r * a.r * a.invInertia + b.r * b.r * b.invInertia), -impulse * 0.42, impulse * 0.42);
      a.vx -= friction * tx * a.invMass; a.vy -= friction * ty * a.invMass;
      b.vx += friction * tx * b.invMass; b.vy += friction * ty * b.invMass;
      a.omega -= a.r * friction * a.invInertia; b.omega -= b.r * friction * b.invInertia;
    }
    boundaries(b) {
      if (b.x < this.left + b.r) { b.x = this.left + b.r; if (b.vx < 0) b.vx *= -0.24; }
      if (b.x > this.right - b.r) { b.x = this.right - b.r; if (b.vx > 0) b.vx *= -0.24; }
      if (b.y >= this.floor - b.r - 0.1) {
        b.y = Math.min(b.y, this.floor - b.r); b.touched = this.time;
        if (b.vy > 0) {
          const impact = b.vy; b.vy = impact > 90 ? -impact * 0.16 : 0;
          const slip = b.vx - b.omega * b.r;
          const impulse = clamp(-slip / (b.invMass + b.r * b.r * b.invInertia), -impact * 0.48 / b.invMass, impact * 0.48 / b.invMass);
          b.vx += impulse * b.invMass; b.omega -= b.r * impulse * b.invInertia;
        }
      }
    }
    checkOverflow(dt, line = 100) {
      let maximum = 0;
      for (const b of this.bodies) {
        // Only an older circle supported by the pile/floor can lose the game.
        // Falling through the warning line is normal play, with no penalty.
        const supported = this.time - b.touched < 0.12 && Math.abs(b.vy) < 80;
        const over = b.y - b.r < line && this.time - b.born > 1 && supported;
        b.danger = over ? b.danger + dt : 0;
        maximum = Math.max(maximum, b.danger);
      }
      return { lost: maximum >= 2, progress: clamp(maximum / 2, 0, 1) };
    }
  }
  window.LuluPhysics = { PhysicsWorld, clamp };
})();
