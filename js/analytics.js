/* Anonymous, best-effort reporting. No request can block the game loop. */
(() => {
  'use strict';
  const DEFAULT_ENDPOINT='https://houxi-lulu-stats-sanshui.fizzy-flute-2949.chatgpt.site';
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const config=window.LuluAnalyticsConfig||{};
  const endpoint=local&&config.endpoint?config.endpoint.replace(/\/$/,''):DEFAULT_ENDPOINT;
  const isTest=new URLSearchParams(location.search).has('analytics_test')||(local&&config.isTest===true);
  const OPT_OUT='lulu.analytics.disabled.v1',VISITOR='lulu.analytics.visitor.v1';
  const id=()=>{if(crypto.randomUUID)return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');};
  const read=key=>{try{return localStorage.getItem(key);}catch(_){return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch(_){}};
  const privacySignal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  let enabled=!privacySignal&&read(OPT_OUT)!=='1',visitorId=read(VISITOR);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId||'')){visitorId=id();write(VISITOR,visitorId);}
  const visitId=id(),pending=new Map();
  let session=null,active=null,opening=null,sending=false,networkOK=true,retryAfter=0;
  const button=document.getElementById('analytics-toggle'),label=document.getElementById('analytics-status');
  function render() {
    if(label)label.textContent=enabled?(networkOK?'仅匿名记录访问与对局':'统计暂未连接，游戏可照常玩'):'匿名统计已关闭';
    if(button){button.textContent=enabled?'关闭统计':'开启统计';button.setAttribute('aria-pressed',String(enabled));button.disabled=privacySignal;if(privacySignal)button.title='已遵循浏览器隐私设置';}
  }
  async function post(path,payload,keepalive=false) {
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetch(endpoint+path,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
        headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),keepalive,signal:controller.signal});
      if(!response.ok){const error=new Error('Statistics request failed');error.status=response.status;throw error;}
      return await response.json();
    } finally {clearTimeout(timeout);}
  }
  async function open() {
    if(!enabled||session||opening||Date.now()<retryAfter)return opening;
    opening=(async()=>{
      try {
        const result=await post('/api/visit',{visitId,visitorId,device:matchMedia('(pointer:coarse)').matches?'mobile':'desktop',
          version:document.body.dataset.version||'unknown',isTest});
        if(enabled){session=result;networkOK=true;retryAfter=0;}
      } catch(_){networkOK=false;retryAfter=Date.now()+15000;}
      finally {opening=null;render();}
    })();return opening;
  }
  function snapshot(outcome='active') {
    if(!active||!enabled)return;
    const event={...active,sequence:++active.sequence,outcome,durationMs:Math.round(active.durationMs)};
    pending.set(event.roundId,event);
    while(pending.size>50)pending.delete(pending.keys().next().value);
  }
  async function flush() {
    if(!enabled||sending)return;
    await open();if(!session||!pending.size||!enabled)return;
    sending=true;const events=Array.from(pending.values()).slice(0,10);
    try {
      await post('/api/events',{visitId:session.visitId,token:session.token,events});
      for(const e of events)if(pending.get(e.roundId)?.sequence===e.sequence)pending.delete(e.roundId);
      networkOK=true;
    } catch(error) {networkOK=false;if(error.status===403){session=null;retryAfter=Date.now()+15000;}}
    finally {sending=false;render();}
  }
  function begin() {
    if(!enabled||active)return;
    active={roundId:id(),startedAt:Date.now(),score:0,highest:1,durationMs:0,drops:0,merges:0,sequence:0};
    snapshot();flush();
  }
  function update(score,highest) {if(active&&enabled){active.score=score;active.highest=highest;}}
  function finish(outcome,score,highest) {
    if(!active)return;update(score,highest);snapshot(outcome);active=null;flush();
  }
  function beacon() {
    if(!enabled||!session||!pending.size)return;
    const payload=JSON.stringify({visitId:session.visitId,token:session.token,events:Array.from(pending.values()).slice(0,10)});
    try {
      if(navigator.sendBeacon&&navigator.sendBeacon(endpoint+'/api/events',new Blob([payload],{type:'text/plain;charset=UTF-8'})))return;
      fetch(endpoint+'/api/events',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:payload,keepalive:true}).catch(()=>{});
    } catch(_){}
  }
  function setEnabled(next) {
    if(privacySignal)return;
    enabled=!!next;write(OPT_OUT,enabled?'0':'1');
    if(!enabled){active=null;pending.clear();session=null;}else{retryAfter=0;open();}
    render();
  }
  button?.addEventListener('click',()=>setEnabled(!enabled));
  setInterval(()=>{if(enabled&&!document.hidden){snapshot();flush();}},15000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){snapshot();beacon();}else flush();});
  window.addEventListener('pagehide',event=>{if(!event.persisted&&active){snapshot('abandoned');active=null;}else snapshot();beacon();});
  window.addEventListener('online',()=>{retryAfter=0;flush();});
  window.LuluAnalytics={
    begin,finish,update,
    drop(){if(active&&enabled)active.drops++;},
    merge(score,highest){update(score,highest);if(active&&enabled)active.merges++;},
    tick(dt){if(active&&enabled)active.durationMs+=dt*1000;},
    flush(){snapshot();return flush();},
    getStatus(){return {enabled,ready:!!session,pending:pending.size,active:!!active};},
    setEnabled
  };
  render();open();
})();
