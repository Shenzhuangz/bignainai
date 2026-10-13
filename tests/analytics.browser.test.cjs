/* Optional real-browser checks for best-effort anonymous reporting. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=new URL(process.env.GAME_URL||'http://127.0.0.1:8010/');
url.searchParams.set('analytics_test','1');
const endpoint=process.env.ANALYTICS_ENDPOINT||'http://127.0.0.1:8020';
async function merge(page) {
  const box=await page.locator('#game').boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+50);await page.waitForTimeout(650);
  await page.mouse.click(box.x+box.width/2,box.y+50);
  await page.waitForFunction(()=>Number(document.querySelector('#score').textContent)===4);
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(endpoint=>{Math.random=()=>.2;window.LuluAnalyticsConfig={endpoint,isTest:true};},endpoint);
    const page=await context.newPage(),events=[],visits=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{
      if(request.url().endsWith('/api/visit'))visits.push(JSON.parse(request.postData()));
      if(request.url().endsWith('/api/events'))events.push(...JSON.parse(request.postData()).events);
    });
    await page.goto(url.href);await page.waitForFunction(()=>LuluAnalytics.getStatus().ready&&LuluAssets.levels.every(l=>l.image));
    assert.equal(await page.evaluate(()=>LuluAnalytics.getStatus().active),false);
    assert.equal(visits.length,1);assert.equal(visits[0].isTest,true);
    await merge(page);await page.evaluate(()=>LuluAnalytics.flush());
    await page.waitForFunction(()=>LuluAnalytics.getStatus().pending===0);
    assert.ok(events.some(e=>e.score===4&&e.highest===2&&e.drops===2&&e.merges===1));
    const roundId=events[0].roundId;assert.ok(events.every(e=>e.roundId===roundId));
    await page.locator('#reset').click();await page.waitForFunction(()=>LuluAnalytics.getStatus().pending===0);
    assert.equal(events.at(-1).outcome,'restart');assert.equal(events.at(-1).score,4);
    console.log('PASS actual drops/merge → signed reporting, effective time, restart outcome');
    await page.locator('#analytics-toggle').click();const beforeEvents=events.length,beforeVisits=visits.length;
    await merge(page);await page.evaluate(()=>LuluAnalytics.flush());
    assert.equal(events.length,beforeEvents);assert.equal(await page.evaluate(()=>LuluAnalytics.getStatus().enabled),false);
    await page.reload();await page.waitForFunction(()=>window.LuluAnalytics);
    assert.equal(visits.length,beforeVisits);assert.equal(await page.evaluate(()=>LuluAnalytics.getStatus().enabled),false);
    console.log('PASS opt-out stops collection and survives reload; gameplay still works');
    const offline=await browser.newContext();
    await offline.addInitScript(endpoint=>{Math.random=()=>.2;window.LuluAnalyticsConfig={endpoint,isTest:true};},endpoint);
    await offline.route('**/api/visit',route=>route.abort());
    const safe=await offline.newPage();safe.on('pageerror',error=>errors.push(error.message));
    await safe.goto(url.href);await safe.waitForFunction(()=>LuluAssets.levels.every(l=>l.image));await merge(safe);
    assert.equal(await safe.locator('#score').textContent(),'4');
    console.log('PASS unreachable statistics service never prevents playing');
    const privacy=await browser.newContext();
    await privacy.addInitScript(endpoint=>{Math.random=()=>.2;window.LuluAnalyticsConfig={endpoint,isTest:true};Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});},endpoint);
    const privatePage=await privacy.newPage();privatePage.on('pageerror',error=>errors.push(error.message));
    await privatePage.goto(url.href);await privatePage.waitForFunction(()=>LuluAssets.levels.every(l=>l.image));
    assert.equal(await privatePage.evaluate(()=>LuluAnalytics.getStatus().enabled),false);assert.equal(await privatePage.locator('#analytics-toggle').isDisabled(),true);await merge(privatePage);
    assert.equal(await privatePage.locator('#score').textContent(),'4');
    console.log('PASS browser Do Not Track is respected without changing the game');
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
