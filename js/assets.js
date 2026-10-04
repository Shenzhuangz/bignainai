/* Replace sprite URLs here; physics radii are independent of source resolution. */
(() => {
  'use strict';
  const names = ['小奶龙', '呆萌奶龙', '惊讶奶龙', '调皮奶龙', '喝奶奶龙', '甜心奶龙', '金箍奶龙', '派对奶龙', '太空奶龙', '皇冠奶龙', '超级奶龙'];
  const radii = [17, 22, 28, 35, 43, 52, 62, 74, 87, 102, 119];
  const colors = ['#fff1ab', '#f7e7a0', '#ffe9aa', '#ffdd91', '#ffdaa0', '#f5d4b0', '#f7d388', '#e7dfad', '#cde4d5', '#e2daab', '#e4d0a0'];
  const points = [0, 4, 10, 20, 36, 60, 100, 160, 260, 420, 800];
  const levels = names.map((name, index) => ({ level: index + 1, name, radius: radii[index], color: colors[index], points: points[index], src: `assets/nailong/level${index + 1}.svg`, image: null }));
  const ready = Promise.all(levels.map(level => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { level.image = img; resolve(); };
    // A missing or invalid replacement must never prevent starting the game.
    img.onerror = () => { level.image = null; resolve(); };
    img.src = level.src;
  })));
  function draw(ctx, levelNumber, x, y, radius, angle = 0) {
    const level = levels[levelNumber - 1];
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    if (level.image) ctx.drawImage(level.image, -radius, -radius, radius * 2, radius * 2);
    else {
      ctx.fillStyle = level.color; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#665129'; ctx.font = `bold ${radius}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(levelNumber), 0, 1);
    }
    ctx.restore();
  }
  window.NailongAssets = { levels, ready, draw };
})();
