'use strict';
/* Local Web Audio. Layered transient/body/mechanism/tail for the weapon;
 * stereo distance cues, filtered sand, and an independently controlled seismic bus. */
(function(S){
  S.Sound=class{
    constructor(){this.ctx=null;this.master=null;this.volume=.6;this.buffers={};this.nextMotif=12;this.paused=false;this.warning=0;}
    async start(){
      try{
        if(!this.ctx){
          const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
          this.master=c.createGain();this.master.gain.value=this.volume;
          const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.16;this.master.connect(limiter);limiter.connect(c.destination);this.limiter=limiter;
          const n=c.sampleRate*4,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0),rnd=S.rng(212);let low=0;
          for(let i=0;i<n;i++){low=low*.975+(rnd()*2-1)*.025;d[i]=low*2.3;}
          const wind=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();wind.buffer=b;wind.loop=true;f.type='lowpass';f.frequency.value=520;a.gain.value=.21;wind.connect(f);f.connect(a);a.connect(this.master);wind.start();this.wind=wind;this.windGain=a;
          this.rumbleGain=c.createGain();this.rumbleGain.gain.value=0;this.rumbleGain.connect(this.master);
          for(const [freq,gain,bus] of [[43.65,.009,this.master],[65.4,.005,this.master],[27,.28,this.rumbleGain],[40.5,.075,this.rumbleGain]]){const o=c.createOscillator(),v=c.createGain();o.frequency.value=freq;v.gain.value=gain;o.connect(v);v.connect(bus);o.start();}
          const grit=c.createBufferSource(),gf=c.createBiquadFilter(),gg=c.createGain();grit.buffer=b;grit.loop=true;gf.type='lowpass';gf.frequency.value=160;gg.gain.value=1.8;grit.connect(gf);gf.connect(gg);gg.connect(this.rumbleGain);grit.start();
        }
        await this.ctx.resume();
      }catch(e){console.warn('Audio unavailable; silent play remains supported.',e.message);}
    }
    setVolume(v){this.volume=S.clamp(v,0,1);if(this.master)this.master.gain.setTargetAtTime(this.volume*(this.paused?.12:1),this.ctx.currentTime,.03);}
    setPaused(p){this.paused=p;this.setVolume(this.volume);if(p&&this.rumbleGain)this.rumbleGain.gain.setTargetAtTime(0,this.ctx.currentTime,.08);}
    connectStereo(source,pan=0){if(this.ctx.createStereoPanner){const p=this.ctx.createStereoPanner();p.pan.value=S.clamp(pan,-1,1);source.connect(p);p.connect(this.master);return p;}source.connect(this.master);return null;}
    tone(freq,duration=.1,volume=.1,end=freq,type='sine',pan=0,delay=0){
      if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(end,10),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);const p=this.connectStereo(g,pan);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};
    }
    noise(duration=.12,volume=.2,frequency=1600,pan=0,delay=0,type='lowpass'){
      if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,n=Math.ceil(c.sampleRate*duration),key=String(duration);let b=this.buffers[key];
      if(!b){b=c.createBuffer(1,n,c.sampleRate);const a=b.getChannelData(0),rnd=S.rng(n+21);for(let i=0;i<n;i++)a[i]=rnd()*2-1;this.buffers[key]=b;}
      const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),t=c.currentTime+delay;s.buffer=b;f.type=type;f.frequency.value=frequency;f.Q.value=.7;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);const p=this.connectStereo(g,pan);s.start(t);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();p?.disconnect();};
    }
    shot(){this.noise(.065,.39,4200);this.noise(.21,.12,1050);this.tone(156,.18,.24,39);this.tone(1700,.023,.045,420,'triangle');this.noise(.14,.035,1700,-.35,.08);this.noise(.14,.022,1000,.4,.16);}
    enemyShot(pos,player){let pan=0,gain=1;if(pos&&player){const dx=pos.x-player.pos.x,dz=pos.z-player.pos.z,dist=Math.hypot(dx,dz);pan=(dx*Math.cos(player.yaw)-dz*Math.sin(player.yaw))/Math.max(dist,.1);gain=S.clamp(14/Math.max(dist,8),.14,.8);}this.noise(.13,.15*gain,2300,pan);this.tone(110,.12,.09*gain,45,'sine',pan);}
    step(){this.noise(.18,.105,850);this.noise(.055,.04,1800);}
    reload(stage='seat'){if(stage==='out'){this.noise(.048,.11,2300);this.tone(310,.07,.045,160,'triangle');}else{this.noise(.085,.11,3200);this.tone(570,.06,.055,180,'triangle');}}
    hit(){this.tone(1150,.036,.045,680,'triangle');}
    kill(){this.tone(640,.11,.055,200,'triangle');}
    hurt(){this.noise(.16,.13,500);this.tone(68,.20,.13,30);}
    complete(){this.tone(220,1.1,.05);this.tone(329.6,1.1,.035);this.tone(440,1.1,.025);}
    seismicPulse(){this.tone(38,.85,.15,21);this.noise(.65,.15,125,.55);}
    update(game,dt){
      if(!this.ctx||this.ctx.state!=='running')return;
      const active=game.state==='playing',intensity=active?(game.worm?.intensity||0):0;
      this.rumbleGain.gain.setTargetAtTime(intensity*.65,this.ctx.currentTime,.1);this.windGain.gain.setTargetAtTime(.17+intensity*.14,this.ctx.currentTime,.4);
      // Sparse original two-tone tension pulses. No soundtrack recording.
      if(active&&game.playTime>this.nextMotif){this.nextMotif=game.playTime+9;const danger=game.enemies.some(e=>e.active&&e.alive&&e.state==='aim');if(danger){this.tone(87.3,1.1,.011,87.3,'triangle',-.2);this.tone(92.5,1.3,.007,92.5,'sine',.2,.4);}}
    }
  };
})(window.Spice);
