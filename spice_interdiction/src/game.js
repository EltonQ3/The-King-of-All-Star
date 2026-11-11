'use strict';
/* Player, combat and the top-level state machine.
 * States: title -> intro -> playing <-> paused -> dead | outro -> complete.
 * Mission rules live in mission.js / extraction.js; this file never counts kills
 * to decide progress. */
(function(S,T){
  const $=S.$,MAG=24,SETTINGS_KEY='spice.settings.v3';
  S.Player=class{
    constructor(game){this.game=game;this.pos=S.v();this.vel=S.v();this.maxHealth=100;this.reset();}
    reset(){const w=this.game.world;this.pos.copy(w.spawn);this.pos.y=w.ground(this.pos.x,this.pos.z);this.vel.set(0,0,0);this.yaw=0;this.pitch=0;this.height=1.72;this.health=this.maxHealth;this.vy=0;this.grounded=true;this.bob=0;this.stepClock=0;this.aim=0;this.sprinting=false;this.crouching=false;this.edgeSaid=0;}
    eye(){return S.v(this.pos.x,this.pos.y+this.height,this.pos.z);}
    update(dt){
      const g=this.game,i=g.input,k=i.keys,sens=.0021*i.sensitivity*S.lerp(1,.62,this.aim);
      g.weaponSway.x=S.damp(g.weaponSway.x,S.clamp(-i.dx*.00009,-.02,.02),10,dt);g.weaponSway.y=S.damp(g.weaponSway.y,S.clamp(-i.dy*.00007,-.016,.016),10,dt);
      this.yaw-=i.dx*sens;this.pitch=S.clamp(this.pitch-i.dy*sens*(i.invertY?-1:1),-1.45,1.45);i.dx=i.dy=0;
      this.yaw+=((k.has('ArrowLeft')?1:0)-(k.has('ArrowRight')?1:0))*dt*1.7;this.pitch=S.clamp(this.pitch+((k.has('ArrowUp')?1:0)-(k.has('ArrowDown')?1:0))*dt*1.1,-1.45,1.45);
      const busy=g.weaponLowered;this.aim=S.damp(this.aim,i.ads&&!busy&&g.reloadTime<=0?1:0,15,dt);
      let x=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0)+i.stick.x,z=(k.has('KeyW')?1:0)-(k.has('KeyS')?1:0)+i.stick.y,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
      this.crouching=k.has('KeyC')||k.has('ControlLeft');
      this.sprinting=(k.has('ShiftLeft')||k.has('ShiftRight')||i.stick.y>.92)&&z>.2&&!i.ads&&!this.crouching&&!i.fire&&!busy;
      const speed=busy?1.4:this.crouching?2.3:i.ads?2.8:this.sprinting?7.4:4.7;
      const vx=(Math.cos(this.yaw)*x-Math.sin(this.yaw)*z)*speed,vz=(-Math.sin(this.yaw)*x-Math.cos(this.yaw)*z)*speed,grip=this.grounded?12:2.5;
      this.vel.x=S.damp(this.vel.x,vx,grip,dt);this.vel.z=S.damp(this.vel.z,vz,grip,dt);
      const bx=this.pos.x,bz=this.pos.z;g.world.collision.move(this.pos,this.vel.x*dt,this.vel.z*dt);
      const b=g.world.collision.bounds;if((this.pos.x<=b.minX+.01||this.pos.x>=b.maxX-.01||this.pos.z<=b.minZ+.01)&&g.playTime>this.edgeSaid){this.edgeSaid=g.playTime+9;g.toast('岩地的盡頭。開闊的沙海屬於沙蟲。');}
      if(i.consume('Space')&&this.grounded&&!this.crouching&&!busy){this.vy=5.6;this.grounded=false;g.audio.cloth();}
      this.vy-=15.5*dt;this.pos.y+=this.vy*dt;const ground=g.world.ground(this.pos.x,this.pos.z);
      if(this.pos.y<=ground){if(!this.grounded&&this.vy<-2.5){g.landPulse=Math.min(.06,-this.vy*.006);g.audio.land();g.fx.puff(S.v(this.pos.x,ground+.05,this.pos.z),.5,2);}this.pos.y=ground;this.vy=0;this.grounded=true;}
      this.height=S.damp(this.height,this.crouching?1.12:1.72,11,dt);
      const velocity=Math.hypot(this.pos.x-bx,this.pos.z-bz)/Math.max(dt,1e-4);this.bob+=velocity*dt*(this.sprinting?1.25:1.6);
      if(velocity>1&&this.grounded){this.stepClock+=dt*velocity;if(this.stepClock>(this.sprinting?2.5:2.05)){g.audio.step();this.stepClock=0;if(this.sprinting)g.fx.puff(S.v(this.pos.x,ground+.04,this.pos.z),.3,1);}}
    }
  };

  S.Game=class{
    constructor(canvas,opts={}){
      this.canvas=canvas;this.time=0;this.playTime=0;this.state='title';this.frames=0;this.quality='high';this.motionReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.weaponSway=new T.Vector2();this.lastDt=1/60;this.baseFov=78;this.difficulty=1;this.maxAlive=14;this.rand=S.rng(20261);this.testMode=!!opts.test;
      const r=this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.NoToneMapping;r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.autoClear=false;
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(this.baseFov,1,.07,2600);this.camera.rotation.order='YXZ';
      S.initMaterials();this.world=new S.World(this.scene,r);this.sky=this.world.sky;new S.Harvester(this.world);new S.Thopter(this.world);
      this.input=new S.Input(canvas);this.audio=new S.Sound();this.player=new S.Player(this);this.fx=new S.Effects(this);
      // The view model has its own scene; its key light is the world sun expressed in camera space.
      this.viewScene=new T.Scene();this.viewCamera=new T.PerspectiveCamera(50,1,.01,10);this.weapon=S.makeWeapon();this.viewScene.add(this.weapon);
      this.viewSun=new T.DirectionalLight(new T.Color().setRGB(1,.86,.67),5.4);this.viewScene.add(this.viewSun);this.viewFill=new T.DirectionalLight(new T.Color().setRGB(.6,.72,1),.5);this.viewFill.position.set(1,-.4,.6);this.viewScene.add(this.viewFill);this.sunVis=1;this.sunClock=0;
      this.enemies=new S.Enemies(this);this.worm=new S.Worm(this);this.post=new S.CinematicRenderer(this);this.hud=new S.Hud(this);
      this.raycaster=new T.Raycaster();this.resetStats();this.mission=new S.Mission(this);this.extraction=new S.Extraction(this);
      this.loadSettings();this.bindUI();this.resize();addEventListener('resize',()=>this.resize());
      this.input.onUnlock=()=>{if(this.state==='playing')this.pause();};
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
      if(this.testMode)this.setQuality('low');else if(matchMedia('(pointer:coarse)').matches&&!this.savedQuality)this.setQuality('low');
      this.hud.update();this.render();
    }
    resetStats(){this.shots=0;this.hits=0;this.ammo=MAG;this.reserve=120;this.reserveMax=192;this.kits=1;this.reloadTime=0;this.reloadDuration=1.9;this.reloadStage=0;this.cooldown=0;this.flash=0;this.hurt=0;this.lastHurt=-99;this.hitTime=0;this.hitKind='';this.playTime=0;
      this.kickPosition=0;this.kickVelocity=0;this.kickAngle=0;this.kickAngleVelocity=0;this.kickRoll=0;this.landPulse=0;this.shotHeat=0;this.sprintPose=0;this.lowerPose=0;this.equip=1;this.weaponLowered=false;this.shake=0;this.letterbox=0;this.damageAngle=0;this.weaponSway.set(0,0);this.fireRng=S.rng(319);this.deadTime=0;this.heal=0;this.emitClock=0;}
    // ---- settings ----
    loadSettings(){
      let s={};try{s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{};}catch{}
      if(['low','medium','high','ultra'].includes(s.quality)){this.savedQuality=s.quality;this.quality=s.quality;}
      if(Number.isFinite(s.fov))this.baseFov=S.clamp(s.fov,60,100);if(Number.isFinite(s.volume))this.audio.volume=S.clamp(s.volume,0,1);if(Number.isFinite(s.sens))this.input.sensitivity=S.clamp(s.sens,.3,2.5);
      if(typeof s.invert==='boolean')this.input.invertY=s.invert;if(typeof s.motion==='boolean')this.motionReduced=s.motion;if([.75,1,1.3].includes(s.difficulty))this.difficulty=s.difficulty;
      this.setQuality(this.quality,false);
    }
    saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({quality:this.quality,fov:this.baseFov,volume:this.audio.volume,sens:this.input.sensitivity,invert:this.input.invertY,motion:this.motionReduced,difficulty:this.difficulty}));}catch{}}
    bindUI(){
      $('start').onclick=()=>this.start();$('resume').onclick=()=>this.resume();$('restart').onclick=()=>this.start();$('retry').onclick=()=>this.start();$('again').onclick=()=>this.start();
      $('retry-checkpoint').onclick=()=>this.start(true);$('pause-checkpoint').onclick=()=>this.start(true);
      $('controls-button').onclick=()=>{$('help').hidden=false;};$('help-close').onclick=()=>{$('help').hidden=true;};$('settings-button').onclick=()=>{this.settingsFromTitle=true;$('pause').hidden=false;$('pause').classList.add('from-title');};
      $('map-close').onclick=()=>this.closeMap();$('pause-button').onclick=()=>this.pause();
      const q=v=>{this.setQuality(v);this.saveSettings();};$('quality').onchange=e=>q(e.target.value);$('quality-pause').onchange=e=>q(e.target.value);
      $('volume').value=this.audio.volume;$('volume').oninput=e=>{this.audio.setVolume(+e.target.value);this.saveSettings();};
      $('sensitivity').value=this.input.sensitivity;$('sensitivity').oninput=e=>{this.input.sensitivity=+e.target.value;this.saveSettings();};
      $('fov').value=this.baseFov;$('fov').oninput=e=>{this.baseFov=+e.target.value;this.saveSettings();};
      $('motion').checked=this.motionReduced;$('motion').onchange=e=>{this.motionReduced=e.target.checked;this.saveSettings();};
      $('invert').checked=this.input.invertY;$('invert').onchange=e=>{this.input.invertY=e.target.checked;this.saveSettings();};
      $('difficulty').value=String(this.difficulty);$('difficulty').onchange=e=>{this.difficulty=+e.target.value;this.saveSettings();};
    }
    setQuality(q,save=true){
      this.quality=['low','medium','high','ultra'].includes(q)?q:'high';const cfg={low:[.8,1,2048,54,0],medium:[1,1.25,2048,58,0],high:[1,1.5,4096,62,4],ultra:[1,2,4096,62,4]}[this.quality];
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,cfg[1])*cfg[0]);this.samples=cfg[4];this.sky.setShadowQuality(this.testMode&&this.quality==='low'?1024:cfg[2],cfg[3]);
      $('quality').value=this.quality;$('quality-pause').value=this.quality;this.resize();
    }
    resize(){
      const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.viewCamera.aspect=w/h;this.viewCamera.updateProjectionMatrix();
      if(this.post){const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.post.resize(size.x,size.y,this.quality!=='low',this.samples);}
    }
    // ---- flow ----
    start(fromCheckpoint=false){
      $('pause').classList.remove('from-title');$('help').hidden=true;this.hud.toggleMap(false);
      this.audio.start();this.audio.setPaused(false);this.input.clear();this.fx.clear();this.hud.reset();
      const useCheckpoint=fromCheckpoint&&this.mission.checkpoint,deaths=this.deaths||0;
      this.resetStats();this.extraction.reset();
      if(useCheckpoint){this.deaths=deaths;this.mission.load();this.state='playing';this.toast('已從檢查點恢復：前哨目標完成，準備撤離');this.radio('哨兵','再來一次。北門開着，信標在接應坪西側。',4);}
      else{this.deaths=0;this.player.reset();this.mission.reset();this.state='intro';this.introTime=0;this.hud.showCard('阿拉基斯 · 北半球深沙漠','第九採收區 · 岩隙','弗瑞曼突襲 · 單人滲透');}
      this.input.active=true;this.input.requestLock();this.post.fade=0;this.hud.update();
    }
    pause(){if(this.state!=='playing')return;this.state='paused';this.input.active=false;this.input.clear();this.input.releaseLock();this.audio.setPaused(true);$('pause-checkpoint').hidden=!this.mission.checkpoint;this.hud.update();}
    resume(){if(this.settingsFromTitle&&this.state==='title'){this.settingsFromTitle=false;$('pause').hidden=true;$('pause').classList.remove('from-title');return;}
      if(this.state!=='paused')return;this.hud.toggleMap(false);this.state='playing';this.input.clear();this.input.active=true;this.audio.start();this.audio.setPaused(false);this.input.requestLock();this.hud.update();}
    openMap(){if(this.state!=='playing')return;this.pause();this.hud.toggleMap(true);this.hud.update();}
    closeMap(){if(this.hud.mapOpen){this.hud.toggleMap(false);this.resume();}}
    beginOutro(){this.state='outro';this.input.active=false;this.input.clear();this.input.releaseLock();this.weaponLowered=true;this.hud.update();}
    finish(){this.state='complete';this.audio.sting('complete');this.hud.debrief();this.hud.update();}
    radio(speaker,text,seconds){this.hud.radio(speaker,text,seconds);}
    toast(text,seconds){this.hud.toast(text,seconds);}
    showViewModel(){return this.state==='playing'||this.state==='paused';}
    // ---- combat ----
    reload(){if(this.state!=='playing'||this.reloadTime>0||this.ammo>=MAG||this.reserve<=0||this.weaponLowered)return false;this.reloadTime=this.reloadDuration;this.reloadStage=0;this.audio.reload('out');return true;}
    useKit(){if(this.kits<=0||this.player.health>=this.player.maxHealth-1||this.heal>0)return;this.kits--;this.heal=55;this.audio.pickup();this.toast('急救包已使用');}
    fire(){
      if(this.state!=='playing'||this.cooldown>0||this.reloadTime>0||this.weaponLowered||this.equip>.35)return false;
      if(this.ammo<=0){if(!this.reload())this.audio.dry();this.cooldown=.25;return false;}
      const p=this.player;this.ammo--;this.shots++;this.cooldown=.1;this.flash=.045;this.shotHeat=Math.min(1,this.shotHeat+.2);
      this.kickVelocity+=.95*(1-p.aim*.35);this.kickAngleVelocity+=1.5*(1-p.aim*.4);this.kickRoll=(this.fireRng()-.5)*.03;
      p.pitch=Math.min(1.45,p.pitch+(.0065+this.shotHeat*.006)*(p.crouching?.7:1));p.yaw+=(this.fireRng()-.5)*.006*(1+this.shotHeat);
      this.audio.shot();this.enemies.noise(p.pos,60);
      this.syncCamera();const cam=this.camera,spread=(.002+(1-p.aim)*.018+Math.hypot(p.vel.x,p.vel.z)*.0022*(1-p.aim*.6))*(.35+this.shotHeat*.65);
      const dir=S.v((this.fireRng()-.5)*spread,(this.fireRng()-.5)*spread,-1).normalize().applyQuaternion(cam.quaternion),origin=cam.position.clone();
      // Nearest of: soldier hit volumes, solid world meshes, the heightfield.
      let best=250,kind=null,hitInfo=null;
      const eh=this.enemies.rayHit(origin,dir,best);if(eh){best=eh.t;kind='enemy';hitInfo=eh;}
      this.raycaster.set(origin,dir);this.raycaster.far=best;const wh=this.raycaster.intersectObjects(this.world.solids,false)[0];if(wh&&wh.distance<best){best=wh.distance;kind='world';hitInfo=wh;}
      const gt=S.rayGround(origin,dir,best);if(gt<best){best=gt;kind='ground';}
      const end=origin.clone().addScaledVector(dir,best);
      if(kind==='enemy'){
        const e=hitInfo.enemy,zone=hitInfo.zone,dmg=zone==='head'?74:zone==='legs'?19:27,killed=e.hit(dmg,zone,dir);this.hits++;this.hitTime=.2;this.hitKind=killed?'kill':zone==='head'?'head':'hit';this.audio.hit(zone==='head');this.fx.hitBody(end,dir);
      }else if(kind==='world'){
        const o=hitInfo.object,n=hitInfo.face?hitInfo.face.normal.clone().transformDirection(o.matrixWorld):S.v(0,1,0);if(n.dot(dir)>0)n.negate();this.fx.impact(end,n,o.material===S.mats.kit);
      }else if(kind==='ground'){this.fx.impact(end,S.v(0,1,0),false,1.2);}
      const muzzle=this.weapon.userData.muzzle.clone();this.weapon.userData.gun.localToWorld(muzzle);
      // Convert the view-model muzzle into world space through the two cameras.
      const mw=muzzle.clone().applyMatrix4(this.viewCamera.matrixWorldInverse);mw.x*=Math.tan(this.viewCamera.fov*Math.PI/360)/Math.tan(cam.fov*Math.PI/360);mw.y*=Math.tan(this.viewCamera.fov*Math.PI/360)/Math.tan(cam.fov*Math.PI/360);mw.applyMatrix4(cam.matrixWorld);
      this.fx.tracer(mw,end,false);this.fx.muzzle(mw);
      this.fx.casing(origin.clone().add(S.v(.22,-.16,-.42).applyQuaternion(cam.quaternion)),cam.quaternion,this.world.ground(p.pos.x,p.pos.z));
      return true;
    }
    damage(amount,source=null){
      if(this.state!=='playing'||this.player.health<=0)return;const p=this.player;amount*=this.difficulty;p.health=Math.max(0,p.health-amount);this.mission.stats.damage+=amount;this.lastHurt=this.playTime;this.hurt=Math.min(1,this.hurt+.45);
      if(source){const d=source.clone().sub(p.pos);this.damageAngle=Math.atan2(d.x,-d.z)+p.yaw;}this.kickAngleVelocity+=.6;this.audio.hurt();
      if(p.health<=0){this.state='dead';this.deadTime=0;this.deaths=(this.deaths||0)+1;this.input.active=false;this.input.clear();this.input.releaseLock();this.audio.sting('fail');
        $('retry-checkpoint').hidden=!this.mission.checkpoint;$('dead-tip').textContent=this.mission.checkpoint?'檢查點保留了前哨目標：重試會從北門前開始，不必重走岩隙。':'守衛開火前，面罩會亮起。利用掩體阻擋射線；蹲伏較難被發現，脫離火力後蒸餾服會慢慢自行修補。';this.hud.update();}
    }
    onKill(enemy,zone){this.audio.kill();this.fx.puff(S.v(enemy.pos.x,enemy.pos.y+.3,enemy.pos.z),.8,3);this.mission.onKill(enemy);}
    onSpotted(enemy){this.mission.onSpotted(enemy);}
    // ---- frame ----
    update(dt){
      dt=Math.min(dt,.05);this.lastDt=dt;this.frames++;const st=this.state,i=this.input;
      if(st!=='paused'){this.time+=dt;S.shared.uTime.value=this.time;}
      if(i.consume('Escape')){if(this.hud.mapOpen)this.closeMap();else if(st==='playing')this.pause();else if(st==='paused')this.resume();else if(st==='intro')this.introTime=99;}
      if(i.consume('KeyM')||i.consume('Tab')){if(this.hud.mapOpen)this.closeMap();else if(st==='playing')this.openMap();}
      if(i.consume('Enter')){if(['title','dead','complete'].includes(st))this.start(st==='dead');}
      this.hud.tick(st==='paused'?0:dt);
      if(st==='intro'){this.introTime+=dt;this.letterbox=1-S.smooth(2.6,3.4,this.introTime);if(i.fire||i.consume('Space'))this.introTime=Math.max(this.introTime,2.6);
        if(this.introTime>=3.4){this.state='playing';this.letterbox=0;this.equip=1;this.radio('哨兵','沿岩隙前進。前哨有兩個入口：西側維修道，東側採收場。按 M 看戰術地圖。',7);}
        this.world.update(dt,this.time,this.worldState());this.world.harvester.update(dt,this.time);this.fx.update(dt,this.camera);this.enemies.update(dt);}
      else if(st==='playing'){
        this.playTime+=dt;const p=this.player;p.update(dt);this.syncCamera();
        this.kickVelocity+=(-230*this.kickPosition-26*this.kickVelocity)*dt;this.kickPosition+=this.kickVelocity*dt;this.kickAngleVelocity+=(-190*this.kickAngle-22*this.kickAngleVelocity)*dt;this.kickAngle+=this.kickAngleVelocity*dt;this.kickRoll=S.damp(this.kickRoll,0,14,dt);
        this.landPulse=S.damp(this.landPulse,0,11,dt);this.shotHeat=Math.max(0,this.shotHeat-dt*1.5);this.cooldown=Math.max(0,this.cooldown-dt);this.flash=Math.max(0,this.flash-dt);this.hurt=Math.max(0,this.hurt-dt*1.2);this.hitTime=Math.max(0,this.hitTime-dt);
        this.sprintPose=S.damp(this.sprintPose,p.sprinting&&Math.hypot(p.vel.x,p.vel.z)>4?1:0,9,dt);this.lowerPose=S.damp(this.lowerPose,this.weaponLowered?1:0,8,dt);this.equip=S.damp(this.equip,0,3.4,dt);
        if(i.consume('KeyR'))this.reload();if(i.consume('KeyQ'))this.useKit();
        if(this.reloadTime>0){this.reloadTime-=dt;const rp=1-this.reloadTime/this.reloadDuration;if(rp>.5&&this.reloadStage===0){this.audio.reload('seat');this.reloadStage=1;}if(rp>.78&&this.reloadStage===1){this.audio.reload('bolt');this.reloadStage=2;}
          if(this.reloadTime<=0){const n=Math.min(MAG-this.ammo,this.reserve);this.ammo+=n;this.reserve-=n;this.reloadTime=0;}}
        if(i.fire)this.fire();
        this.mission.update(dt);this.extraction.update(dt);
        if(this.state==='playing'||this.state==='outro')this.enemies.update(dt);
        if(this.heal>0){const h=Math.min(this.heal,40*dt);this.heal-=h;p.health=Math.min(p.maxHealth,p.health+h);}
        else if(this.playTime-this.lastHurt>5.5&&p.health<p.maxHealth&&p.health>0)p.health=Math.min(p.maxHealth,p.health+7*dt);
        this.worm.update(dt);this.shake=this.worm.shake*.7;this.stepWorld(dt);
      }else if(st==='outro'){this.extraction.update(dt);this.enemies.update(dt);this.worm.update(dt);this.shake=this.worm.shake;this.stepWorld(dt);this.hurt=Math.max(0,this.hurt-dt);}
      else if(st==='dead'){this.deadTime+=dt;this.fx.update(dt,this.camera);this.world.update(dt,this.time,this.worldState());}
      else if(st==='title'||st==='complete'){this.world.update(dt,this.time,this.worldState());this.world.harvester.update(dt,this.time);this.world.thopter.update(dt,this.time);this.fx.update(dt,this.camera);if(st==='title')this.harvesterDust(dt);}
      this.audio.update(this,dt);this.hud.update();
    }
    worldState(){return {alarm:this.mission.alarmActive,beacon:this.mission.flags.beacon,supply:this.mission.flags.supply};}
    stepWorld(dt){this.world.update(dt,this.time,this.worldState());this.world.harvester.update(dt,this.time);this.world.thopter.update(dt,this.time);this.harvesterDust(dt);this.fx.update(dt,this.camera);}
    harvesterDust(dt){
      const h=this.world.harvester;this.emitClock-=dt;if(this.emitClock>0||h.power<.15||h.swallowed)return;this.emitClock=.09;
      this.fx.puff(h.intake(),1.5,1,{vz:1.4,vy:.9,life:2.6,alpha:.3*h.power,grow:2.2});
      if(this.rand()<.6)this.fx.puff(h.exhaust(Math.floor(this.rand()*4)),.9,1,{color:[.2,.18,.16],vy:2.6,life:3.2,alpha:.3*h.power,grow:3,spread:.3});
    }
    syncCamera(){
      const cam=this.camera,p=this.player,st=this.state;
      if(this.debugCam){const c=this.debugCam;cam.position.set(c[0],c[1],c[2]);cam.lookAt(c[3],c[4],c[5]);cam.fov=c[6]||this.baseFov;cam.updateProjectionMatrix();cam.updateMatrixWorld(true);return;}
      if(st==='title'){const t=this.time*.03;cam.position.set(2.5+Math.sin(t)*3,4.6+Math.sin(t*.7)*.4,19+Math.cos(t)*1.5);cam.lookAt(3,7,-30);cam.fov=52;}
      else if(st==='intro'){const k=S.smooth(0,3.2,this.introTime),eye=p.eye();cam.position.set(eye.x+(1-k)*1.2,eye.y+(1-k)*2.6,eye.z+(1-k)*7);cam.rotation.set(-(1-k)*.12,0,0,'YXZ');cam.fov=S.lerp(52,this.baseFov,k);}
      else if(st==='outro'){this.extraction.camera(cam);}
      else{
        cam.position.copy(p.eye());const moving=Math.hypot(p.vel.x,p.vel.z)>.3,m=this.motionReduced?0:1;
        const bob=moving&&p.grounded?Math.sin(p.bob*2)*.022*(1-p.aim*.8)*(p.sprinting?1.6:1):0;cam.position.y+=(bob-this.landPulse)*m;
        if(m&&this.shake>0){cam.position.x+=Math.sin(this.time*37)*.012*this.shake;cam.position.y+=Math.sin(this.time*29)*.016*this.shake;}
        const dead=st==='dead'?S.smooth(0,1.1,this.deadTime):0;cam.position.y-=dead*1.25;
        cam.rotation.set(p.pitch+this.kickAngle*.13*m-dead*.25,p.yaw,(moving?Math.sin(p.bob)*.006*m:0)+dead*.7,'YXZ');cam.fov=S.lerp(this.baseFov,this.baseFov*.62,p.aim)+(p.sprinting?3*this.sprintPose:0);
      }
      cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
    }
    render(){
      this.syncCamera();const cam=this.camera,fwd=S.v(0,0,-1).applyQuaternion(cam.quaternion);this.sky.follow(cam.position,fwd);
      if(this.showViewModel()){
        S.poseWeapon(this,this.state==='paused'?0:this.lastDt);
        // Is the muzzle in direct sun? Sampled a few times a second and smoothed.
        this.sunClock-=this.lastDt;if(this.sunClock<=0){this.sunClock=.12;this.sunTarget=this.world.collision.distance(cam.position,S.SUN_DIR,160)>=160?1:.06;}
        this.sunVis=S.damp(this.sunVis,this.sunTarget??1,6,this.lastDt);this.viewSun.intensity=5.4*this.sunVis;this.viewSun.position.copy(S.SUN_DIR).applyQuaternion(cam.quaternion.clone().invert()).multiplyScalar(4);
        this.viewScene.environmentRotation.set(-cam.rotation.x,-cam.rotation.y,0,'YXZ');this.viewScene.environmentIntensity=.75+.4*this.sunVis;
      }
      this.post.frame();
    }
    snapshot(){const p=this.player;return {version:S.VERSION,state:this.state,position:p.pos.toArray().map(n=>+n.toFixed(2)),yaw:+p.yaw.toFixed(3),pitch:+p.pitch.toFixed(3),health:+p.health.toFixed(1),ammo:this.ammo,reserve:this.reserve,kits:this.kits,reloading:this.reloadTime>0,shots:this.shots,hits:this.hits,deaths:this.deaths||0,playTime:+this.playTime.toFixed(2),quality:this.quality,frames:this.frames,
      living:this.enemies.living,enemies:this.enemies.snapshot().map(e=>({i:e.i,kind:e.kind,alive:e.alive,state:e.state,group:e.group,x:+e.x.toFixed(1),z:+e.z.toFixed(1)})),mission:this.mission.snapshot(),extraction:this.extraction.snapshot(),worm:this.worm.snapshot(),
      gate:+this.world.gate.open.toFixed(2),harvester:{running:this.world.harvester.running,power:+this.world.harvester.power.toFixed(2)},thopter:{phase:this.world.thopter.phase,landed:this.world.thopter.landed},effects:this.fx.counts,render:this.post.worldStats||{},audioState:this.audio.ctx?.state||'not-started'};}
  };
})(window.Spice,window.THREE);
