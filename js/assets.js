/* Original photos stay intact; each portrait is cropped and cached once in Canvas. */
(() => {
  'use strict';
  const names = ['困困噜噜', '汽水噜噜', '西瓜噜噜', '听歌噜噜', '运动噜噜', '学霸噜噜', '睡衣噜噜', '登山噜噜', '恐龙噜噜', '蜜蜂噜噜', '皇冠噜噜'];
  const radii = [21, 27, 34, 42, 50, 59, 69, 81, 94, 108, 123];
  const colors = ['#dca354', '#df6c54', '#ea8894', '#809b9e', '#7ba461', '#ce8060', '#72b5b0', '#719ac3', '#86a875', '#dfb958', '#d79b43'];
  const points = [0, 4, 10, 20, 36, 60, 100, 160, 260, 420, 800];
  const crops = [[25,130,290,260],[35,40,325,325],[45,60,320,320],[40,65,320,320],[35,30,325,325],[40,25,330,330],[60,40,325,325],[55,25,320,320],[30,10,340,340],null,[35,10,335,335]];
  const levels = names.map((name,i) => ({level:i+1,name,radius:radii[i],color:colors[i],points:points[i],src:`assets/lulu/level${i+1}.jpeg`,crop:crops[i],image:null,texture:null}));
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
      ctx.fillStyle='#f39b35'; ctx.beginPath(); ctx.ellipse(0,radius*.2,radius*.72,radius*.47,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#8b5337'; ctx.beginPath(); ctx.ellipse(0,radius*.1,radius*.15,radius*.06,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#69422d'; for(const dx of [-.28,.28]) { ctx.beginPath(); ctx.arc(radius*dx,-radius*.1,radius*.09,0,Math.PI*2); ctx.fill(); }
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle=level.color; ctx.lineWidth=Math.max(2,radius*.06); ctx.beginPath(); ctx.arc(x,y,radius-ctx.lineWidth/2,0,Math.PI*2); ctx.stroke();
    // Badges stay upright even while the character tumbles.
    const badge=Math.max(8,radius*.18), bx=x+radius*.62, by=y+radius*.62;
    ctx.fillStyle='#fffef6'; ctx.beginPath(); ctx.arc(bx,by,badge+1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#654430'; ctx.font=`800 ${Math.max(10,badge*1.25)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(number,bx,by+.5); ctx.restore();
  }
  function preview(canvas, number) {
    const ctx=canvas.getContext('2d'), side=canvas.width;
    ctx.clearRect(0,0,side,canvas.height); draw(ctx,number,side/2,side/2,side*.43);
    canvas.setAttribute('aria-label',levels[number-1].name);
  }
  window.LuluAssets = {levels,ready,draw,preview};
})();
