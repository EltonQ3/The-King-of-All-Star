'use strict';
(function(S,T){
  const $=id=>document.getElementById(id);
  S.Player=class{
    constructor(game){this.game=game;this.pos=S.v();this.vel=S.v();this.reset();}
    reset(){this.pos.copy(this.game.world.spawn);this.pos.y=this.game.world.ground(this.pos.x,this.pos.z);this.vel.set(0,0,0);this.yaw=0;this.pitch=0;this.height=1.72;this.health=100;this.vy=0;this.grounded=true;this.bob=0;this.stepClock=0;this.aim=0;this.sprinting=false;}
    eye(){return this.pos.clone().add(S.v(0,this.height,0));}
    update(dt){
      const i=this.game.input,k=i.keys;
      this.game.weaponSway.x=S.damp(this.game.weaponSway.x,S.clamp(-i.dx*.00006,-.014,.014),12,dt);this.game.weaponSway.y=S.damp(this.game.weaponSway.y,S.clamp(-i.dy*.00005,-.012,.012),12,dt);this.yaw-=i.dx*.0022*i.sensitivity;this.pitch=S.clamp(this.pitch-i.dy*.0022*i.sensitivity,-1.42,1.42);i.dx=i.dy=0;
      this.yaw+=((k.has('ArrowLeft')?1:0)-(k.has('ArrowRight')?1:0))*dt*1.5;this.pitch=S.clamp(this.pitch+((k.has('ArrowUp')?1:0)-(k.has('ArrowDown')?1:0))*dt,-1.42,1.42);
      this.aim=S.damp(this.aim,i.ads?1:0,14,dt);
      let x=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0)+i.stick.x,z=(k.has('KeyW')?1:0)-(k.has('KeyS')?1:0)+i.stick.y,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
      const crouch=k.has('KeyC');this.sprinting=(k.has('ShiftLeft')||k.has('ShiftRight'))&&z>0&&!i.ads&&!crouch&&!i.fire;
      const speed=crouch?2.2:i.ads?2.7:this.sprinting?7.3:4.6;
      const vx=(Math.cos(this.yaw)*x-Math.sin(this.yaw)*z)*speed,vz=(-Math.sin(this.yaw)*x-Math.cos(this.yaw)*z)*speed;
      this.vel.x=S.damp(this.vel.x,vx,13,dt);this.vel.z=S.damp(this.vel.z,vz,13,dt);
      this.game.world.collision.move(this.pos,this.vel.x*dt,this.vel.z*dt);
      if(i.consume('Space')&&this.grounded&&!crouch){this.vy=5.7;this.grounded=false;}
      this.vy-=15.5*dt;this.pos.y+=this.vy*dt;const ground=this.game.world.ground(this.pos.x,this.pos.z);
      if(this.pos.y<=ground){if(!this.grounded&&this.vy<-2)this.game.landPulse=.035;this.pos.y=ground;this.vy=0;this.grounded=true;}
      this.height=S.damp(this.height,crouch?1.1:1.72,12,dt);
      const velocity=Math.hypot(this.vel.x,this.vel.z);this.bob+=velocity*dt*1.8;
      if(velocity>1&&this.grounded){this.stepClock+=dt;if(this.stepClock>(this.sprinting?.3:.46)){this.game.audio.step();this.stepClock=0;}}
    }
  };
  S.Game=class{
    constructor(canvas){
      this.canvas=canvas;this.time=0;this.playTime=0;this.state='title';this.errors=[];this.frames=0;this.quality='high';this._frameTimes=[];this.motionReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.weaponSway=new T.Vector2();this.lastDt=1/60;this.baseFov=73;
      this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setClearColor('#b39a74');this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.autoClear=false;
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(72,1,.07,950);this.camera.rotation.order='YXZ';
      this.world=new S.World(this.scene);this.world.buildDetail();this.input=new S.Input(canvas);this.audio=new S.Sound();this.player=new S.Player(this);this.fx=new S.Effects(this.scene);
      this.viewScene=new T.Scene();this.viewCamera=new T.PerspectiveCamera(54,1,.01,10);this.weapon=S.makeWeapon();this.viewScene.add(this.weapon);this.viewScene.add(new T.HemisphereLight('#cad6d9','#504a3b',1.1));const fill=new T.DirectionalLight('#ffe2ad',2.8);fill.position.set(-3,4,2);this.viewScene.add(fill);
      this.enemies=[[-4,8,0],[5,-5,0],[-11,-18,0],[5,-40,1],[-11,-44,1],[13,-10,1]].map(([x,z,w],i)=>new S.Enemy(this,i,x,z,w));
      this.post=new S.CinematicRenderer(this);this.worm=new S.WormWarning(this);this.raycaster=new T.Raycaster();this.resetStats();this.bindUI();this.resize();addEventListener('resize',()=>this.resize());this.input.onUnlock=()=>{if(this.state==='playing')this.pause();};
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
      this.setQuality((window.__SPICE_TEST || matchMedia('(pointer:coarse)').matches)?'low':'high');
      this.updateUI();this.render();
    }
    resetStats(){this.kills=0;this.shots=0;this.hits=0;this.ammo=18;this.reserve=126;this.reloadTime=0;this.cooldown=0;this.recoil=0;this.flash=0;this.hurt=0;this.lastHurt=-99;this.hitTime=0;this.messageTime=0;this.wave=0;this.waveDelay=0;this.playTime=0;this.completed=false;this.introSaid=false;this.exitSaid=false;this.reloadDuration=1.7;this.reloadStage=0;this.kickPosition=0;this.kickVelocity=0;this.kickAngle=0;this.kickAngleVelocity=0;this.landPulse=0;this.shotHeat=0;this.sprintPose=0;this.weaponSway?.set(0,0);this.hitKind='';this.fireRng=S.rng(319);}
    bindUI(){
      const tape=$('compass-tape'),names=['北','東北','東','東南','南','西南','西','西北'];for(let a=-360;a<=720;a+=15){const tick=document.createElement('span');tick.style.left=(a+360)*3+'px';tick.className=a%45===0?'major':'minor';tick.textContent=a%45===0?names[((a/45)%8+8)%8]:'│';tape.appendChild(tick);}
      $('start').onclick=()=>this.start();$('resume').onclick=()=>this.resume();$('restart').onclick=()=>this.start();$('retry').onclick=()=>this.start();$('again').onclick=()=>this.start();
      $('controls-button').onclick=()=>{$('help').hidden=!$('help').hidden;};$('help-close').onclick=()=>{$('help').hidden=true;};
      $('quality').onchange=e=>this.setQuality(e.target.value);$('quality-pause').onchange=e=>this.setQuality(e.target.value);
      $('volume').oninput=e=>this.audio.setVolume(+e.target.value);$('sensitivity').oninput=e=>this.input.sensitivity=+e.target.value;
      $('pause-button').onclick=()=>this.pause();$('motion').checked=this.motionReduced;$('motion').onchange=e=>this.motionReduced=e.target.checked;$('fov').oninput=e=>this.baseFov=+e.target.value;
    }
    setQuality(q){
      this.quality=['low','high','ultra'].includes(q)?q:'high';const low=this.quality==='low',ultra=this.quality==='ultra';
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,ultra?2:low?1:1.5)*(low?.8:1));
      const shadow=ultra?3072:low?1024:2048;this.world.sun.shadow.mapSize.set(shadow,shadow);
      if(this.world.sun.shadow.map){this.world.sun.shadow.map.dispose();this.world.sun.shadow.map=null;}
      this.world.sun.shadow.needsUpdate=true;$('quality').value=this.quality;$('quality-pause').value=this.quality;this.resize();
    }
    resize(){
      const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.viewCamera.aspect=w/h;this.viewCamera.updateProjectionMatrix();
      if(this.post){const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.post.resize(size.x,size.y,this.quality!=='low');}
    }
    start(){
      this.audio.start();this.audio.setPaused(false);this.audio.nextMotif=12;this.input.clear();this.player.reset();this.worm.reset();this.enemies.forEach(e=>e.reset());this.fx.clear();this.resetStats();this.state='playing';this.input.active=true;this.input.requestLock();this.notify('沿岩隙前進。清除前哨守衛，抵達北側接應點。',6);this.updateUI();
    }
    pause(){if(this.state!=='playing')return;this.state='paused';this.input.active=false;this.input.clear();if(document.pointerLockElement)document.exitPointerLock();this.audio.setPaused(true);this.updateUI();}
    resume(){if(this.state!=='paused')return;this.state='playing';this.input.clear();this.input.active=true;this.audio.start();this.audio.setPaused(false);this.input.requestLock();this.updateUI();}
    notify(text,seconds=3){$('message').textContent=text;this.messageTime=seconds;}
    reload(){if(this.state!=='playing'||this.reloadTime>0||this.ammo>=18||this.reserve<=0)return false;this.reloadTime=this.reloadDuration;this.reloadStage=0;this.audio.reload('out');return true;}
    fire(){
      if(this.state!=='playing'||this.cooldown>0||this.reloadTime>0)return false;
      if(this.ammo<=0){this.reload();this.cooldown=.15;return false;}
      this.ammo--;this.shots++;this.cooldown=.145;this.recoil=Math.min(this.recoil+.033,.085);this.kickVelocity+=.92;this.kickAngleVelocity+=1.45;this.shotHeat=Math.min(1,this.shotHeat+.22);this.flash=.05;this.audio.shot();
      this.syncCamera();this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);const spread=(.0015+(1-this.player.aim)*.0035)*Math.max(0,this.shotHeat-.3);this.raycaster.setFromCamera({x:(this.fireRng()-.5)*spread,y:(this.fireRng()-.5)*spread},this.camera);this.raycaster.far=150;
      const targets=[...this.world.rayTargets,...this.enemies.filter(e=>e.alive&&e.active).map(e=>e.root)];const hits=this.raycaster.intersectObjects(targets,true);let end=this.camera.position.clone().addScaledVector(this.raycaster.ray.direction,100);
      if(hits.length){const h=hits[0];end.copy(h.point);const enemy=h.object.userData.enemy;if(enemy){const head=h.object.userData.hitZone==='head';enemy.hit(head?70:28,head);this.hits++;this.hitTime=.18;this.hitKind=!enemy.alive?'kill':head?'head':'hit';this.audio.hit();this.fx.impact(end,'#e2bf86',4,null,true);}else{const normal=h.face?h.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(h.object.matrixWorld)):S.v(0,1,0);this.fx.impact(end,'#c8ad85',7,normal,(h.object.material?.metalness||0)>.3);}}
      const origin=this.camera.position.clone().add(S.v(.15,-.13,0).applyQuaternion(this.camera.quaternion));this.fx.tracer(origin,end);this.fx.casing(this.player.eye().add(S.v(.38,-.23,-.75).applyQuaternion(this.camera.quaternion)),this.camera.quaternion,this.world.ground(this.player.pos.x,this.player.pos.z));return true;
    }
    damage(amount,source=null){if(this.state!=='playing'||this.player.health<=0)return;this.player.health=Math.max(0,this.player.health-amount);this.lastHurt=this.playTime;this.hurt=.65;if(source){const d=source.clone().sub(this.player.pos);this.damageAngle=Math.atan2(d.x,-d.z)+this.player.yaw;}$('damage-direction').style.transform=`rotate(${this.damageAngle||0}rad)`;this.audio.hurt();if(this.player.health<=0){this.state='dead';this.input.active=false;this.input.clear();if(document.pointerLockElement)document.exitPointerLock();this.updateUI();}}
    win(){if(this.state!=='playing'||this.kills<this.enemies.length)return;this.state='complete';this.completed=true;this.input.active=false;this.input.clear();this.audio.complete();if(document.pointerLockElement)document.exitPointerLock();this.updateUI();}
    update(dt){
      dt=Math.min(dt,.05);this.lastDt=dt;if(this.state!=='paused')this.time+=dt;this.frames++;
      if(this.input.consume('Escape')){if(this.state==='playing')this.pause();else if(this.state==='paused')this.resume();}
      if(this.input.consume('Enter')){if(['title','dead','complete'].includes(this.state))this.start();}
      if(this.state==='playing'){
        this.playTime+=dt;this.player.update(dt);this.kickVelocity+=(-210*this.kickPosition-24*this.kickVelocity)*dt;this.kickPosition+=this.kickVelocity*dt;this.kickAngleVelocity+=(-185*this.kickAngle-21*this.kickAngleVelocity)*dt;this.kickAngle+=this.kickAngleVelocity*dt;this.landPulse=S.damp(this.landPulse,0,12,dt);this.shotHeat=Math.max(0,this.shotHeat-dt*.8);this.cooldown=Math.max(0,this.cooldown-dt);this.recoil=S.damp(this.recoil,0,10,dt);this.flash=Math.max(0,this.flash-dt);this.hurt=Math.max(0,this.hurt-dt);this.hitTime=Math.max(0,this.hitTime-dt);this.messageTime=Math.max(0,this.messageTime-dt);
        if(this.input.consume('KeyR'))this.reload();
        if(this.reloadTime>0){this.reloadTime-=dt;const rp=1-this.reloadTime/this.reloadDuration;if(rp>.48&&this.reloadStage===0){this.audio.reload('seat');this.reloadStage=1;}if(rp>.82&&this.reloadStage===1){this.audio.reload('bolt');this.reloadStage=2;}if(this.reloadTime<=0){const count=Math.min(18-this.ammo,this.reserve);this.ammo+=count;this.reserve-=count;this.reloadTime=0;}}
        if(this.input.fire)this.fire();
        for(const e of this.enemies){if(this.state!=='playing')break;e.update(dt);}
        if(this.player.pos.z<23&&!this.introSaid){this.introSaid=true;this.notify('採收前哨。守衛的橙色面罩亮起時，先找掩體。',5);}
        if(this.kills>=3&&this.wave===0){this.wave=1;this.waveDelay=2;this.notify('北側增援接近。注意採收機兩側。',4);}
        if(this.waveDelay>0){this.waveDelay-=dt;if(this.waveDelay<=0){this.enemies.filter(e=>e.wave===1).forEach(e=>e.activate());this.wave=2;}}
        if(this.kills===this.enemies.length&&!this.exitSaid){this.exitSaid=true;this.notify('前哨已清空。接應點開放，穿過北側石門。',5);}
        if(this.playTime-this.lastHurt>5&&this.player.health<100)this.player.health=Math.min(100,this.player.health+8*dt);
        if(this.player.pos.distanceTo(this.world.exit)<4)this.win();
        if(this.player.pos.distanceTo(this.world.exit)<6&&this.kills<6&&this.messageTime<=0)this.notify('接應點尚未安全：先清除全部六名守衛。',3);
        if(this.state==='playing')this.worm.update(dt);this.fx.update(dt);
      }
      if(this.state!=='paused')this.world.update(dt,this.time,this.kills===6);this.audio.update(this,dt);this.updateUI();
    }
    syncCamera(){
      if(this.state==='title'){
        const t=this.time*.035;this.camera.position.set(7+Math.sin(t)*1.1,6.2,16+Math.cos(t)*1.1);this.camera.lookAt(2,6.8,-38);this.camera.fov=56;
      }else{
        this.camera.position.copy(this.player.eye());const moving=Math.hypot(this.player.vel.x,this.player.vel.z)>.3;const bob=moving&&this.player.grounded?Math.sin(this.player.bob*2)*.019*(1-this.player.aim):0;this.camera.position.y+=this.motionReduced?0:bob-this.landPulse+(this.worm.shake||0);
        const kick=this.motionReduced?0:this.kickAngle*.14;this.camera.rotation.set(this.player.pitch+kick,this.player.yaw,this.motionReduced?0:(this.worm.shake||0)*.18,'YXZ');this.camera.fov=S.lerp(this.baseFov,48,this.player.aim);
      }
      this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
    }
    render(){
      this.syncCamera();if(this.state!=='title')S.poseWeapon(this);this.post.frame();this.updateMarker();
    }
    updateMarker(){
      const marker=$('marker');if(this.state!=='playing'){marker.hidden=true;return;}
      const target=(this.kills===6?this.world.exit:S.v(0,this.world.ground(0,-12),-12)).clone().add(S.v(0,3,0));
      const dist=this.player.pos.distanceTo(target),dir=target.clone().sub(this.camera.position),forward=S.v(0,0,-1).applyQuaternion(this.camera.quaternion),p=target.project(this.camera);
      marker.hidden=dir.dot(forward)<0||dist<6;marker.style.left=`${S.clamp((p.x*.5+.5)*innerWidth,38,innerWidth-38)}px`;marker.style.top=`${S.clamp((-p.y*.5+.5)*innerHeight,100,innerHeight-100)}px`;
      $('distance').textContent=Math.round(dist)+' m';$('marker-label').textContent=this.kills===6?'接應點':'採收前哨';
    }
    updateUI(){
      $('title').hidden=this.state!=='title';$('pause').hidden=this.state!=='paused';$('dead').hidden=this.state!=='dead';$('complete').hidden=this.state!=='complete';$('hud').hidden=!['playing','paused'].includes(this.state);$('touch').hidden=!this.input.touch||this.state!=='playing';
      $('ammo').textContent=String(this.ammo).padStart(2,'0');$('reserve').textContent=String(this.reserve).padStart(3,'0');$('health').textContent=String(Math.ceil(this.player.health)).padStart(3,'0');$('health-fill').style.width=this.player.health+'%';
      $('reload-label').textContent=this.reloadTime>0?'更換彈匣':this.ammo===0?'R 換彈':this.ammo<=4?'彈量偏低':'';
      $('kills').textContent=this.kills+' / 6';$('objective').textContent=this.kills===6?'抵達北側接應點':this.player.pos.z>23?'穿越岩隙，接近採收前哨':'清除前哨守衛';
      const bearing=((-this.player.yaw*180/Math.PI)%360+360)%360;$('heading').textContent=String(Math.round(bearing)%360).padStart(3,'0')+'°';$('compass-tape').style.transform=`translateX(${175-1080-bearing*3}px)`;
      $('hitmark').style.opacity=this.hitTime>0?1:0;$('hitmark').className=this.hitKind;$('hit-label').textContent=this.hitTime>0?({kill:'制伏',head:'精準命中',hit:''}[this.hitKind]||''):'';$('damage-direction').style.opacity=this.hurt*.7;$('damage').style.opacity=this.hurt*.65;$('message').style.opacity=this.messageTime>0?1:0;
      $('crosshair').classList.toggle('aim',this.player.aim>.5);$('crosshair').style.transform=`scale(${1+this.shotHeat*.6+Math.hypot(this.player.vel.x,this.player.vel.z)*.035})`;$('reload-progress').style.width=(this.reloadTime>0?(1-this.reloadTime/this.reloadDuration)*100:0)+'%';if(this.state!=='playing')$('seismic').hidden=true;$('ammo').classList.toggle('low',this.ammo<=4);
      $('final-time').textContent=Math.floor(this.playTime/60)+':'+String(Math.floor(this.playTime%60)).padStart(2,'0');$('final-accuracy').textContent=(this.shots?Math.round(this.hits/this.shots*100):0)+'%';$('final-shots').textContent=this.shots;
    }
    snapshot(){return {version:'0.2.0',state:this.state,position:this.player.pos.toArray(),yaw:this.player.yaw,pitch:this.player.pitch,health:this.player.health,ammo:this.ammo,reserve:this.reserve,reloading:this.reloadTime>0,kills:this.kills,wave:this.wave,shots:this.shots,hits:this.hits,playTime:+this.playTime.toFixed(2),quality:this.quality,frames:this.frames,enemyCount:this.enemies.filter(e=>e.active&&e.alive).length,enemies:this.enemies.map(e=>({index:e.index,active:e.active,alive:e.alive,health:e.health,pos:e.pos.toArray(),shots:e.shots,state:e.state})),worm:this.worm.snapshot(),effects:{particles:this.fx.items.length,decals:this.fx.decals.length},render:this.post.worldStats||{},audioState:this.audio.ctx?.state||'not-started'};}
  };
})(window.Spice,window.THREE);
