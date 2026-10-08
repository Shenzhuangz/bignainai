/* Original instrumental: scheduled locally, no external music service needed. */
(() => {
  'use strict';
  class Music {
    constructor(onChange = () => {}) {
      this.enabled=true; this.started=false; this.playing=false; this.context=null;
      this.timer=null; this.voices=new Set(); this.revision=0; this.onChange=onChange;
    }
    async play() {
      if (!this.enabled || this.playing) return;
      const revision=++this.revision;
      try {
        if (!this.context) {
          this.context=new (window.AudioContext || window.webkitAudioContext)();
          this.master=this.context.createGain(); this.master.gain.value=.14; this.master.connect(this.context.destination);
          this.noise=this.context.createBuffer(1,this.context.sampleRate*.2,this.context.sampleRate);
          const data=this.noise.getChannelData(0); let seed=7341;
          for(let i=0;i<data.length;i++) { seed=(seed*1664525+1013904223)>>>0; data[i]=seed/2147483648-1; }
        }
        await this.context.resume();
        if (revision!==this.revision || !this.enabled) return;
        this.playing=true; this.started=true; this.tick=0; this.next=this.context.currentTime+.04;
        this.schedule(); this.timer=setInterval(() => this.schedule(),25); this.onChange(this);
      } catch (_) { this.playing=false; this.onChange(this); }
    }
    pause() {
      this.revision++; clearInterval(this.timer); this.timer=null; this.playing=false;
      for(const voice of this.voices) { try { voice.stop(); } catch (_) {} }
      this.onChange(this);
    }
    toggle() { this.enabled=!this.enabled; if(this.enabled) return this.play(); this.pause(); }
    attach(source,gain) {
      source.connect(gain); gain.connect(this.master); this.voices.add(source);
      source.onended=() => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
    }
    tone(note,time,duration,volume,type='triangle') {
      const osc=this.context.createOscillator(), gain=this.context.createGain(); osc.type=type;
      osc.frequency.value=440*Math.pow(2,(note-69)/12);
      gain.gain.setValueAtTime(.0001,time); gain.gain.exponentialRampToValueAtTime(volume,time+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      this.attach(osc,gain); osc.start(time); osc.stop(time+duration+.02);
    }
    drum(time,kick) {
      const gain=this.context.createGain();
      if(kick) {
        const osc=this.context.createOscillator(); osc.frequency.setValueAtTime(125,time); osc.frequency.exponentialRampToValueAtTime(42,time+.18);
        gain.gain.setValueAtTime(.65,time); gain.gain.exponentialRampToValueAtTime(.0001,time+.2);
        this.attach(osc,gain); osc.start(time); osc.stop(time+.21);
      } else {
        const source=this.context.createBufferSource(); source.buffer=this.noise;
        gain.gain.setValueAtTime(.07,time); gain.gain.exponentialRampToValueAtTime(.0001,time+.07);
        this.attach(source,gain); source.start(time); source.stop(time+.08);
      }
    }
    schedule() {
      if(!this.playing) return;
      const eighth=60/96/2;
      // Four original bars: Cmaj7, Fmaj7, Am7, G6. A soft music-box lead over a relaxed beat.
      const chords=[[48,52,55,59],[53,57,60,64],[57,60,64,67],[55,59,62,64]];
      const melody=[72,null,76,null,79,76,null,74,72,null,69,72,77,null,76,null,76,null,72,69,72,null,76,null,74,null,71,null,74,76,74,null];
      // A suspended audio clock may lag; skip stale events instead of queuing a burst.
      if(this.next<this.context.currentTime) this.next=this.context.currentTime+.02;
      while(this.next<this.context.currentTime+.15) {
        const tick=this.tick%32, chord=chords[Math.floor(tick/8)], time=this.next;
        if(tick%8===0) chord.forEach(n => this.tone(n,time,eighth*7.5,.11,'sine'));
        if(tick%4===0) { this.tone(chord[0]-12,time,eighth*1.7,.4,'sine'); this.drum(time,true); }
        if(tick%2===1) this.drum(time,false);
        if(melody[tick]!==null) this.tone(melody[tick],time,eighth*1.55,.22);
        this.tick++; this.next+=eighth;
      }
    }
  }
  window.LuluAudio={Music};
})();
