/* Optional browser integration checks. Install Playwright separately, then:
   GAME_URL=http://127.0.0.1:8000 BROWSER_PATH=/path/to/chrome node tests/browser.test.cjs
   The deployed game itself needs neither Node nor Playwright. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:8000';
const out = path.join(__dirname, '../test-results'); fs.mkdirSync(out, { recursive: true });
async function captureWorld(page) {
  await page.evaluate(() => {
    const original = LuluPhysics.PhysicsWorld.prototype.add;
    LuluPhysics.PhysicsWorld.prototype.add = function (...args) { window.__testWorld = this; return original.apply(this, args); };
  });
}
async function dragTouch(page, fromX, toX, y, cancel = false) {
  const cdp = await page.context().newCDPSession(page);
  const touch = x => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(fromX) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(toX) });
  await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const errors = [], failed = [];
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addInitScript(() => { Math.random = () => 0.2; });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(base); await page.waitForFunction(() => document.querySelectorAll('.evolution-item').length === 11 && LuluAssets.levels.every(l => l.image));
    assert.equal(await page.title(),'后溪噜噜大乱斗 · Lulu Chill Club');
    assert.equal(await page.locator('body').innerText().then(t=>t.includes('奶龙')),false);
    assert.ok(await page.evaluate(()=>LuluAssets.levels.every(l=>l.src.startsWith('assets/lulu/'))));
    await page.locator('#show-guide').click(); await page.screenshot({path:path.join(out,'lulu-guide.png'),fullPage:true}); await page.keyboard.press('Escape');
    await captureWorld(page);
    const rect = await page.locator('#game').boundingBox();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + 60);
    await page.waitForFunction(() => __testWorld.time - __testWorld.bodies[0].born > 0.45);
    await page.mouse.click(rect.x + rect.width / 2, rect.y + 60);
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent) === 4);
    assert.equal(await page.locator('#best').textContent(), '4');
    assert.equal(await page.evaluate(() => __testWorld.bodies.length), 1);
    console.log('PASS desktop click → physical merge → score and best score');
    await page.waitForFunction(() => document.querySelector('#music').getAttribute('aria-pressed')==='true');
    await page.locator('#music').click();
    assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false');
    await page.locator('#music').click();
    await page.waitForFunction(() => document.querySelector('#music').getAttribute('aria-pressed')==='true');
    assert.ok(await page.evaluate(() => LuluAssets.levels.every(l=>l.texture && l.texture.width===384)));
    console.log('PASS real Web Audio starts after gesture, music toggles, portraits cached');
    await page.reload(); await page.waitForFunction(() => LuluAssets.levels.every(l => l.image));
    assert.equal(await page.locator('#best').textContent(), '4'); assert.equal(await page.locator('#score').textContent(), '0');
    await captureWorld(page); await page.locator('#game').focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => __testWorld.bodies.length), 1);
    await page.locator('#show-guide').click(); assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false'); const t = await page.evaluate(() => __testWorld.time);
    await page.waitForTimeout(400); assert.equal(await page.evaluate(() => __testWorld.time), t);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#guide').evaluate(e => e.open), false);
    await page.waitForFunction(() => document.querySelector('#music').getAttribute('aria-pressed')==='true');
    // Two independent physical merges in one substep must award the capped combo bonus.
    await page.evaluate(() => {
      __testWorld.clear(); __testWorld.time=2;
      for(const x of [80,110,290,320]) { const b=__testWorld.add(1,x,500); b.born=0; }
    });
    await page.waitForFunction(() => Number(document.querySelector('#score').textContent)===10);
    assert.equal(await page.evaluate(() => __testWorld.bodies.length),2);
    console.log('PASS persisted record, keyboard, guide pauses music and physics, 2x combo +2');
    await page.evaluate(() => {
      __testWorld.clear();
      [[6,530],[7,416],[6,302],[7,188],[6,74]].forEach(([l,y]) => __testWorld.add(l,210,y));
    });
    await page.waitForFunction(() => !document.querySelector('#game-over').hidden, { timeout: 10000 });
    await page.screenshot({ path: path.join(out, 'game-over.png'), fullPage: true });
    assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false');
    await page.locator('#restart').click(); assert.equal(await page.locator('#score').textContent(), '0'); assert.equal(await page.locator('#best').textContent(), '10');
    assert.equal(await page.locator('#game-over').evaluate(e => e.hidden), true);
    assert.equal(await page.evaluate(() => __testWorld.bodies.length), 0);
    console.log('PASS physical overflowing pile ends game; restart clears pile and retains record');
    // Populate a visual snapshot through the real input and physics pipeline.
    await page.evaluate(() => { let s=53; Math.random=()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296;}; });
    for(let i=0;i<25;i++) { await page.mouse.click(rect.x+35+(i*93)%(rect.width-70),rect.y+70); await page.waitForTimeout(425); }
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await mobile.addInitScript(() => { Math.random = () => 0.2; });
    const phone = await mobile.newPage(); phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(base); await phone.waitForFunction(() => LuluAssets.levels.every(l => l.image)); await captureWorld(phone);
    const box = await phone.locator('#game').boundingBox();
    await dragTouch(phone,box.x+box.width/2,box.x+45,box.y+80);
    assert.equal(await phone.evaluate(() => __testWorld.bodies.length),1);
    assert.ok(await phone.evaluate(() => __testWorld.bodies[0].x < 90));
    await phone.waitForFunction(() => __testWorld.time - __testWorld.bodies[0].born > 0.45); await dragTouch(phone,box.x+45,box.x+box.width-45,box.y+80,true);
    assert.equal(await phone.evaluate(() => __testWorld.bodies.length),1);
    await dragTouch(phone,box.x+box.width/2,box.x+45,box.y+80);
    await phone.waitForFunction(() => Number(document.querySelector('#score').textContent) === 4);
    assert.equal(await phone.evaluate(() => __testWorld.bodies.length),1);
    assert.equal(await phone.evaluate(() => window.scrollY),0);
    await phone.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
    console.log('PASS real touch drag/release, cancellation, no duplicate pointer drop, no page scroll');
    await phone.locator('#reset').click(); assert.equal(await phone.locator('#score').textContent(),'0');
    await phone.setViewportSize({ width: 375, height: 667 });
    await phone.waitForTimeout(100); await phone.evaluate(() => window.scrollTo(0,0));
    const shortBox = await phone.locator('#game').boundingBox();
    assert.ok(shortBox.y+shortBox.height < 667); assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const aspect = shortBox.width/shortBox.height; assert.ok(Math.abs(aspect-0.7)<0.005);
    await phone.screenshot({path:path.join(out,'mobile-small.png'),fullPage:true});
    console.log('PASS small phone: entire playfield visible, no horizontal overflow, circular aspect preserved');
    const fallback = await browser.newContext();
    await fallback.addInitScript(() => { Object.defineProperty(window,'localStorage',{get(){throw new Error('storage unavailable');}}); });
    await fallback.route('**/assets/lulu/*.jpeg', route => route.abort());
    const safe = await fallback.newPage(); safe.on('pageerror',e=>errors.push(e.message));
    await safe.goto(base); await safe.waitForTimeout(300); await captureWorld(safe); await safe.locator('#game').click();
    assert.equal(await safe.evaluate(()=>__testWorld.bodies.length),1);
    console.log('PASS missing sprite and blocked localStorage still allow playing');
    assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
    console.log('All browser checks passed; no runtime errors or missing normal assets.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
