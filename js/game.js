(() => {
  'use strict';
  const { levels, draw } = window.NailongAssets;
  const { PhysicsWorld, clamp } = window.NailongPhysics;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  if (!ctx) { $('control-text').textContent = '浏览器不支持 Canvas，请更新后再试'; return; }
  const WIDTH = 420, HEIGHT = 600, LINE = 100, STEP = 1 / 120;
  const SAVE_KEY = 'bignainai.best.v1';
  let score = 0, best = 0, highest = 1, current = 1, next = 1, aimX = 210;
  let state = 'loading', cooldown = 0, accumulator = 0, lastTime = 0, overflow = 0;
  let particles = [], labels = [], celebration = 0, toastUntil = 0;
  let soundEnabled = false, audio = null, touching = false, activePointer = null, pointerStart = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { best = Math.max(0, Math.floor(Number(localStorage.getItem(SAVE_KEY)) || 0)); if (!Number.isFinite(best)) best = 0; } catch (_) { /* Private browsing may disable storage. */ }
  const world = new PhysicsWorld({ width: WIDTH, height: HEIGHT, levels, onMerge });
  function saveBest() {
    if (score <= best) return;
    best = score;
    try { localStorage.setItem(SAVE_KEY, String(best)); } catch (_) { /* Playing remains available. */ }
  }
  function updateScores() { $('score').textContent = score; $('best').textContent = best; }
  function randomLevel() {
    // Small drops keep the full chain earned through merges.
    const n = Math.random(); return n < 0.4 ? 1 : n < 0.7 ? 2 : n < 0.9 ? 3 : 4;
  }
  function updateNext() {
    $('next').src = levels[next - 1].src; $('next').alt = `下一只：${levels[next - 1].name}`;
    $('next-name').textContent = levels[next - 1].name;
  }
  function updateEvolution() {
    document.querySelectorAll('.evolution-item').forEach((el, i) => {
      el.classList.toggle('unlocked', i < highest); el.classList.toggle('current', i + 1 === highest);
    });
  }
  function showToast(message, seconds = 2.4) {
    $('toast').textContent = message; $('toast').hidden = false; toastUntil = world.time + seconds;
  }
  function sound(frequency, length, type = 'sine') {
    if (!soundEnabled) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type; osc.frequency.setValueAtTime(frequency, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, audio.currentTime + length);
      gain.gain.setValueAtTime(0.055, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + length);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) { /* Audio is optional, including when browser policy blocks it. */ }
  }
  function onMerge(body, points) {
    score += points; saveBest(); updateScores(); sound(330 + body.level * 75, 0.16);
    labels.push({ x: body.x, y: body.y - body.r * 0.5, text: `+${points}`, life: 0.85 });
    if (!reducedMotion) {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 125;
        particles.push({ x: body.x, y: body.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50, size: 2 + Math.random() * 3, color: i % 2 ? '#e7bf50' : '#97b987', life: 0.5 + Math.random() * 0.3 });
      }
    }
    if (body.level > highest) {
      highest = body.level; updateEvolution();
      if (highest === levels.length) { celebration = 2.5; showToast('✦ 超级奶龙诞生！继续挑战高分吧', 4); sound(880, 0.5, 'triangle'); }
      else if (highest >= 6) showToast(`解锁 ${levels[highest - 1].name}！`);
    }
  }
  function restart() {
    world.clear(); score = 0; highest = 1; aimX = WIDTH / 2; current = randomLevel(); next = randomLevel();
    state = 'playing'; cooldown = 0; overflow = 0; particles = []; labels = []; celebration = 0;
    touching = false; activePointer = null; pointerStart = null; accumulator = 0; lastTime = performance.now();
    $('game-over').hidden = true; $('toast').hidden = true; toastUntil = 0;
    canvas.removeAttribute('aria-hidden'); canvas.tabIndex = 0;
    updateScores(); updateNext(); updateEvolution();
  }
  function finish() {
    if (state !== 'playing') return;
    state = 'over'; touching = false; activePointer = null; pointerStart = null; saveBest(); updateScores();
    $('final-score').textContent = score; $('final-best').textContent = best;
    $('result-dragon').src = levels[highest - 1].src;
    $('result-message').textContent = highest === levels.length ? '超级奶龙已达成！再挑战一次你的纪录吧' : `这一局，你合成了${levels[highest - 1].name}`;
    $('result-title').textContent = score > 0 && score === best ? '新纪录，真有你的！' : '休息一下，再来！';
    $('game-over').hidden = false; $('toast').hidden = true;
    canvas.setAttribute('aria-hidden', 'true'); canvas.tabIndex = -1;
    $('restart').focus({ preventScroll: true }); sound(190, 0.3);
  }
  function aim(clientX) {
    const rect = canvas.getBoundingClientRect(), r = levels[current - 1].radius;
    aimX = clamp((clientX - rect.left) * WIDTH / rect.width, world.left + r, world.right - r);
  }
  function drop() {
    if (state !== 'playing' || cooldown > 0 || $('guide').open) return;
    const r = levels[current - 1].radius;
    world.add(current, clamp(aimX, world.left + r, world.right - r), 48, { vy: 25, angle: (Math.random() - 0.5) * 0.14, omega: (Math.random() - 0.5) * 1.2 });
    current = next; next = randomLevel(); updateNext(); cooldown = 0.4; sound(280, 0.075);
    aimX = clamp(aimX, world.left + levels[current - 1].radius, world.right - levels[current - 1].radius);
  }
  // Explicit Touch Events for mobile browsers; pointer handlers handle mouse/pen.
  canvas.addEventListener('touchstart', event => {
    if (state !== 'playing' || touching) return;
    event.preventDefault(); touching = true; activePointer = event.changedTouches[0].identifier;
    aim(event.changedTouches[0].clientX);
  }, { passive: false });
  canvas.addEventListener('touchmove', event => {
    if (!touching) return;
    const touch = Array.from(event.changedTouches).find(t => t.identifier === activePointer);
    if (touch) { event.preventDefault(); aim(touch.clientX); }
  }, { passive: false });
  canvas.addEventListener('touchend', event => {
    const touch = Array.from(event.changedTouches).find(t => t.identifier === activePointer);
    if (!touching || !touch) return;
    event.preventDefault(); aim(touch.clientX); touching = false; activePointer = null; drop();
  }, { passive: false });
  canvas.addEventListener('touchcancel', () => { touching = false; activePointer = null; });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' && state === 'playing') aim(event.clientX);
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.button !== 0 || state !== 'playing') return;
    pointerStart = event.pointerId; aim(event.clientX); canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch' || event.pointerId !== pointerStart) return;
    pointerStart = null; aim(event.clientX); drop();
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('lostpointercapture', () => { pointerStart = null; });
  document.addEventListener('keydown', event => {
    if ($('guide').open || event.target.closest('input, textarea')) return;
    if (event.key.toLowerCase() === 'r') { restart(); canvas.focus({ preventScroll: true }); return; }
    if (event.target.closest('button, a')) return;
    if (state !== 'playing') return;
    if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    const r = levels[current - 1].radius;
    if (event.key === 'ArrowLeft') aimX = clamp(aimX - 12, world.left + r, world.right - r);
    if (event.key === 'ArrowRight') aimX = clamp(aimX + 12, world.left + r, world.right - r);
    if (event.key === ' ' && !event.repeat) drop();
  });
  $('restart').addEventListener('click', () => { restart(); canvas.focus({ preventScroll: true }); });
  $('reset').addEventListener('click', restart);
  $('sound').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('sound').setAttribute('aria-pressed', String(soundEnabled)); $('sound').setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
    $('sound').innerHTML = soundEnabled ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
    sound(660, 0.1);
  });
  $('show-guide').addEventListener('click', () => {
    if ($('guide').open) return;
    touching = false; activePointer = null; pointerStart = null; $('guide').showModal();
  });
  $('close-guide').addEventListener('click', () => $('guide').close());
  $('guide').addEventListener('close', () => { lastTime = performance.now(); accumulator = 0; });
  // Inactive tabs and the collection dialog pause simulation (no background loss).
  document.addEventListener('visibilitychange', () => {
    touching = false; activePointer = null; pointerStart = null; accumulator = 0; lastTime = performance.now();
    if (document.hidden && audio) audio.suspend().catch(() => {});
  });
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) $('control-text').textContent = '移动瞄准 · 点击投放';
  levels.forEach((level, i) => {
    const item = document.createElement('div'); item.className = 'evolution-item'; item.title = `Lv.${level.level} ${level.name}`;
    const img = document.createElement('img'); img.src = level.src; img.alt = level.name; img.width = img.height = 33;
    const label = document.createElement('small'); label.textContent = String(level.level).padStart(2, '0'); item.append(img, label); $('evolution').append(item);
    if (i < levels.length - 1) { const arrow = document.createElement('span'); arrow.className = 'evolution-arrow'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true'); $('evolution').append(arrow); }
    const guide = document.createElement('div'); guide.className = 'guide-level';
    guide.innerHTML = `<img src="${level.src}" alt="${level.name}" width="57" height="57"><strong>${level.name}</strong><small>Lv.${level.level} · ${level.level === 1 ? '起始形态' : `合成 +${level.points} 分`}</small>`;
    $('guide-grid').append(guide);
  });
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
  resize();
  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    // Quiet dotted background, container sides and softly rounded floor.
    ctx.fillStyle = '#e8e9d9';
    for (let x = 26; x < WIDTH; x += 24) for (let y = 126; y < HEIGHT - 20; y += 24) { ctx.beginPath(); ctx.arc(x, y, 0.65, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#e4e8d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, 119); ctx.lineTo(12, HEIGHT - 28); ctx.quadraticCurveTo(12, HEIGHT - 17, 25, HEIGHT - 17); ctx.lineTo(WIDTH - 25, HEIGHT - 17); ctx.quadraticCurveTo(WIDTH - 12, HEIGHT - 17, WIDTH - 12, HEIGHT - 28); ctx.lineTo(WIDTH - 12, 119); ctx.stroke();
    ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = overflow > 0 ? '#d78669' : '#ddc9a3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(22, LINE); ctx.lineTo(WIDTH - 22, LINE); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fffdf4'; ctx.fillRect(WIDTH / 2 - 43, LINE - 7, 86, 14);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '10px "Microsoft YaHei", sans-serif'; ctx.fillStyle = overflow > 0 ? '#ba735c' : '#baa583';
    ctx.fillText(overflow > 0 ? `快满啦！${(2 * (1 - overflow)).toFixed(1)}s` : '堆高警戒线', WIDTH / 2, LINE);
    if (overflow > 0) { ctx.fillStyle = `rgba(220,130,98,${0.035 + overflow * 0.08})`; ctx.fillRect(13, 105, WIDTH - 26, HEIGHT - 123); }
    if (world.bodies.length === 0 && state === 'playing') {
      ctx.fillStyle = '#b9c1a9'; ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.fillText('让两只相同的奶龙碰个面吧', WIDTH / 2, 325);
      ctx.fillStyle = '#d8dfc8'; ctx.font = '26px sans-serif'; ctx.fillText('✦', WIDTH / 2, 292);
    }
    if (state === 'playing') {
      const r = levels[current - 1].radius;
      ctx.save(); ctx.globalAlpha = cooldown > 0 ? 0.38 : 0.8; ctx.strokeStyle = '#b8c5a4'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.moveTo(aimX, Math.max(48 + r + 8, LINE + 14)); ctx.lineTo(aimX, world.floor - r); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha = cooldown > 0 ? 0.4 : 1; draw(ctx, current, aimX, 48, r); ctx.restore();
      ctx.fillStyle = '#b4c19b'; ctx.beginPath(); ctx.moveTo(aimX - 4, 14); ctx.lineTo(aimX + 4, 14); ctx.lineTo(aimX, 19); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.13; draw(ctx, current, aimX, world.floor - r, r); ctx.restore();
    }
    for (const b of world.bodies) {
      ctx.save(); ctx.shadowColor = '#88774214'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; draw(ctx, b.level, b.x, b.y, b.r, b.angle); ctx.restore();
    }
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const label of labels) {
      ctx.globalAlpha = Math.min(1, label.life * 2); ctx.fillStyle = '#5e8550'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.strokeStyle = '#fffdf4'; ctx.lineWidth = 4;
      ctx.strokeText(label.text, label.x, label.y); ctx.fillText(label.text, label.x, label.y);
    }
    ctx.globalAlpha = 1;
    if (celebration > 0 && !reducedMotion) {
      ctx.fillStyle = '#dec97a'; ctx.font = '24px sans-serif';
      for (let i = 0; i < 8; i++) ctx.fillText('✦', 35 + i * 50, 190 + Math.sin(world.time * 3 + i) * 40);
    }
  }
  function frame(now) {
    const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.05); lastTime = now;
    if (state === 'playing' && !document.hidden && !$('guide').open) {
      accumulator += dt;
      while (accumulator >= STEP && state === 'playing') {
        world.step(STEP); cooldown = Math.max(0, cooldown - STEP);
        const result = world.checkOverflow(STEP, LINE); overflow = result.progress;
        accumulator -= STEP; if (result.lost) finish();
      }
      particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }); particles = particles.filter(p => p.life > 0).slice(-100);
      labels.forEach(l => { l.life -= dt; l.y -= 32 * dt; }); labels = labels.filter(l => l.life > 0).slice(-12);
      celebration = Math.max(0, celebration - dt);
      if (!$('toast').hidden && world.time >= toastUntil) $('toast').hidden = true;
    } else accumulator = 0;
    render(); requestAnimationFrame(frame);
  }
  updateScores();
  window.NailongAssets.ready.then(restart);
  requestAnimationFrame(frame);
})();
