'use strict';
/* Six original outpost guards. Jointed gait, flinch, strafing, telegraphed
 * three-shot bursts and a reload recovery. These are game-state machines. */
(function(S,T){
  S.makeTrooper=function(index){
    const root=new T.Group(),body=new T.Group();root.add(body);
    const armor=S.weatherMaterial(S.material(index%2?'#464c48':'#303b3c',.53,.48),'metal',3);
    const edge=S.weatherMaterial(S.material('#797d70',.49,.58),'metal',3);
    const cloth=S.weatherMaterial(S.material('#595647',.96),'cloth',2);
    const black=S.material('#151f22',.78,.2),gold=S.material('#ab956e',.55,.65);
    const torso=new T.Group();torso.position.set(0,1.17,0);body.add(torso);
    const chest=S.mesh(torso,S.bevelBox(.49,.55,.29,.055),armor,0,.03,0);chest.rotation.x=.07;
    for(const side of [-1,1]){
      const plate=S.mesh(torso,S.bevelBox(.19,.23,.075,.017),edge,side*.125,.115,.16);plate.rotation.z=side*.11;
      S.beam(torso,black,[side*.19,.18,.19],[side*.17,-.19,.19],.016);
      for(let i=0;i<3;i++)S.mesh(torso,S.bevelBox(.20,.035,.06,.008),armor,side*.12,-.08-i*.045,.15);
    }
    S.box(torso,black,0,-.29,0,.46,.095,.32);S.mesh(torso,S.bevelBox(.09,.06,.035,.008),gold,0,-.29,.178);
    for(const side of [-1,1]){S.mesh(torso,S.bevelBox(.13,.19,.11,.015),cloth,side*.25,-.27,.16);S.beam(torso,black,[side*.18,.15,-.16],[side*.18,-.25,-.24],.025);}
    S.mesh(torso,S.bevelBox(.34,.47,.13,.04),black,0,.05,-.21);
    const head=new T.Group();head.position.set(0,1.73,0);body.add(head);
    const helm=S.mesh(head,new T.SphereGeometry(.215,24,16),armor,0,0,0);helm.scale.set(.94,1.16,.92);
    const collar=S.cylinder(body,black,0,1.49,0,.16,.12,16);
    S.mesh(head,S.bevelBox(.315,.113,.065,.018),black,0,.015,.17);
    const visor=S.mesh(head,S.bevelBox(.27,.022,.01,.003),new T.MeshBasicMaterial({color:'#ba956d',toneMapped:false}),0,.041,.207,false);
    S.mesh(head,S.bevelBox(.17,.14,.085,.025),edge,0,-.115,.175);
    for(const side of [-1,1]){
      S.beam(head,black,[side*.07,-.12,.2],[side*.20,-.20,.05],.021);
      S.cylinder(head,black,side*.205,-.05,.02,.045,.028,12).rotation.z=Math.PI/2;
      S.box(head,gold,side*.12,-.095,.218,.015,.025,.006);
    }
    // Hit zone identity follows the moving head, instead of a static y threshold.
    head.traverse(o=>{if(o.isMesh)o.userData.hitZone='head';});
    const legs=[],knees=[],ankles=[];
    for(const side of [-1,1]){
      const hip=new T.Group();hip.position.set(side*.145,.91,0);body.add(hip);
      S.mesh(hip,new T.CapsuleGeometry(.086,.25,5,10),cloth,0,-.20,0);
      S.mesh(hip,S.bevelBox(.16,.27,.055,.023),armor,0,-.18,.087);
      const knee=new T.Group();knee.position.set(0,-.42,0);hip.add(knee);knees.push(knee);
      S.mesh(knee,new T.SphereGeometry(.085,12,8),black,0,0,0);
      S.mesh(knee,S.bevelBox(.17,.12,.07,.023),edge,0,.015,.091);
      S.mesh(knee,new T.CapsuleGeometry(.075,.20,5,10),cloth,0,-.19,0);
      S.mesh(knee,S.bevelBox(.15,.25,.07,.024),armor,0,-.19,.073);
      const ankle=new T.Group();ankle.position.set(0,-.37,.015);knee.add(ankle);ankles.push(ankle);
      S.mesh(ankle,S.bevelBox(.18,.13,.29,.03),black,0,-.045,.056);
      S.box(ankle,edge,0,-.103,.06,.17,.018,.27);legs.push(hip);
    }
    // Shoulder joints and a supported rifle grip move with torso yaw and recoil.
    const arms=[];
    for(const side of [-1,1]){
      const shoulder=new T.Group();shoulder.position.set(side*.295,.205,0);torso.add(shoulder);arms.push(shoulder);
      S.mesh(shoulder,new T.SphereGeometry(.11,12,10),cloth,0,-.04,0);
      S.mesh(shoulder,S.bevelBox(.19,.19,.26,.04),armor,side*.016,.025,.012);
      const elbow=S.v(side===1?-.055:.055,-.255,.17);
      S.beam(shoulder,cloth,[0,-.05,0],elbow,.071);
      S.mesh(shoulder,new T.SphereGeometry(.075,12,8),armor,elbow.x,elbow.y,elbow.z);
      const wrist=side===1?S.v(-.16,-.13,.40):S.v(.34,-.13,.55);
      S.beam(shoulder,cloth,elbow,wrist,.061);S.mesh(shoulder,new T.SphereGeometry(.062,12,8),black,wrist.x,wrist.y,wrist.z);
    }
    const rifle=new T.Group();rifle.position.set(.115,.09,.43);torso.add(rifle);
    S.mesh(rifle,S.bevelBox(.095,.105,.54,.015),black,0,0,0);
    S.box(rifle,edge,0,.062,.07,.045,.022,.28);
    S.beam(rifle,edge,[0,0,.25],[0,0,.49],.023);
    S.mesh(rifle,S.bevelBox(.075,.18,.12,.012),armor,0,-.12,-.07);
    const flash=new T.Sprite(new T.SpriteMaterial({map:S.softTexture(),color:'#ffcc87',blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));flash.position.set(0,0,.51);flash.scale.set(.2,.2,1);flash.visible=false;rifle.add(flash);
    const capeGeo=new T.PlaneGeometry(.65,.87,10,12),cp=capeGeo.attributes.position;
    for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i);cp.setXYZ(i,x*(1.+(.43-y)*.21),y,Math.cos(x*5)*-.07+Math.sin(x*40)*.013);}
    capeGeo.computeVertexNormals();const cm=S.weatherMaterial(S.material('#595341',.98),'cloth',2);cm.side=T.DoubleSide;
    const cape=S.mesh(body,capeGeo,cm,0,1.10,-.24);const capeRest=Array.from(cp.array);
    root.userData={body,torso,legs,knees,ankles,head,visor,rifle,arms,cape,capeRest,flash};return root;
  };
  S.Enemy=class{
    constructor(game,index,x,z,wave=0){this.game=game;this.index=index;this.wave=wave;this.home=S.v(x,0,z);this.root=S.makeTrooper(index);game.scene.add(this.root);this.root.traverse(o=>{if(o.isMesh)o.userData.enemy=this;});this.reset();}
    reset(){
      this.pos=this.home.clone();this.pos.y=this.game.world.ground(this.pos.x,this.pos.z);this.root.position.copy(this.pos);this.root.rotation.set(0,0,0);
      const r=this.root.userData;r.body.rotation.set(0,0,0);r.body.position.set(0,0,0);r.torso.rotation.set(0,0,0);r.head.rotation.set(0,0,0);r.flash.visible=false;
      this.health=78;this.alive=true;this.active=this.wave===0;this.root.visible=this.active;this.timer=1.5+this.index*.19;this.windup=0;this.flinch=0;this.deathTime=0;this.walk=0;this.shots=0;this.burstLeft=0;this.burstTimer=0;this.kick=0;this.muzzleTime=0;this.state='patrol';this.speed=0;this.stuck=0;this.footPhase=0;
      r.visor.material.color.set('#ba956d');[...r.legs,...r.knees,...r.ankles,...r.arms].forEach(l=>l.rotation.set(0,0,0));
    }
    activate(){this.active=true;this.root.visible=true;this.timer=1.8+this.index*.1;this.state='approach';}
    hit(damage,headshot=false){
      if(!this.alive||!this.active)return;this.health-=damage;this.flinch=.26;this.timer=Math.max(this.timer,.48);this.windup=0;this.burstLeft=0;this.state='stagger';
      if(this.health<=0){this.alive=false;this.state='down';this.game.kills++;this.game.audio.kill();this.game.fx.dust(this.pos.clone().add(S.v(0,.18,0)),.7,3);this.game.notify(headshot?'精準命中':'守衛失去戰鬥能力',1.2);}
    }
    animate(dt,velocity,aimPitch=0){
      const r=this.root.userData,t=this.game.time,motion=this.game.motionReduced?.35:1;
      this.speed=S.damp(this.speed,velocity,9,dt);this.walk+=this.speed*dt*5.7;
      const stride=Math.min(1,this.speed/1.65),phase=Math.sin(this.walk),bob=Math.abs(Math.cos(this.walk))*.02*stride;
      r.legs[0].rotation.x=phase*.39*stride;r.legs[1].rotation.x=-phase*.39*stride;
      r.knees[0].rotation.x=Math.max(0,-phase)*.62*stride+.035;r.knees[1].rotation.x=Math.max(0,phase)*.62*stride+.035;
      r.ankles[0].rotation.x=-r.knees[0].rotation.x*.5;r.ankles[1].rotation.x=-r.knees[1].rotation.x*.5;
      r.body.position.y=bob; r.body.rotation.z=Math.sin(this.walk)*.02*stride;
      r.body.rotation.x=Math.sin(this.flinch*18)*.13;
      const crouch=this.state==='reload'?.11:0;r.body.position.y-=crouch;
      r.torso.rotation.y=Math.sin(t*1.3+this.index)*.016;
      r.torso.rotation.x=S.damp(r.torso.rotation.x,-aimPitch*.55-this.kick,13,dt);
      r.head.rotation.x=S.damp(r.head.rotation.x,-aimPitch*.4,8,dt);
      r.rifle.rotation.x=-this.kick*.45+(this.state==='reload'?.25:0);
      r.arms[0].rotation.x=this.state==='reload'?-.22:0;
      const p=r.cape.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const x=r.capeRest[i*3],y=r.capeRest[i*3+1],z=r.capeRest[i*3+2];p.setZ(i,z+(Math.sin(t*2.8+x*9+y*2+this.index)*.025+Math.sin(this.walk)*.025*stride)*(.45-y)*motion);}p.needsUpdate=true;
      if(this.speed>.4&&Math.floor(this.walk/Math.PI)!==this.footPhase){this.footPhase=Math.floor(this.walk/Math.PI);if(this.pos.distanceTo(this.game.player.pos)<28)this.game.fx.dust(this.pos.clone().add(S.v(0,.08,0)),.28,1);}
    }
    shoot(target,dist){
      const game=this.game,r=this.root.userData;
      const from=this.pos.clone().add(S.v(Math.sin(this.root.rotation.y)*.85,1.25,Math.cos(this.root.rotation.y)*.85));
      const end=target.clone(),accurate=S.rand()<.43;
      if(!accurate)end.add(S.v(S.range(-1.8,1.8),S.range(-.8,.8),S.range(-.7,.7)));
      game.fx.tracer(from,end,'#ffc189');game.audio.enemyShot(this.pos,game.player);
      this.shots++;this.kick=.095;this.muzzleTime=.07;
      if(accurate&&game.world.collision.visible(from,target))game.damage(dist>25?4:5,this.pos);
    }
    update(dt){
      if(!this.active)return;const game=this.game,r=this.root.userData,dist=this.pos.distanceTo(game.player.pos);
      this.muzzleTime=Math.max(0,this.muzzleTime-dt);r.flash.visible=this.muzzleTime>0;this.kick=S.damp(this.kick,0,17,dt);
      if(!this.alive){this.deathTime+=dt;r.body.rotation.x=S.damp(r.body.rotation.x,-1.48,6,dt);r.body.rotation.z=S.damp(r.body.rotation.z,this.index%2?.12:-.13,5,dt);r.body.position.y=S.damp(r.body.position.y,.16,6,dt);r.visor.material.color.set('#151c1c');r.flash.visible=false;return;}
      this.flinch=Math.max(0,this.flinch-dt);
      const alert=game.player.pos.z<23||game.shots>0;
      if(!alert||dist>58){this.animate(dt,0);return;}
      const dx=game.player.pos.x-this.pos.x,dz=game.player.pos.z-this.pos.z,desired=Math.atan2(dx,dz);
      const turn=Math.atan2(Math.sin(desired-this.root.rotation.y),Math.cos(desired-this.root.rotation.y));this.root.rotation.y+=turn*(1-Math.exp(-dt*8));
      const eye=this.pos.clone().add(S.v(0,1.55,0)),target=game.player.eye(),visible=game.world.collision.visible(eye,target);
      let speed=0;
      if(this.flinch>0){this.state='stagger';}
      else if(this.burstLeft===0 && this.windup===0){
        const old=this.pos.clone();
        if(dist>16||!visible){
          this.state='approach';const inv=1/Math.max(Math.hypot(dx,dz),.01),steer=(Math.sin(game.time*.65+this.index*2)*.35+(this.stuck>.4?(this.index%2?1:-1)*1.2:0));
          game.world.collision.move(this.pos,(dx*inv+Math.cos(desired)*steer)*1.6*dt,(dz*inv-Math.sin(desired)*steer)*1.6*dt,.37);
        }else if(dist>6&&this.timer<1.4){
          this.state='strafe';const dir=this.index%2?1:-1;game.world.collision.move(this.pos,Math.cos(desired)*dir*.72*dt,-Math.sin(desired)*dir*.72*dt,.37);
        }else this.state='reload';
        speed=this.pos.distanceTo(old)/Math.max(dt,.001);this.stuck=speed<.2?this.stuck+dt:0;
      }
      this.pos.y=game.world.ground(this.pos.x,this.pos.z);this.root.position.copy(this.pos);this.timer-=dt;
      if(visible&&dist<43&&this.flinch===0){
        if(this.burstLeft>0){this.state='burst';this.burstTimer-=dt;if(this.burstTimer<=0){this.shoot(target,dist);this.burstLeft--;this.burstTimer=.16;if(this.burstLeft===0){this.timer=2.2+S.rand()*.9;this.state='reload';}}}
        else if(this.timer<=0){this.state='aim';this.windup+=dt;r.visor.material.color.set('#ffbc79');if(this.windup>.65){this.burstLeft=3;this.burstTimer=0;this.windup=0;}}
      }else{this.windup=0;this.burstLeft=0;}
      if(this.state!=='aim')r.visor.material.color.set(this.state==='burst'?'#ffd4a1':'#ba956d');
      this.animate(dt,speed,Math.atan2(target.y-eye.y,Math.max(dist,.1)));
    }
  };
})(window.Spice,window.THREE);
