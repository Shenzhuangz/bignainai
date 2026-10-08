const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const root = path.join(__dirname, '..');
const sandbox = { window: {}, Image: class {} }; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/assets.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/physics.js'), 'utf8'), sandbox);
const levels = sandbox.window.LuluAssets.levels;
const { PhysicsWorld } = sandbox.window.LuluPhysics;
const dt = 1 / 120;
const advance = (w, seconds) => { for (let i = 0; i < seconds * 120; i++) w.step(dt); };
const tests = [];
function test(name, fn) { fn(); tests.push(name); console.log(`PASS ${name}`); }
test('11 increasing levels with unique sprites, sizes and merge scores', () => {
  assert.equal(levels.length, 11); assert.equal(new Set(levels.map(l => l.src)).size, 11);
  for (let i = 0; i < levels.length; i++) {
    assert.ok(fs.existsSync(path.join(root, levels[i].src)));
    if (i) { assert.ok(levels[i].radius > levels[i-1].radius); assert.ok(levels[i].points > levels[i-1].points); }
  }
});
test('gravity accelerates, floor bounces and settles without escaping', () => {
  const w = new PhysicsWorld({ levels }); const b = w.add(1, 210, 48);
  advance(w, 0.3); assert.ok(b.y > 48 && b.vy > 250);
  let bounced = false;
  for (let i = 0; i < 900; i++) { w.step(dt); if (b.vy < -20) bounced = true; assert.ok(b.y <= w.floor - b.r + 0.001); }
  assert.ok(bounced); assert.ok(Math.abs(b.vy) < 1);
});
test('equal collision merges once and reports score of new level', () => {
  let earned = 0, events = 0; const w = new PhysicsWorld({ levels, onMerge: (_, p) => { earned += p; events++; } });
  w.add(1, 190, 540); w.add(1, 220, 540); advance(w, 0.4);
  assert.equal(w.bodies.length, 1); assert.equal(w.bodies[0].level, 2); assert.equal(events, 1); assert.equal(earned, 4);
});
test('three overlapping equal circles never consume one circle twice', () => {
  const w = new PhysicsWorld({ levels }); w.time = 2;
  for (const x of [180, 195, 210]) { const b = w.add(1, x, 530); b.born = 0; }
  w.step(dt); assert.equal(w.bodies.length, 2); assert.deepEqual(Array.from(w.bodies, b => b.level).sort(), [1, 2]);
});
test('all ten merges are reachable; maximum level remains finite', () => {
  for (let level = 1; level < 11; level++) {
    const w = new PhysicsWorld({ levels }); w.time = 2; const r = levels[level - 1].radius;
    for (const x of [210 - r * 0.8, 210 + r * 0.8]) { const b = w.add(level, x, 360); b.born = 0; }
    w.step(dt); assert.equal(w.bodies.length, 1); assert.equal(w.bodies[0].level, level + 1);
  }
  const w = new PhysicsWorld({ levels }); w.add(11, 150, 380); w.add(11, 270, 380); advance(w, 3);
  assert.equal(w.bodies.length, 2); assert.ok(w.bodies.every(b => Number.isFinite(b.x) && Number.isFinite(b.y)));
});
test('unequal circles separate, wall reflects, friction produces rotation', () => {
  const w = new PhysicsWorld({ levels }); const a = w.add(1, 30, 540, { vx: -250 }); const b = w.add(2, 57, 539);
  advance(w, 2); assert.equal(w.bodies.length, 2); assert.ok(a.x >= w.left + a.r); assert.ok(Math.hypot(a.x-b.x, a.y-b.y) > a.r+b.r-1);
  const r = new PhysicsWorld({ levels }); const c = r.add(3, 200, r.floor-28, { vx: 180, vy: 20 }); advance(r, .5);
  assert.ok(Math.abs(c.omega) > .1); assert.ok(Math.abs(c.angle) > .01); assert.ok(Math.abs(c.vx) < 180);
});
test('fresh falling circles do not lose; supported overflow loses after two seconds', () => {
  const w = new PhysicsWorld({ levels }); const b = w.add(1, 210, 48);
  for (let i = 0; i < 240; i++) { w.step(dt); assert.equal(w.checkOverflow(dt).lost, false); }
  w.time = 5; b.born = 0; b.y = 90; b.vy = 0; let lost = false;
  for (let i = 0; i < 245; i++) { w.time += dt; b.touched = w.time; lost = w.checkOverflow(dt).lost; }
  assert.equal(lost, true);
  b.y = 130; assert.equal(w.checkOverflow(dt).progress, 0);
});
test('fixed seed crowded pile stays bounded and restart clears state', () => {
  let seed = 47; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const w = new PhysicsWorld({ levels });
  for (let i = 0; i < 100; i++) {
    w.add(1 + Math.floor(rand() * 4), 25 + rand() * 370, 48, { vx: (rand()-.5)*90 }); advance(w, .42);
    assert.ok(w.bodies.every(b => Number.isFinite(b.x) && Number.isFinite(b.vy) && b.x >= w.left+b.r-.01 && b.x <= w.right-b.r+.01 && b.y <= w.floor-b.r+.01));
  }
  w.clear(); assert.equal(w.bodies.length, 0); assert.equal(w.time, 0);
});
const benchmark = new PhysicsWorld({ levels });
for (let i = 0; i < 65; i++) benchmark.add(1 + i % 4, 30 + (i % 10) * 36, 130 + Math.floor(i / 10) * 50);
const started = performance.now(); advance(benchmark, 5);
console.log(`Crowded-pile benchmark: ${(performance.now()-started).toFixed(0)} ms for 5 simulated seconds.`);
console.log(`${tests.length} physics checks passed.`);
