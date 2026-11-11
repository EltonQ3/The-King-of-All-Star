'use strict';
/* Web Audio, synthesised on the device: no recordings.
 * Buses: sfx, loops (wind, harvester, ornithopter, alarm, worm), score (drone and
 * percussion that follow mission tension). Positional cues use pan and distance gain. */
(function(S){
  S.Sound=class{
    constructor(){this.ctx=null;this.volume=.7;this.buffers={};this.paused=false;this.loops={};this.tension=0;this.nextBeat=0;this.beat=0;this.lastStep=0;}
    async start(){
      try{
        if(!this.ctx){
          const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
          this.master=c.createGain();this.master.gain.value=this.volume;
          const lim=this.limiter=c.createDynamicsCompressor();lim.threshold.value=-10;lim.knee.value=10;lim.ratio.value=6;lim.attack.value=.003;lim.release.value=.18;this.master.connect(lim);lim.connect(c.destination);
          // A short generated impulse gives shots a canyon tail.
          const len=Math.floor(c.sampleRate*1.6),ir=c.createBuffer(2,len,c.sampleRate),rnd=S.rng(4242);
          for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++){const t=i/len;d[i]=(rnd()*2-1)*Math.pow(1-t,2.6)*(i<400?i/400:1)*(1+.8*Math.sin(t*37+ch));}}
          this.reverb=c.createConvolver();this.reverb.buffer=ir;this.wet=c.createGain();this.wet.gain.value=.22;this.reverb.connect(this.wet);this.wet.connect(this.master);
          this.sfx=c.createGain();this.sfx.connect(this.master);this.sfx.connect(this.reverb);
          this.score=c.createGain();this.score.gain.value=.5;this.score.connect(this.master);
          const n=c.sampleRate*4,b=this.noiseBuf=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0),r2=S.rng(212);let low=0;
          for(let i=0;i<n;i++){const w=r2()*2-1;low=low*.97+w*.03;d[i]=w*.35+low*2.2;}
          this.makeLoops();
        }
        await this.ctx.resume();
      }catch(e){console.warn('Audio unavailable; silent play remains supported.',e.message);}
    }
    get ok(){return this.ctx&&this.ctx.state==='running';}
    // Continuous beds. Each entry exposes a gain to ride and optional filter / rate handles.
    makeLoops(){
      const c=this.ctx,noise=(freq,type='lowpass',q=.7)=>{const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noiseBuf;s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=0;s.connect(f);f.connect(g);g.connect(this.master);s.start();return {src:s,filter:f,gain:g};};
      const osc=(freq,type='sine')=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=0;o.connect(g);g.connect(this.master);o.start();return {osc:o,gain:g};};
      const L=this.loops;
      L.wind=noise(420);L.gust=noise(900,'bandpass',.5);
      L.harvLow=osc(31,'sawtooth');L.harvMid=noise(170,'lowpass');L.harvGrind=noise(1400,'bandpass',2.2);
      L.wormLow=osc(24,'sine');L.wormGrit=noise(110,'lowpass');
      L.thopter=noise(260,'bandpass',.8);L.thopterLow=osc(46,'triangle');
      // Wing beat: amplitude modulation at the flap rate.
      const lfo=c.createOscillator(),lg=c.createGain();lfo.type='sine';lfo.frequency.value=13;lg.gain.value=0;lfo.connect(lg);lg.connect(L.thopter.gain.gain);lg.connect(L.thopterLow.gain.gain);lfo.start();L.thopterLfo={osc:lfo,gain:lg};
      L.alarmA=osc(196,'sawtooth');L.alarmB=osc(147,'sawtooth');
      // Score: a low pedal with two slowly beating partials and a throat-like formant.
      const voice=(freq,type,to)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=0;o.connect(g);g.connect(to);o.start();return {osc:o,gain:g};};
      const form=c.createBiquadFilter();form.type='bandpass';form.frequency.value=520;form.Q.value=5;form.connect(this.score);this.formant=form;
      L.drone1=voice(55,'sawtooth',form);L.drone2=voice(55.4,'sawtooth',form);L.drone3=voice(82.4,'triangle',this.score);L.pedal=voice(27.5,'sine',this.score);
    }
    setVolume(v){this.volume=S.clamp(v,0,1);if(this.master)this.master.gain.setTargetAtTime(this.volume*(this.paused?.1:1),this.ctx.currentTime,.03);}
    setPaused(p){this.paused=p;if(this.ctx)this.setVolume(this.volume);}
    spatial(pos,player,ref=10,min=.05){if(!pos||!player)return {pan:0,gain:1};const dx=pos.x-player.pos.x,dz=pos.z-player.pos.z,dist=Math.hypot(dx,dz);return {pan:S.clamp((dx*Math.cos(player.yaw)-dz*Math.sin(player.yaw))/Math.max(dist,.5),-1,1),gain:S.clamp(ref/Math.max(dist,ref),min,1),dist};}
    out(node,pan=0){const c=this.ctx;if(c.createStereoPanner&&pan){const p=c.createStereoPanner();p.pan.value=S.clamp(pan,-1,1);node.connect(p);p.connect(this.sfx);return p;}node.connect(this.sfx);return null;}
    tone(freq,duration=.1,volume=.1,end=freq,type='sine',pan=0,delay=0,bus=null){
      if(!this.ok)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(end,10),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+Math.min(.006,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);let p=null;if(bus)g.connect(bus);else p=this.out(g,pan);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};
    }
    noise(duration=.12,volume=.2,frequency=1600,pan=0,delay=0,type='lowpass',q=.7,sweep=0){
      if(!this.ok)return;const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),t=c.currentTime+delay;s.buffer=this.noiseBuf;s.loop=true;f.type=type;f.frequency.setValueAtTime(frequency,t);if(sweep)f.frequency.exponentialRampToValueAtTime(Math.max(40,sweep),t+duration);f.Q.value=q;
      g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);const p=this.out(g,pan);s.start(t,Math.random()*3);s.stop(t+duration+.02);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();p?.disconnect();};
    }
    // Player rifle: crack, body, mechanism, then the slap coming back off the rock.
    shot(){this.noise(.05,.5,5200,0,0,'highpass',.5);this.noise(.16,.42,1900,0,0,'lowpass',.8,300);this.tone(170,.16,.34,42);this.tone(1900,.02,.05,500,'triangle');this.tone(3100,.03,.02,1800,'square',.1,.045);this.noise(.3,.05,900,-.5,.11,'bandpass',.8);this.noise(.34,.04,700,.55,.2,'bandpass',.8);}
    dry(){this.tone(900,.03,.05,500,'square');this.noise(.03,.05,3000,0,0,'highpass');}
    enemyShot(pos,player){const s=this.spatial(pos,player,12,.12);this.noise(.06,.3*s.gain,3200,s.pan,0,'highpass',.5);this.noise(.2,.26*s.gain,1300,s.pan,0,'lowpass',.8,260);this.tone(120,.14,.16*s.gain,40,'sine',s.pan);}
    whizz(pos,player){const s=this.spatial(pos,player);this.noise(.13,.07,4200,-s.pan*.8,.02,'bandpass',6,1500);}
    step(surface=0){const r=Math.random();this.noise(.14,.085,620+r*240,(r-.5)*.3,0,'lowpass',.6,220);this.noise(.06,.035,2400+r*800,(r-.5)*.3,.012,'bandpass',1.2);}
    enemyStep(pos,player){const s=this.spatial(pos,player,5,.0);if(s.gain>.08)this.noise(.12,.06*s.gain,520,s.pan,0,'lowpass',.6,200);}
    land(){this.noise(.22,.16,480,0,0,'lowpass',.6,140);this.tone(70,.14,.1,36);}
    cloth(){this.noise(.16,.03,2600,0,0,'bandpass',.6,900);}
    reload(stage){if(stage==='out'){this.noise(.05,.12,2600,-.15,0,'bandpass',1.5);this.tone(330,.06,.05,150,'triangle',-.15);}else if(stage==='seat'){this.noise(.07,.16,3400,-.1,0,'bandpass',1.2);this.tone(560,.05,.07,170,'triangle',-.1);this.tone(120,.08,.08,60);}else{this.noise(.05,.15,4200,.15,0,'highpass');this.tone(900,.03,.05,300,'square',.15);this.noise(.06,.13,2600,.15,.07,'bandpass',1.4);}}
    casing(){this.tone(4200+Math.random()*1400,.05,.012,3000,'sine',.3);}
    hit(head){this.tone(head?1700:1150,.04,.06,head?900:650,'triangle');if(head)this.tone(2600,.07,.035,1700,'sine',0,.02);}
    kill(){this.tone(620,.12,.06,180,'triangle');this.noise(.1,.05,900,0,.03);}
    hurt(){this.noise(.16,.16,520,0,0,'lowpass',.7,160);this.tone(70,.2,.16,32);}
    ui(kind='tick'){if(kind==='tick')this.tone(880,.03,.03,880,'square');else if(kind==='ok'){this.tone(660,.09,.05,660,'triangle');this.tone(990,.16,.05,990,'triangle',0,.08);}else if(kind==='deny'){this.tone(180,.12,.07,150,'square');this.tone(170,.12,.07,140,'square',0,.14);}else this.tone(520,.05,.03,520,'sine');}
    pickup(){this.noise(.08,.1,3000,0,0,'bandpass',1.4);this.tone(440,.08,.05,660,'triangle',0,.04);this.tone(660,.12,.05,880,'triangle',0,.12);}
    gate(){this.noise(1.8,.12,180,0,0,'lowpass',.8,90);this.tone(52,1.8,.12,38,'sawtooth');this.tone(1100,.05,.04,400,'square',0,1.7);}
    shutdown(){this.tone(96,3.2,.3,18,'sawtooth');this.noise(2.6,.2,900,0,0,'lowpass',.8,60);this.tone(1200,.08,.05,300,'square',0,2.7);}
    // Score stings.
    sting(kind){
      if(!this.ok)return;const b=this.score;
      if(kind==='objective'){this.tone(55,2.4,.3,55,'sine',0,0,b);this.tone(110,1.6,.1,110,'triangle',0,.02,b);this.noise(.5,.2,160,0,0,'lowpass',.7,60);this.tone(220,1.8,.035,220,'sine',0,.25,b);this.tone(329.6,1.8,.03,329.6,'sine',0,.4,b);}
      else if(kind==='alarm'){this.tone(41,2.2,.34,36,'sawtooth',0,0,b);this.noise(.7,.24,140,0,0,'lowpass',.7,50);}
      else if(kind==='worm'){this.tone(30,3.4,.4,19,'sine',0,0,b);this.noise(1.4,.3,120,.4,0,'lowpass',.7,40);}
      else if(kind==='arrive'){for(const [f,d] of [[146.8,0],[220,.35],[293.7,.7]])this.tone(f,2.6,.05,f,'triangle',0,d,b);this.tone(36.7,3,.3,36.7,'sine',0,0,b);}
      else if(kind==='complete'){for(const [f,d] of [[110,0],[164.8,.05],[220,.5],[277.2,1],[329.6,1.5]])this.tone(f,4.5,.06,f,'triangle',0,d,b);this.tone(27.5,5,.34,27.5,'sine',0,0,b);}
      else if(kind==='fail'){this.tone(98,2.6,.12,61,'sawtooth',0,0,b);this.tone(92.5,2.6,.1,58,'sawtooth',0,.05,b);}
    }
    drum(strength=1,delay=0){this.tone(74,.5,.34*strength,30,'sine',0,delay,this.score);this.noise(.12,.1*strength,220,0,delay,'lowpass',.7,60);}
    update(game,dt){
      if(!this.ok)return;const t=this.ctx.currentTime,L=this.loops,set=(l,v,tc=.25)=>l.gain.gain.setTargetAtTime(v,t,tc);
      const live=['playing','outro','intro'].includes(game.state),p=game.player,worm=live?(game.worm?.intensity||0):0;
      const gust=.5+.5*Math.sin(game.time*.23)*Math.sin(game.time*.071+1);
      set(L.wind,live?.17+gust*.1+worm*.1:.1,.6);set(L.gust,live?.025+gust*.05:.01,.8);L.gust.filter.frequency.setTargetAtTime(700+gust*900,t,1);
      // Harvester: heard across the yard, loud beside it; spins down when stopped.
      const h=game.world.harvester,hs=h&&live?this.spatial(h.group.position,p,14,.06):{gain:0},hp=h?h.power:0;
      set(L.harvLow,hs.gain*hp*.1,.3);set(L.harvMid,hs.gain*hp*.5,.3);set(L.harvGrind,hs.gain*hp*.1*(.6+.4*Math.sin(game.time*9)),.08);if(h)L.harvLow.osc.frequency.setTargetAtTime(16+hp*15,t,.4);
      set(L.wormLow,worm*.5,.25);set(L.wormGrit,worm*.9,.25);
      const th=game.world.thopter,ts=th&&th.phase!=='away'&&live?this.spatial(th.root.position,p,30,.02):{gain:0},fl=th?th.flap:0,inside=game.state==='outro'?1.5:1;
      set(L.thopter,ts.gain*(.25+.55*fl)*inside,.2);set(L.thopterLow,ts.gain*(.06+.14*fl)*inside,.2);L.thopterLfo.gain.gain.setTargetAtTime(ts.gain*.3*fl,t,.2);L.thopterLfo.osc.frequency.setTargetAtTime(6+fl*9,t,.3);
      const alarm=live&&game.mission?.alarmActive?1:0,as=alarm?this.spatial(S.v(-17.5,5,-13),p,26,.12).gain:0,wob=Math.sin(game.time*2.6)>0?1:0;
      set(L.alarmA,as*.035*wob,.05);set(L.alarmB,as*.035*(1-wob),.05);
      // Score follows tension: 0 calm, 1 fight, 2 extraction.
      const target=!live?0:game.extraction?.active?2:game.enemies.inCombat()?1:.25;this.tension=S.damp(this.tension,target,.8,dt);const k=this.tension;
      set(L.drone1,.05+k*.03,1);set(L.drone2,.05+k*.03,1);set(L.drone3,.012*k,1.5);set(L.pedal,.16+k*.1,1);this.formant.frequency.setTargetAtTime(380+k*240+Math.sin(game.time*.17)*90,t,.8);
      if(live&&k>.7&&game.state!=='paused'&&game.time>this.nextBeat){const fast=k>1.5;this.nextBeat=game.time+(fast?.5:1.0);this.beat++;const pat=fast?[1,.35,.6,.35]:[1,0,.55,0];const s=pat[this.beat%4];if(s)this.drum(s*S.clamp(k-.5,.3,1));if(fast&&this.beat%8===4)this.tone(73.4,.9,.07,73.4,'sawtooth',0,0,this.score);}
    }
  };
})(window.Spice);
