'use strict';
/* Ornithopter: glazed insect cockpit, slender tail boom and six blade wings that
 * beat instead of spinning. Phases: away -> inbound -> hover -> descend -> landed
 * -> depart. extraction.js decides when; this module flies and animates it. */
(function(S,T){
  const K=S.Kit,C=K.C,M=S.SURF,ease=t=>t*t*(3-2*t);
  S.Thopter=class{
    constructor(world){
      this.world=world;const kit=S.mats.kit,root=this.root=new T.Group(),body=this.body=new T.Group();root.add(body);world.group.add(root);
      const hull='#6f6a58',dark=C.dark,b=new S.Batch();
      // Cabin, nose and tail built from stretched spheres (local +z is the nose).
      b.tint(hull).sphere(kit,0,2.2,.4,1,1.35,1.25,3.3,22,14).sphere(kit,0,2.05,-3.2,1,.95,.9,3.0,18,12);
      b.tint(dark).sphere(kit,0,1.75,.6,1,1.2,.55,2.9,18,10);
      b.tint(hull).cyl(kit,0,2.25,-8.2,.42,7.4,14,'z',.16).tint(dark).cbox(kit,0,2.25,-11.7,.18,1.5,1.3,.05).cbox(kit,0,2.9,-11.5,2.6,.1,.9,.03);
      // Cockpit framing over the glass.
      b.tint(dark);for(let i=0;i<5;i++){const a=-1.0+i*.5;b.push(0,2.25,3.1,0,0,a).add(kit,S.geo.torus(1.02,.045,6,18,Math.PI),0,0,0,Math.PI/2-.25,0,0,1,1.35,1).pop();}
      b.add(kit,S.geo.torus(1.2,.06,6,24),0,2.2,2.25,0,0,0,1.06,.98,1);
      // Dorsal engine pack and wing roots.
      b.tint(dark).cbox(kit,0,3.55,-.6,1.9,.75,4.6,.22);b.tint(C.gun);for(const s of [-1,1]){b.cyl(kit,s*.62,3.6,-3.3,.34,1.3,14,'z');b.tint(C.black,M.polymer).cyl(kit,s*.62,3.6,-4.0,.3,.1,14,'z').tint(C.gun);}
      b.tint(C.black,M.polymer);for(let i=0;i<8;i++)b.cbox(kit,0,3.95,-2.2+i*.42,1.5,.05,.2,.015);
      // Side door frame (port side, local -x), sensor chin, exhausts.
      b.tint(dark).cbox(kit,-1.33,2.05,-.6,.08,1.75,1.5,.03).tint(C.amber,0,.9).cbox(kit,-1.39,3.0,-.6,.03,.06,1.3,.01);
      b.tint(C.gun).sphere(kit,0,1.25,2.9,.34,1,.8,1.2).tint(C.black,M.polymer).sphere(kit,0,1.18,3.2,.16);
      // Landing gear.
      for(const [gx,gz] of [[-1.5,1.6],[1.5,1.6],[0,-4.6]]){b.tint(C.steel,M.metal).beam(kit,[gx*.6,1.5,gz],[gx,.25,gz],.07,8).tint(dark).beam(kit,[gx*.75,1.9,gz+.5],[gx,.6,gz],.045,6).cbox(kit,gx,.1,gz,.6,.2,.9,.06);}
      K.decal(b,S.insignia.glyphs(71,4,'#d9c9a6'),1.36,2.3,-1.4,1,0,-.1,1.8);
      b.build(body,{name:'thopter'});S.insignia.build(body);
      const glass=new T.Mesh(S.geo.sphere(1,22,14),S.mats.glass);glass.scale.set(1.18,1.05,1.75);glass.position.set(0,2.3,2.55);body.add(glass);
      // Door leaf slides aft.
      const d=new S.Batch();d.tint(hull).cbox(kit,0,0,0,.07,1.65,1.4,.03).tint(dark).cbox(kit,-.04,.2,0,.03,.5,.7,.01);this.door=new T.Group();this.door.position.set(-1.36,2.05,-.6);d.build(this.door);body.add(this.door);
      // Six wings: thin tapered blades on root pivots.
      this.wings=[];
      const blade=S.geo.custom('blade',()=>{const s=new T.Shape();s.moveTo(0,-.22);s.lineTo(1.4,-.34);s.lineTo(8.6,-.2);s.quadraticCurveTo(9.2,0,8.6,.16);s.lineTo(1.2,.3);s.lineTo(0,.2);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.045,bevelEnabled:false});g.rotateX(-Math.PI/2);return g;});
      for(const s of [-1,1])for(let i=0;i<3;i++){
        const pivot=new T.Group();pivot.position.set(s*.85,3.75,1.1-i*1.45);body.add(pivot);
        const w=new S.Batch();w.tint('#55524a').add(kit,blade,0,0,0,0,0,0,1,1,1).tint(dark).cyl(kit,.25,.02,0,.16,.5,10,'x').tint(C.steel,M.metal).beam(kit,[.4,.05,0],[8.2,.05,-.02],.035,5);
        const arm=new T.Group();w.build(arm);if(s<0)arm.scale.x=-1;pivot.add(arm);this.wings.push({pivot,arm,s,i});
      }
      // Running lights.
      this.lightMat=new T.MeshBasicMaterial({color:'#8fd8ff',toneMapped:false});for(const [lx,ly,lz] of [[-1.3,1.6,2.2],[1.3,1.6,2.2],[0,3.1,-11.8]]){const m=new T.Mesh(S.geo.sphere(1,8,6),this.lightMat);m.scale.setScalar(.07);m.position.set(lx,ly,lz);body.add(m);}
      this.flood=new T.SpotLight('#cfe9ff',0,60,.6,.6,1.2);this.flood.position.set(0,1.4,2.6);this.flood.target.position.set(0,-8,6);body.add(this.flood,this.flood.target);
      this.box=world.collision.add(world.points.pad.x,world.points.pad.y-.3,world.points.pad.z,8.5,4.2,3.4,'thopter');this.box.off=true;
      root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});glass.castShadow=false;
      world.thopter=this;this.reset();
    }
    reset(){this.phase='away';this.t=0;this.flap=0;this.beat=0;this.doorOpen=0;this.root.visible=false;this.box.off=true;this.speed=0;this.altitude=99;}
    padPose(){const p=this.world.points.pad;return {pos:new T.Vector3(p.x,p.y+.02,p.z),yaw:Math.PI/2};}
    // Begin the approach; arrival takes `seconds` of game time.
    call(seconds){this.phase='inbound';this.t=0;this.duration=seconds;this.root.visible=true;}
    depart(){this.phase='depart';this.t=0;this.box.off=true;}
    get landed(){return this.phase==='landed';}
    get progress(){return this.phase==='inbound'?S.clamp(this.t/this.duration,0,1):this.phase==='away'?0:1;}
    showcase(mode){this.root.visible=true;const p=this.padPose();this.root.position.copy(p.pos);this.root.rotation.y=p.yaw;if(mode==='fly'){this.phase='hold';this.root.position.y+=9;}else{this.phase='landed';this.doorOpen=1;}}
    update(dt,time){
      if(this.phase==='away')return;
      const pad=this.padPose(),r=this.root;this.t+=dt;let flight=1;
      if(this.phase==='inbound'){
        // Long curving approach from the north-east, bleeding height, then a hover and descent.
        const u=S.clamp(this.t/this.duration,0,1),far=new T.Vector3(310,95,-520),mid=new T.Vector3(70,46,-170),over=pad.pos.clone().add(S.v(0,13,0));
        const cruise=S.clamp(u/.8,0,1),e=ease(cruise),a=far.clone().lerp(mid,e),c=mid.clone().lerp(over,e),p=a.lerp(c,e);
        if(u>.8){const dsc=ease((u-.8)/.2);p.copy(over).lerp(pad.pos,dsc);}
        const prev=r.position.clone();r.position.copy(p);
        const dir=p.clone().sub(prev);this.speed=dir.length()/Math.max(dt,1e-4);
        const wantYaw=cruise<.97?Math.atan2(over.x-a.x,over.z-a.z):pad.yaw;r.rotation.y+=S.angleDelta(u>.8?pad.yaw:wantYaw,r.rotation.y)*(1-Math.exp(-dt*(u>.8?2.2:4)));
        this.body.rotation.x=S.damp(this.body.rotation.x,u>.8?0:.16*(1-cruise),2,dt);this.body.rotation.z=S.damp(this.body.rotation.z,Math.sin(time*.7)*.03,2,dt);
        if(u>=1){this.phase='landed';this.t=0;r.position.copy(pad.pos);r.rotation.y=pad.yaw;this.box.off=false;}
      }else if(this.phase==='landed'){
        flight=Math.max(.16,1-this.t/2.5);this.doorOpen=S.damp(this.doorOpen,1,2.5,dt);this.body.rotation.x=S.damp(this.body.rotation.x,0,3,dt);this.body.rotation.z=S.damp(this.body.rotation.z,0,3,dt);this.speed=0;
      }else if(this.phase==='depart'){
        const u=this.t;this.doorOpen=S.damp(this.doorOpen,0,3,dt);flight=1;
        const climb=Math.min(u,3)*1.5+Math.max(0,u-3)*5.5+Math.pow(Math.max(0,u-1),2)*.35;
        const fwd=Math.pow(Math.max(0,u-2.2),2)*2.1;const yaw=pad.yaw+S.smooth(1.5,7,u)*.9;
        r.rotation.y=yaw;r.position.set(pad.pos.x+Math.sin(yaw)*fwd,pad.pos.y+climb,pad.pos.z+Math.cos(yaw)*fwd);
        this.body.rotation.x=S.damp(this.body.rotation.x,S.smooth(2,6,u)*.2,2,dt);this.body.rotation.z=S.damp(this.body.rotation.z,-S.smooth(1.5,6,u)*.16,2,dt);this.speed=10;
      }else if(this.phase==='hold'){r.position.y=pad.pos.y+9+Math.sin(time*.9)*.25;}
      this.altitude=r.position.y-this.world.ground(r.position.x,r.position.z);
      // Wings: fast shallow beat in flight, slow settle when landed; folded aft on the ground.
      this.flap=S.damp(this.flap,flight,2.2,dt);this.beat+=dt*(18+this.flap*46);
      for(const w of this.wings){
        const sweep=S.lerp(1.05,(w.i-1)*.42,this.flap),amp=.07+.36*this.flap,ph=this.beat+w.i*2.1+(w.s>0?0:.5);
        w.pivot.rotation.set(0,w.s*sweep,w.s*(Math.sin(ph)*amp+.05*this.flap));w.arm.rotation.x=Math.cos(ph)*.3*this.flap;
      }
      this.door.position.z=-.6-this.doorOpen*1.45;this.lightMat.color.setRGB(1.2,2.4+Math.sin(time*6)*1.2,3);
      this.flood.intensity=this.altitude<30&&this.phase!=='landed'?260:0;
    }
  };
})(window.Spice,window.THREE);
