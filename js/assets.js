/* Original photos stay intact; each portrait is cropped and cached once in Canvas. */
(() => {
  'use strict';
  const names = ['小奶龙', '敬礼奶龙', '蝴蝶结奶龙', '潮搭龙', '探险龙', '画画龙', '航海龙', '摩登龙', '飞行龙', '雨衣龙', '超级奶龙'];
  const radii = [21, 27, 34, 42, 50, 59, 69, 81, 94, 108, 123];
  const colors = ['#ffbd36', '#f2933a', '#f18eb8', '#40bdde', '#46956c', '#ed6161', '#876bc9', '#bd70cf', '#469ee9', '#88bb35', '#efb52d'];
  const points = [0, 4, 10, 20, 36, 60, 100, 160, 260, 420, 800];
  const files = ['btn_nl.png', 'salute.png', 'bow.png', ...Array.from({length:7}, (_,i) => `series1_card_${i+2}.png`), 'image_nailoong.png'];
  const crops = [null, null, null, [600,150,470,470], [280,200,500,500], [790,250,470,470], [580,200,550,550], [510,230,510,510], [490,220,550,550], [465,80,680,680], null];
  const levels = names.map((name,i) => ({level:i+1,name,radius:radii[i],color:colors[i],points:points[i],src:`assets/nailong/internal/${files[i]}`,crop:crops[i],image:null,texture:null}));
  function cache(level) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = level.color; ctx.fillRect(0,0,384,384);
    const img = level.image, side = Math.min(img.naturalWidth,img.naturalHeight);
    const [x,y,w,h] = level.crop || [(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side];
    ctx.drawImage(img,x,y,w,h,0,0,384,384); level.texture = canvas;
  }
  const ready = Promise.all(levels.map(level => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { level.image=img; cache(level); resolve(); };
    img.onerror = () => resolve(); img.src = level.src;
  })));
  function draw(ctx, number, x, y, radius, angle=0) {
    const level = levels[number-1];
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.clip();
    if (level.texture) ctx.drawImage(level.texture,-radius,-radius,radius*2,radius*2);
    else {
      ctx.fillStyle=level.color; ctx.fillRect(-radius,-radius,radius*2,radius*2);
      ctx.fillStyle='#fff8d0'; ctx.beginPath(); ctx.ellipse(0,radius*.25,radius*.6,radius*.5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#314036'; for(const dx of [-.28,.28]) { ctx.beginPath(); ctx.arc(radius*dx,-radius*.1,radius*.09,0,Math.PI*2); ctx.fill(); }
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle=level.color; ctx.lineWidth=Math.max(2,radius*.06); ctx.beginPath(); ctx.arc(x,y,radius-ctx.lineWidth/2,0,Math.PI*2); ctx.stroke();
    // Badges stay upright even while the character tumbles.
    const badge=Math.max(8,radius*.18), bx=x+radius*.62, by=y+radius*.62;
    ctx.fillStyle='#fffef6'; ctx.beginPath(); ctx.arc(bx,by,badge+1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#263e37'; ctx.font=`800 ${Math.max(10,badge*1.25)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(number,bx,by+.5); ctx.restore();
  }
  function preview(canvas, number) {
    const ctx=canvas.getContext('2d'), side=canvas.width;
    ctx.clearRect(0,0,side,canvas.height); draw(ctx,number,side/2,side/2,side*.43);
    canvas.setAttribute('aria-label',levels[number-1].name);
  }
  window.NailongAssets = {levels,ready,draw,preview};
})();
