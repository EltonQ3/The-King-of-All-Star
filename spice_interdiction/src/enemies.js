'use strict';
/* Outpost infantry. One skinned mesh per soldier (rigid weights, 15 bones), posed
 * procedurally: gait, low-ready and shouldered rifle, flinch, crouch, three falls.
 * Behaviour: patrol -> notice -> fight (move to a firing position found on the nav
 * grid, telegraphed three-round bursts, relocate, call nearby allies).
 * 'trooper' is House infantry in black plate; 'elite' is an Imperial shock trooper. */
(function(S,T){
  const K=S.Kit,C=K.C,M=S.SURF;
  const BONES=[['hips',-1,0,.97,0],['spine',0,0,.13,0],['chest',1,0,.19,0],['head',2,0,.37,0],
    ['armL',2,.215,.25,0],['foreL',4,0,-.29,0],['armR',2,-.215,.25,0],['foreR',6,0,-.29,0],
    ['thighL',0,.105,-.07,0],['shinL',8,0,-.43,0],['footL',9,0,-.42,0],['thighR',0,-.105,-.07,0],['shinR',11,0,-.43,0],['footR',12,0,-.42,0],['gun',2,0,.04,.3]];
  const IX=Object.fromEntries(BONES.map((b,i)=>[b[0],i]));
  const PAL={trooper:{armor:'#22262a',trim:'#4b4a46',cloth:'#2b2823',under:'#191a1b',strap:'#3b3125',visor:'#c47a3a'},
             elite:{armor:'#a8a297',trim:'#d0c8b6',cloth:'#6f695c',under:'#3a3832',strap:'#4a4034',visor:'#8fd8ff'}};
  const geoCache={};
  function buildGeometry(kind){
    if(geoCache[kind])return geoCache[kind];
    const kit=S.mats.kit,p=PAL[kind],b=new S.Batch(),world=[];
    BONES.forEach(([,parent,x,y,z],i)=>{const m=new T.Matrix4().makeTranslation(x,y,z);world[i]=parent<0?m:world[parent].clone().multiply(m);});
    const on=(name,fn)=>{b.bone=IX[name];b.pushMatrix(world[IX[name]]);fn();b.pop();};
    on('hips',()=>{
      b.tint(p.under,M.cloth).cbox(kit,0,-.02,0,.33,.2,.2,.05);b.tint(p.strap,M.cloth).cbox(kit,0,.07,0,.36,.06,.23,.015);b.tint(p.trim,M.metal).cbox(kit,0,.07,.118,.07,.05,.02,.006);
      b.tint(p.armor);for(const s of [-1,1]){b.cbox(kit,s*.1,-.17,.105,.15,.26,.03,.012,-.1,0,0);b.cbox(kit,s*.185,-.14,0,.03,.24,.17,.012,0,0,s*.12);b.cbox(kit,s*.09,-.15,-.11,.15,.24,.03,.012,.1,0,0);}
      b.tint(p.cloth,M.cloth).cbox(kit,0,-.2,.085,.11,.34,.02,.008,-.06,0,0);
      b.tint(p.strap,M.cloth);for(const s of [-1,1])b.cbox(kit,s*.2,.0,-.02,.07,.13,.12,.02);
    });
    on('spine',()=>{b.tint(p.under,M.cloth).cyl(kit,0,.08,0,.145,.22,14,'y',.165);b.tint(p.armor).cbox(kit,0,.07,.135,.2,.14,.035,.012);});
    on('chest',()=>{
      b.tint(p.armor).sphere(kit,0,.15,.01,1,.235,.25,.165,16,12);b.cbox(kit,0,.17,.125,.31,.24,.07,.03,-.12,0,0);
      b.tint(p.trim).cbox(kit,0,.23,.168,.14,.07,.02,.006,-.12,0,0);for(const s of [-1,1])b.cbox(kit,s*.1,.11,.165,.09,.11,.02,.006,-.12,0,0);
      b.tint(p.under,M.polymer).cbox(kit,0,.16,-.185,.27,.36,.11,.03);b.tint(p.trim,M.metal);for(const s of [-1,1])b.cyl(kit,s*.075,.2,-.25,.036,.2,10);
      b.tint(p.strap,M.cloth);for(const s of [-1,1])b.beam(kit,[s*.12,.34,.1],[s*.14,.04,.165],.018,6);
      b.tint(p.under,M.polymer).cyl(kit,0,.345,0,.085,.09,12,'y',.105);b.tint(p.armor).add(kit,S.geo.torus(.11,.03,6,16),0,.33,0,Math.PI/2,0,0);
    });
    on('head',()=>{
      b.tint(p.armor).sphere(kit,0,.115,0,.122,1,1.13,1.1,18,14);b.cbox(kit,0,.2,-.015,.05,.07,.21,.015);
      b.tint(p.under,M.polymer).cbox(kit,0,.105,.098,.2,.075,.07,.02);b.tint(p.trim).cbox(kit,0,.035,.1,.12,.09,.08,.022);
      b.tint(p.under,M.polymer);for(const s of [-1,1]){b.cyl(kit,s*.118,.09,.0,.04,.03,10,'x');b.beam(kit,[s*.05,.02,.12],[s*.11,-.03,-.02],.016,6);}
    });
    for(const [side,s] of [['L',1],['R',-1]]){
      on('arm'+side,()=>{b.tint(p.under,M.cloth).add(kit,S.geo.capsule(.052,.2,10),0,-.14,0);b.tint(p.armor).sphere(kit,s*.01,-.01,0,.105,1.05,.9,1.15,12,10).cbox(kit,s*.035,-.13,0,.035,.17,.11,.014);b.tint(p.trim).cbox(kit,s*.03,.04,0,.11,.03,.16,.01);});
      on('fore'+side,()=>{b.tint(p.under,M.cloth).add(kit,S.geo.capsule(.044,.19,10),0,-.13,0);b.tint(p.armor).cbox(kit,0,-.13,.02,.095,.19,.09,.02).sphere(kit,0,0,-.01,.058);b.tint(p.under,M.polymer).cbox(kit,0,-.29,.01,.075,.1,.055,.02);});
      on('thigh'+side,()=>{b.tint(p.under,M.cloth).add(kit,S.geo.capsule(.078,.28,10),0,-.21,0);b.tint(p.armor).cbox(kit,0,-.2,.062,.13,.27,.045,.018).cbox(kit,s*.07,-.2,0,.035,.24,.12,.014);});
      on('shin'+side,()=>{b.tint(p.armor).sphere(kit,0,0,.03,.075,1,1,.9).cbox(kit,0,-.03,.062,.1,.11,.04,.016);b.tint(p.under,M.cloth).add(kit,S.geo.capsule(.06,.26,10),0,-.21,0);b.tint(p.armor).cbox(kit,0,-.22,.045,.105,.28,.05,.02).cbox(kit,0,-.22,-.05,.09,.22,.03,.012);});
      on('foot'+side,()=>{b.tint(p.under,M.polymer).cbox(kit,0,-.01,.045,.105,.1,.27,.03);b.tint(p.armor).cbox(kit,0,.02,.1,.1,.06,.13,.02);b.tint(C.black,M.polymer).cbox(kit,0,-.055,.045,.11,.025,.28,.008);});
    }
    on('gun',()=>{
      b.tint('#2a2d2f').cbox(kit,0,0,.02,.05,.085,.42,.012).cbox(kit,0,.05,-.02,.03,.03,.2,.006);b.tint(C.gun,M.metal).cyl(kit,0,.012,.36,.014,.3,8,'z').cyl(kit,0,.012,.5,.022,.07,8,'z');
      b.tint('#3a3d3f').cbox(kit,0,-.1,-.02,.036,.16,.06,.01,.25,0,0).cbox(kit,0,-.075,-.13,.04,.11,.05,.012,-.3,0,0);b.tint('#2a2d2f').cbox(kit,0,-.005,-.3,.04,.1,.2,.012);
      b.tint(p.trim,M.metal).cbox(kit,0,.075,.02,.02,.022,.07,.004);
    });
    b.bone=-1;
    const mesh=b.build(null,{skeleton:true})[0];mesh.geometry.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),2.4);
    return geoCache[kind]=mesh.geometry;
  }
  function makeSoldier(kind){
    const bones=BONES.map(([name,,x,y,z])=>{const bn=new T.Bone();bn.name=name;bn.position.set(x,y,z);return bn;});
    BONES.forEach(([,parent],i)=>{if(parent>=0)bones[parent].add(bones[i]);});
    const mesh=new T.SkinnedMesh(buildGeometry(kind),S.mats.kit);mesh.castShadow=true;mesh.receiveShadow=true;mesh.add(bones[0]);mesh.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));mesh.frustumCulled=false;
    const rig={};BONES.forEach(([name],i)=>rig[name]=bones[i]);
    // Visor slit and muzzle flash ride on bones and change with state.
    const visor=new T.Mesh(S.geo.box(),new T.MeshBasicMaterial({color:PAL[kind].visor,toneMapped:false}));visor.scale.set(.16,.018,.01);visor.position.set(0,.112,.134);rig.head.add(visor);
    const flash=new T.Sprite(new T.SpriteMaterial({map:S.softTexture(),color:'#ffcf8c',blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));flash.material.color.multiplyScalar(3);flash.position.set(0,.012,.6);flash.scale.set(.4,.4,1);flash.visible=false;rig.gun.add(flash);
    const root=new T.Group();root.add(mesh);root.userData={mesh,rig,visor,flash,rest:BONES.map(b=>new T.Vector3(b[2],b[3],b[4]))};return root;
  }

  const KIND={trooper:{health:82,walk:1.5,run:4.1,damage:6,accuracy:.4,windup:.62,burst:3,vision:40,prefer:[12,24]},
              elite:{health:132,walk:1.7,run:5.0,damage:8,accuracy:.5,windup:.5,burst:4,vision:46,prefer:[8,18]}};
  S.Enemy=class{
    constructor(game,index,kind){this.game=game;this.index=index;this.kind=kind;this.def=KIND[kind];this.root=makeSoldier(kind);this.root.visible=false;game.scene.add(this.root);this.pos=S.v();this.active=false;this.alive=false;this.rnd=S.rng(index*97+31);}
    spawn(x,z,opts={}){
      const g=this.game,r=this.root.userData;this.pos.set(x,g.world.ground(x,z),z);this.root.position.copy(this.pos);this.yaw=opts.yaw??0;this.root.rotation.set(0,this.yaw,0);this.root.visible=true;
      this.active=true;this.alive=true;this.health=this.def.health;this.group=opts.group||'garrison';this.patrol=opts.patrol||null;this.patrolIndex=0;this.wait=this.rnd()*3;
      this.state=opts.alert?'fight':'patrol';this.aware=opts.alert?1:0;this.lastKnown=opts.alert?g.player.pos.clone():null;this.path=null;this.pathIndex=0;this.repath=0;this.goalTimer=0;this.goal=null;
      this.timer=1+this.rnd()*1.4;this.windup=0;this.burstLeft=0;this.burstTimer=0;this.flinch=0;this.kick=0;this.muzzle=0;this.shots=0;this.walk=this.rnd()*6;this.speed=0;this.aimW=opts.alert?1:0;this.crouch=0;this.deathTime=0;this.fall=0;this.lostSight=0;this.stuck=0;this.seen=false;
      r.visor.material.color.set(PAL[this.kind].visor);r.flash.visible=false;for(const k in r.rig)r.rig[k].rotation.set(0,0,0);BONES.forEach((b,i)=>r.rig[b[0]].position.copy(r.rest[i]));
    }
    despawn(){this.active=false;this.alive=false;this.root.visible=false;}
    eye(){return S.v(this.pos.x,this.pos.y+1.6-this.crouch*.45,this.pos.z);}
    // Analytic hit volumes: head sphere, three torso spheres, leg column. Returns {t,zone} or null.
    rayHit(o,d,max){
      if(!this.active||!this.alive)return null;let best=null;const c=this.crouch*.45,py=this.pos.y;
      const test=(x,y,z,r,zone)=>{const ox=o.x-x,oy=o.y-y,oz=o.z-z,b=ox*d.x+oy*d.y+oz*d.z,cc=ox*ox+oy*oy+oz*oz-r*r,disc=b*b-cc;if(disc<0)return;const t=-b-Math.sqrt(disc);if(t>0&&t<max&&(!best||t<best.t))best={t,zone};};
      const fx=Math.sin(this.yaw)*.03,fz=Math.cos(this.yaw)*.03;
      test(this.pos.x+fx,py+1.72-c,this.pos.z+fz,.145,'head');test(this.pos.x,py+1.34-c,this.pos.z,.25,'body');test(this.pos.x,py+1.02-c*.8,this.pos.z,.24,'body');
      test(this.pos.x,py+.66-c*.4,this.pos.z,.22,'legs');test(this.pos.x,py+.3,this.pos.z,.2,'legs');return best;
    }
    hear(pos,urgent=true){if(!this.alive||!this.active)return;this.lastKnown=pos.clone();if(this.state==='patrol'){this.state=urgent?'fight':'search';this.aware=urgent?1:.6;this.timer=.5+this.rnd()*.7;}}
    hit(damage,zone,from){
      if(!this.alive||!this.active)return false;const g=this.game;this.health-=damage;this.flinch=.3;this.timer=Math.max(this.timer,.4);this.windup=0;this.burstLeft=0;this.hear(g.player.pos,true);
      g.enemies.alertNear(this.pos,24,g.player.pos);
      if(this.health<=0){this.alive=false;this.state='dead';this.deathTime=0;this.fall=zone==='head'?1:(this.rnd()>.5?0:2);this.fallDir=from?Math.atan2(from.x,from.z):0;g.onKill(this,zone);return true;}
      return false;
    }
    canSee(){
      const g=this.game,p=g.player,e=this.eye(),t=p.eye(),dist=e.distanceTo(t),alert=this.state!=='patrol';
      const range=this.def.vision*(p.crouching?.6:1)*(alert?1.5:1);if(dist>range)return 0;
      if(!alert){const dir=Math.atan2(t.x-e.x,t.z-e.z);if(Math.abs(S.angleDelta(dir,this.yaw))>1.05&&dist>3.5)return 0;}
      if(!g.world.collision.visible(e,t)&&!g.world.collision.visible(e,S.v(t.x,t.y-.7,t.z)))return 0;
      return dist;
    }
    pickGoal(){
      // Sample grid cells around the player; prefer line of sight, preferred range, cover and spacing.
      const g=this.game,w=g.world,p=g.player.pos,target=this.lastKnown||p;let best=null,bs=-1e9;
      for(let i=0;i<14;i++){
        const a=this.rnd()*6.283,r=S.lerp(this.def.prefer[0],this.def.prefer[1]+6,this.rnd()),x=target.x+Math.cos(a)*r,z=target.z+Math.sin(a)*r,ni=w.navIndex(x,z);if(ni<0)continue;
        const c=w.navPos(ni),d=c.distanceTo(this.pos);if(d>44)continue;
        const sees=w.collision.visible(S.v(c.x,c.y+1.5,c.z),S.v(target.x,target.y+1.4,target.z));
        let score=(sees?10:0)-d*.12-Math.abs(c.distanceTo(target)-(this.def.prefer[0]+this.def.prefer[1])/2)*.25+this.rnd()*2;
        if(w.collision.inside(c.x,c.z,1.6,c.y+.5))score+=2.5;
        for(const o of g.enemies.list)if(o!==this&&o.active&&o.alive&&o.goal&&o.goal.distanceTo(c)<4)score-=6;
        if(score>bs){bs=score;best=c;}
      }
      this.goal=best||target.clone();this.setPath(this.goal);this.goalTimer=3+this.rnd()*3.5;
    }
    setPath(to){this.path=this.game.world.path(this.pos,to);this.pathIndex=0;this.repath=1.2+this.rnd()*.6;}
    // Walk the current path; returns planar speed actually achieved.
    follow(dt,speed){
      if(!this.path||this.pathIndex>=this.path.length)return 0;const g=this.game,wp=this.path[this.pathIndex],dx=wp.x-this.pos.x,dz=wp.z-this.pos.z,d=Math.hypot(dx,dz);
      if(d<.45){this.pathIndex++;return this.speed;}
      const old=this.pos.clone();let vx=dx/d,vz=dz/d;
      for(const o of g.enemies.list){if(o===this||!o.active||!o.alive)continue;const ox=this.pos.x-o.pos.x,oz=this.pos.z-o.pos.z,od=Math.hypot(ox,oz);if(od<1.1&&od>.001){vx+=ox/od*(1.1-od)*1.5;vz+=oz/od*(1.1-od)*1.5;}}
      g.world.collision.move(this.pos,vx*speed*dt,vz*speed*dt,.36);
      const moved=this.pos.distanceTo(old)/Math.max(dt,1e-4);this.stuck=moved<speed*.25?this.stuck+dt:0;if(this.stuck>.9){this.stuck=0;this.setPath(this.path[this.path.length-1]);}
      this.face(Math.atan2(vx,vz),dt,7);return moved;
    }
    face(target,dt,rate=8){this.yaw+=S.angleDelta(target,this.yaw)*(1-Math.exp(-dt*rate));}
    shoot(target,dist){
      const g=this.game,r=this.root.userData,from=r.flash.getWorldPosition(S.v()),p=g.player,moving=Math.hypot(p.vel.x,p.vel.z);
      let chance=this.def.accuracy*(dist>30?.55:dist>18?.8:1)*(moving>5?.6:moving>2.5?.82:1)*(p.crouching?.8:1)*(g.difficulty||1);
      const hit=this.rnd()<chance&&g.world.collision.visible(from,target);
      const end=target.clone();if(!hit)end.add(S.v((this.rnd()-.5)*2.6,(this.rnd()-.3)*1.3,(this.rnd()-.5)*2.6));
      const dir=end.clone().sub(from).normalize(),wall=Math.min(g.world.collision.distance(from,dir,120),S.rayGround(from,dir,120));
      const stop=hit?from.distanceTo(end):Math.min(wall,110),impact=from.clone().addScaledVector(dir,stop);
      g.fx.tracer(from,impact,true);if(!hit&&wall<110)g.fx.impact(impact,null,false,.6);
      g.audio.enemyShot(this.pos,p);if(!hit&&dist<40)g.audio.whizz(this.pos,p);
      this.shots++;this.kick=.1;this.muzzle=.06;if(hit)g.damage(this.def.damage,this.pos);
    }
    update(dt){
      if(!this.active)return;const g=this.game,r=this.root.userData,def=this.def;
      this.muzzle=Math.max(0,this.muzzle-dt);r.flash.visible=this.muzzle>0;this.kick=S.damp(this.kick,0,16,dt);this.flinch=Math.max(0,this.flinch-dt);
      if(!this.alive){this.deathTime+=dt;this.animate(dt,0,0);if(this.deathTime>.05)r.visor.material.color.set('#101314');return;}
      const p=g.player,dist=this.pos.distanceTo(p.pos),sight=g.state==='playing'?this.canSee():0;let moveSpeed=0,pitch=0;
      if(sight>0){
        // Awareness builds faster up close; a spotted intruder alerts the squad.
        this.aware=Math.min(1,this.aware+dt*(this.state==='patrol'?S.lerp(2.6,.55,S.clamp(sight/def.vision,0,1)):4));this.lostSight=0;
        if(this.aware>=1){this.lastKnown=p.pos.clone();if(this.state!=='fight'){this.state='fight';this.timer=.35+this.rnd()*.6;g.enemies.alertNear(this.pos,26,p.pos);g.onSpotted(this);}}
      }else{this.lostSight+=dt;if(this.state==='patrol')this.aware=Math.max(0,this.aware-dt*.35);}
      this.seen=sight>0;
      if(this.state==='patrol'){
        if(this.patrol&&this.patrol.length>1){
          if(this.wait>0){this.wait-=dt;this.face(this.yaw+Math.sin(g.time*.6+this.index)*.4*dt,dt,1);}
          else{if(!this.path||this.pathIndex>=this.path.length){this.patrolIndex=(this.patrolIndex+1)%this.patrol.length;const q=this.patrol[this.patrolIndex];this.setPath(S.v(q[0],0,q[1]));this.wait=this.path?0:2;}
            moveSpeed=this.follow(dt,def.walk);if(this.path&&this.pathIndex>=this.path.length)this.wait=2+this.rnd()*3;}
        }else this.yaw+=Math.sin(g.time*.5+this.index*2)*.25*dt;
        this.aimW=S.damp(this.aimW,this.aware>.35?.6:0,5,dt);if(this.aware>.35&&sight>0)this.face(Math.atan2(p.pos.x-this.pos.x,p.pos.z-this.pos.z),dt,3);
      }else if(this.state==='search'){
        if(!this.path||this.repath<=0)this.setPath(this.lastKnown||p.pos);this.repath-=dt;moveSpeed=this.follow(dt,def.run*.75);
        if(this.path&&this.pathIndex>=this.path.length){this.wait+=dt;if(this.wait>6){this.state='patrol';this.aware=0;this.path=null;this.wait=1;}}
        this.aimW=S.damp(this.aimW,.7,5,dt);
      }else{ // fight
        const target=p.eye();target.y-=.25;const eye=this.eye();pitch=Math.atan2(target.y-eye.y,Math.max(1,dist));
        this.timer-=dt;this.goalTimer-=dt;this.repath-=dt;
        const engaged=this.windup>0||this.burstLeft>0;
        if(!engaged){
          if(!this.goal||this.goalTimer<=0||(this.lostSight>1.6&&this.repath<=0)){if(this.lostSight>4&&this.lastKnown){this.goal=this.lastKnown.clone();this.setPath(this.goal);this.goalTimer=3;}else this.pickGoal();}
          if(this.path&&this.pathIndex<this.path.length)moveSpeed=this.follow(dt,def.run);
          else if(sight>0)this.face(Math.atan2(p.pos.x-this.pos.x,p.pos.z-this.pos.z),dt,9);
        }else this.face(Math.atan2(p.pos.x-this.pos.x,p.pos.z-this.pos.z),dt,10);
        const steady=moveSpeed<1.2;this.crouch=S.damp(this.crouch,steady&&!engaged&&this.timer>.5&&this.index%3===0?1:0,6,dt);
        if(this.flinch>0){this.windup=0;this.burstLeft=0;}
        else if(sight>0&&dist<def.vision*1.4){
          if(this.burstLeft>0){this.burstTimer-=dt;if(this.burstTimer<=0){this.shoot(target,dist);this.burstLeft--;this.burstTimer=.13;if(this.burstLeft===0)this.timer=1.3+this.rnd()*1.3;}}
          else if(this.timer<=0&&(steady||dist<10)){this.windup+=dt;if(this.windup>def.windup){this.burstLeft=def.burst;this.burstTimer=0;this.windup=0;}}
        }else{this.windup=0;this.burstLeft=0;}
        this.aimW=S.damp(this.aimW,moveSpeed>2.5&&!engaged?.45:1,7,dt);
        const tell=this.windup>0?S.clamp(this.windup/def.windup,0,1):0;r.visor.material.color.set(PAL[this.kind].visor).multiplyScalar(1+tell*4+(this.burstLeft>0?3:0));
      }
      this.pos.y=g.world.ground(this.pos.x,this.pos.z);this.root.position.copy(this.pos);this.root.rotation.y=this.yaw;
      this.animate(dt,moveSpeed,pitch);
    }
    animate(dt,velocity,aimPitch){
      const r=this.root.userData.rig,g=this.game,t=g.time,rest=this.root.userData.rest;
      this.speed=S.damp(this.speed,velocity,9,dt);const run=S.clamp((this.speed-1.6)/2.4,0,1),stride=Math.min(1,this.speed/1.4);
      const was=this.walk;this.walk+=this.speed*dt*(3.1-run*.75);const ph=this.walk,A=(.42+.34*run)*stride;
      if(!this.alive){
        // Falls: 0 backward, 1 crumple forward (head shot), 2 twist and drop on the side.
        const k=S.smooth(0,.55,this.deathTime),k2=S.smooth(.1,.75,this.deathTime),f=this.fall;
        r.hips.position.y=S.lerp(rest[0].y,f===1?.2:.16,k2);r.hips.rotation.set(f===0?-1.45*k:f===1?1.42*k:-.5*k,f===2?.9*k:0,f===2?1.35*k:.12*k);
        r.spine.rotation.x=f===1?.25*k:-.1*k;r.chest.rotation.set(f===1?.2*k:-.12*k,0,0);r.head.rotation.set(f===1?.3*k:-.35*k,.5*k,0);
        r.thighL.rotation.set(-.3*k,0,.3*k);r.thighR.rotation.set(-.75*k,0,-.2*k);r.shinL.rotation.x=.4*k;r.shinR.rotation.x=1.1*k;
        r.armL.rotation.set(-.4*k,0,-1.1*k);r.armR.rotation.set(.3*k,0,.9*k);r.foreL.rotation.x=-.5*k;r.foreR.rotation.x=-.9*k;r.gun.rotation.set(.9*k,.6*k,0);r.gun.position.y=rest[14].y-.2*k;
        return;
      }
      const cr=this.crouch,a=this.aimW,fl=this.flinch>0?Math.sin(this.flinch*30)*this.flinch*1.6:0;
      r.hips.position.y=rest[0].y-cr*.36+Math.abs(Math.sin(ph))*.035*stride-run*.04;r.hips.rotation.set(run*.16+cr*.12,Math.sin(ph)*.08*stride,Math.sin(ph)*.035*stride);
      const leg=(thigh,shin,foot,phase)=>{const s=Math.sin(phase),c=Math.cos(phase);thigh.rotation.x=-s*A-cr*1.05-run*.12;shin.rotation.x=(Math.max(0,c)*.95+.12)*stride*(.7+.5*run)+cr*1.75+.05;foot.rotation.x=-thigh.rotation.x-shin.rotation.x+(cr?0:Math.max(0,-s)*.3*stride);};
      leg(r.thighL,r.shinL,r.footL,ph);leg(r.thighR,r.shinR,r.footR,ph+Math.PI);
      r.spine.rotation.set(.06+run*.1-cr*.1+fl*.25,-Math.sin(ph)*.06*stride,0);
      r.chest.rotation.set(-aimPitch*.6*a-this.kick*.5+fl*.4+.04,(.42*a)+Math.sin(t*1.1+this.index)*.02-Math.sin(ph)*.05*stride,0);
      r.head.rotation.set(-aimPitch*.35*a-.05,-.36*a+(a<.3?Math.sin(t*.45+this.index*1.7)*.5*(1-a):0),0);
      // Arms: low-ready blends into a shouldered firing stance.
      const L=(v0,v1)=>S.lerp(v0,v1,a);
      r.armR.rotation.set(L(-.35,-1.05),L(0,-.18),L(.28,.5));r.foreR.rotation.set(L(-1.2,-1.55),0,L(.5,.2));
      r.armL.rotation.set(L(-.55,-1.32),L(0,.2),L(-.35,-.78));r.foreL.rotation.set(L(-.75,-.42),0,L(-.55,-.2));
      r.gun.position.set(L(-.02,-.085),L(-.12,.13),L(.2,.27));r.gun.rotation.set(L(.62,0)-this.kick*.7,L(-.3,-.42),L(.2,0));
      if(Math.floor(ph/Math.PI)!==Math.floor(was/Math.PI)&&this.speed>.8){const d=this.pos.distanceTo(g.player.pos);if(d<30){g.fx.puff(S.v(this.pos.x,this.pos.y+.06,this.pos.z),.35,1);if(d<16)g.audio.enemyStep(this.pos,g.player);}}
    }
  };

  // Pool and squad-level helpers.
  S.Enemies=class{
    constructor(game){this.game=game;this.list=[];for(let i=0;i<12;i++)this.list.push(new S.Enemy(game,i,'trooper'));for(let i=0;i<6;i++)this.list.push(new S.Enemy(game,12+i,'elite'));}
    spawn(kind,x,z,opts){const e=this.list.find(o=>o.kind===kind&&!o.active)||this.list.find(o=>o.kind===kind&&!o.alive);if(!e)return null;e.spawn(x,z,opts);return e;}
    reset(){for(const e of this.list)e.despawn();}
    get living(){let n=0;for(const e of this.list)if(e.active&&e.alive)n++;return n;}
    alertNear(pos,radius,target){for(const e of this.list)if(e.active&&e.alive&&e.state!=='fight'&&e.pos.distanceTo(pos)<radius)e.hear(target,true);}
    alertAll(target){for(const e of this.list)if(e.active&&e.alive)e.hear(target,true);}
    noise(pos,radius){for(const e of this.list)if(e.active&&e.alive&&e.pos.distanceTo(pos)<radius)e.hear(pos,true);}
    inCombat(){for(const e of this.list)if(e.active&&e.alive&&e.state==='fight')return true;return false;}
    rayHit(o,d,max){let best=null;for(const e of this.list){const h=e.rayHit(o,d,max);if(h&&(!best||h.t<best.t)){best=h;best.enemy=e;}}return best;}
    update(dt){for(const e of this.list){if(this.game.state!=='playing'&&this.game.state!=='outro')break;e.update(dt);}}
    snapshot(){return this.list.filter(e=>e.active).map(e=>({i:e.index,kind:e.kind,alive:e.alive,x:e.pos.x,z:e.pos.z,yaw:e.yaw,health:e.health,state:e.state==='dead'?'dead':e.state,group:e.group,patrol:e.patrol,aware:e.aware}));}
    restore(list){this.reset();for(const s of list){const e=this.list[s.i];e.spawn(s.x,s.z,{yaw:s.yaw,group:s.group,patrol:s.patrol,alert:s.state==='fight'});e.health=s.health;if(!s.alive){e.alive=false;e.state='dead';e.deathTime=5;e.fall=s.i%3;}}}
  };
  S.makeSoldier=makeSoldier;
})(window.Spice,window.THREE);
