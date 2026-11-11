'use strict';
/* First-person K-18 maula carbine and stillsuit arms.
 * Separate rigid groups (gun, magazine, bolt, support arm) are posed every frame
 * by poseWeapon(): hip/ADS blend, inertia sway, stride bob, sprint carry, landing
 * dip, spring recoil, a four-beat reload and a lowered carry while interacting. */
(function(S,T){
  const K=S.Kit,C=K.C,M=S.SURF;
  const SIGHT_Y=.0935,SIGHT_Z=-.02;
  S.makeWeapon=function(){
    const kit=S.viewKit=S.kitMaterial({dust:.26,key:'vm',env:1.25,glow:5,scale:7,wear:.34});
    const root=new T.Group(),gun=new T.Group();root.add(gun);
    const steel='#3a4043',edge='#7d8385',ceramic='#6b6252',brass='#9c7a3e',cloth='#5d5341',glove='#2f2b26',suit='#4a4438',plate='#3d3a33';
    const b=new S.Batch();
    // Receiver and upper.
    b.tint(steel).cbox(kit,0,0,-.03,.05,.078,.34,.008).cbox(kit,0,.048,-.07,.044,.03,.26,.006);
    b.tint(ceramic).cbox(kit,0,-.004,-.36,.052,.062,.33,.01);                         // handguard
    b.tint(steel).cbox(kit,0,.033,-.36,.036,.02,.33,.004);                           // top strap
    for(let i=0;i<9;i++){b.tint(C.black,M.polymer);for(const s of [-1,1])b.cbox(kit,s*.0265,.006,-.225-i*.033,.003,.022,.02,.002);b.tint(steel).cbox(kit,0,.046,-.212-i*.033,.03,.008,.014,.002);}
    b.tint(steel);for(let i=0;i<7;i++)b.cbox(kit,0,.068,-.16+i*.033,.03,.008,.014,.002);  // receiver rail
    // Left-side furniture: recessed panel, bolt release, lightening cuts, sling stud.
    b.tint(C.black,M.polymer).cbox(kit,-.0255,.004,-.075,.003,.04,.13,.002);b.tint(steel).cbox(kit,-.0275,.004,-.075,.002,.028,.11,.002);
    b.tint(edge,M.metal).cbox(kit,-.028,.018,.04,.004,.014,.03,.002).cyl(kit,-.027,-.02,.12,.006,.006,8,'x');
    for(let i=0;i<4;i++)b.tint(C.black,M.polymer).cbox(kit,-.0262,-.022,-.13+i*.03,.003,.008,.018,.001,0,0,0);
    b.tint(brass,M.metal).cbox(kit,-.0275,.03,-.16,.003,.006,.04,.001);
    for(const s of [-1,1]){b.tint(steel).cbox(kit,s*.027,-.004,-.36,.004,.012,.3,.002);for(let i=0;i<8;i++)b.tint(C.black,M.polymer).cbox(kit,s*.0295,-.004,-.24-i*.032,.002,.008,.012,.001);}
    // Barrel, gas block and ported muzzle brake.
    b.tint(steel).cyl(kit,0,.008,-.61,.0115,.2,14,'z').cbox(kit,0,.014,-.545,.03,.04,.035,.005);
    b.tint(edge,M.metal).add(kit,S.geo.lathe([[.012,0],[.019,.004],[.019,.03],[.0165,.034],[.0165,.05],[.019,.054],[.019,.078],[.014,.082],[.0085,.082]],16,'brake'),0,.008,-.708,-Math.PI/2,0,0);
    b.tint(C.black,M.polymer);for(const s of [-1,1])for(const z of [-.725,-.749,-.773])b.cbox(kit,s*.0185,.008,z,.004,.012,.012,.001);
    // Fremen cloth wrap and cord on the handguard.
    b.tint(cloth,M.cloth);for(let i=0;i<5;i++)b.cyl(kit,0,-.004,-.42-i*.021,.0405+((i%2)*.0015),.023,10,'z');
    b.tint('#8a3d22',M.cloth).cyl(kit,0,-.004,-.398,.042,.008,10,'z').cyl(kit,0,-.004,-.512,.042,.008,10,'z');
    // Lower: grip, trigger group, magazine well.
    b.tint(steel).cbox(kit,0,-.052,-.065,.046,.04,.1,.006);
    b.tint(C.rubber,M.polymer).cbox(kit,0,-.095,.078,.04,.12,.05,.012,.3,0,0);
    b.tint(steel).beam(kit,[0,-.04,.05],[0,-.085,.035],.004,6).beam(kit,[0,-.085,.035],[0,-.085,-.005],.004,6).beam(kit,[0,-.085,-.005],[0,-.045,-.012],.004,6);
    b.tint(brass,M.metal).cbox(kit,0,-.058,.028,.006,.03,.008,.002,.25,0,0);
    // Skeleton stock.
    b.tint(steel).cbox(kit,0,-.004,.2,.024,.026,.14,.006).beam(kit,[0,-.03,.14],[0,-.055,.3],.008,8).cbox(kit,0,-.02,.31,.034,.12,.03,.008);
    b.tint(C.rubber,M.polymer).cbox(kit,0,-.02,.33,.038,.125,.018,.006);
    // Ejection port, forward assist, selector, pins.
    b.tint(C.black,M.polymer).cbox(kit,.0255,.022,-.06,.003,.022,.07,.002);
    b.tint(edge,M.metal);for(const z of [-.15,.02,.09])for(const s of [-1,1])b.cyl(kit,s*.0255,-.012,z,.005,.004,8,'x');
    b.tint(brass,M.metal).cbox(kit,-.027,-.018,.045,.004,.008,.022,.002,0,0,.5);
    b.tint(edge,M.metal).cbox(kit,0,.024,-.522,.008,.05,.008,.002).cbox(kit,0,.05,-.522,.02,.006,.012,.002);   // front post
    // Reflex sight: base, hood, emitter.
    b.tint(steel).cbox(kit,0,.071,SIGHT_Z,.036,.012,.07,.003);
    for(const s of [-1,1])b.cbox(kit,s*.0205,SIGHT_Y+.003,SIGHT_Z-.012,.004,.046,.034,.002);
    b.cbox(kit,0,SIGHT_Y+.027,SIGHT_Z-.012,.045,.004,.034,.002).cbox(kit,0,.082,SIGHT_Z+.024,.03,.012,.018,.003);
    b.tint(brass,M.metal).cyl(kit,.028,.08,SIGHT_Z+.02,.006,.008,8,'x');
    // Grip hand: palm, wrapped fingers, thumb, cuff and forearm.
    b.tint(glove,M.polymer).cbox(kit,.012,-.085,.098,.062,.1,.05,.018,.3,0,0);
    for(let i=0;i<3;i++){const y=-.062-i*.024;b.beam(kit,[.03,y,.07+i*.008],[-.008,y,.04+i*.008],.0105,8,.0095).beam(kit,[-.008,y,.04+i*.008],[-.03,y+.004,.062+i*.008],.0095,8,.0085);b.tint(plate).cbox(kit,.014,y,.052+i*.008,.022,.017,.014,.004,0,.6,0).tint(glove,M.polymer);}
    b.beam(kit,[.03,-.038,.07],[.008,-.04,.03],.0105,8,.009);                                   // trigger finger
    b.beam(kit,[.02,-.05,.11],[-.026,-.022,.085],.0125,8,.01);                                  // thumb
    b.tint(suit,M.cloth).beam(kit,[.03,-.13,.13],[.12,-.33,.42],.045,14,.062);
    b.tint(plate).cyl(kit,.043,-.152,.158,.05,.03,14,'z');for(let i=0;i<5;i++)b.tint(C.rubber,M.polymer).beam(kit,[.058+i*.014,-.185-i*.031,.2+i*.045],[.063+i*.014,-.196-i*.031,.216+i*.045],.057+i*.003,14);
    b.build(gun,{cast:false,receive:false});
    K.decal({m:new T.Matrix4()},S.insignia.glyphs(81,3,'#b9a57a'),.0256,.004,.03,1,0,0,.07);K.decal({m:new T.Matrix4()},S.insignia.text('K-18','#b9a57a'),-.0256,.004,-.02,-1,0,0,.06);S.insignia.build(gun);
    // Bolt carrier with charging handle.
    const bolt=new T.Group();const bb=new S.Batch();bb.tint(edge,M.metal).cbox(kit,.024,.022,-.06,.004,.018,.06,.002).tint(brass,M.metal).cyl(kit,.034,.022,-.04,.005,.018,8,'x');bb.build(bolt,{cast:false,receive:false});gun.add(bolt);
    // Magazine with witness window.
    const mag=new T.Group();mag.position.set(0,-.07,-.068);const mb=new S.Batch();
    mb.tint(steel).cbox(kit,0,-.07,-.006,.03,.15,.064,.006,-.1,0,0).tint(edge,M.metal).cbox(kit,0,-.149,-.014,.034,.012,.07,.003,-.1,0,0);
    mb.tint(brass,M.metal,.15);for(const s of [-1,1])mb.cbox(kit,s*.0155,-.07,-.006,.002,.09,.012,.001,-.1,0,0);
    mb.tint(steel);for(let i=0;i<4;i++)for(const s of [-1,1])mb.cbox(kit,s*.0158,-.03-i*.028,.014,.002,.004,.03,.001,-.1,0,0);
    mb.build(mag,{cast:false,receive:false});gun.add(mag);
    // Support arm: hand under the handguard.
    const hand=new T.Group();hand.position.set(0,-.04,-.36);const hb=new S.Batch();
    hb.tint(glove,M.polymer).cbox(kit,-.004,-.012,0,.07,.03,.1,.012);
    for(let i=0;i<4;i++){const z=-.036+i*.024;hb.beam(kit,[.03,-.008,z],[.043,.034,z],.0105,8,.0095).beam(kit,[.043,.034,z],[.03,.058,z],.0095,8,.0085);hb.tint(plate).cbox(kit,.045,.014,z,.012,.022,.018,.003).tint(glove,M.polymer);}
    hb.beam(kit,[-.03,-.008,.03],[-.044,.04,.012],.012,8,.01);
    hb.tint(suit,M.cloth).beam(kit,[-.01,-.03,.04],[-.2,-.2,.42],.043,14,.064);hb.tint(plate).cyl(kit,-.022,-.045,.07,.048,.03,14,'z');
    for(let i=0;i<5;i++)hb.tint(C.rubber,M.polymer).beam(kit,[-.05-i*.03,-.068-i*.027,.13+i*.058],[-.057-i*.03,-.075-i*.027,.146+i*.058],.054+i*.003,14);
    hb.build(hand,{cast:false,receive:false});gun.add(hand);
    // Coated sight glass and etched reticle.
    const glass=new T.Mesh(new T.PlaneGeometry(.037,.04),new T.MeshPhysicalMaterial({color:'#c7a47a',metalness:.3,roughness:.05,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide,envMapIntensity:2}));glass.position.set(0,SIGHT_Y+.004,SIGHT_Z-.026);gun.add(glass);
    const reticle=new T.Group();reticle.position.set(0,SIGHT_Y,SIGHT_Z-.0265);gun.add(reticle);
    const rm=new T.MeshBasicMaterial({color:'#ff7a3c',transparent:true,opacity:.95,toneMapped:false,depthWrite:false,depthTest:false});
    const ring=new T.Mesh(new T.RingGeometry(.0042,.0047,36),rm),dot=new T.Mesh(new T.CircleGeometry(.0009,14),rm);reticle.add(ring,dot);
    for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){const t=new T.Mesh(new T.PlaneGeometry(.0028,.0006),rm);t.position.set(Math.cos(a)*.0068,Math.sin(a)*.0068,0);t.rotation.z=a;reticle.add(t);}
    reticle.traverse(o=>{o.renderOrder=5;});rm.color.multiplyScalar(2.2);
    // Muzzle flash: generated star sprite on crossed cards plus a facing bloom.
    const fc=document.createElement('canvas');fc.width=fc.height=128;const fg=fc.getContext('2d'),fr=S.rng(77);fg.translate(64,64);
    for(let i=0;i<22;i++){const a=fr()*6.28,l=20+fr()*42,w=3+fr()*7,gr=fg.createLinearGradient(0,0,Math.cos(a)*l,Math.sin(a)*l);gr.addColorStop(0,'rgba(255,244,214,.95)');gr.addColorStop(.4,'rgba(255,190,96,.6)');gr.addColorStop(1,'rgba(255,120,30,0)');fg.fillStyle=gr;fg.beginPath();fg.moveTo(Math.cos(a+1.57)*w,Math.sin(a+1.57)*w);fg.lineTo(Math.cos(a)*l,Math.sin(a)*l);fg.lineTo(Math.cos(a-1.57)*w,Math.sin(a-1.57)*w);fg.fill();}
    const core=fg.createRadialGradient(0,0,0,0,0,26);core.addColorStop(0,'rgba(255,255,240,1)');core.addColorStop(1,'rgba(255,200,120,0)');fg.fillStyle=core;fg.fillRect(-64,-64,128,128);
    const ft=new T.CanvasTexture(fc),fm=new T.MeshBasicMaterial({map:ft,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});fm.color.setScalar(3);
    const flash=new T.Group();flash.position.set(0,.008,-.8);gun.add(flash);
    for(let i=0;i<2;i++){const f=new T.Mesh(new T.PlaneGeometry(.11,.3),fm);f.rotation.set(Math.PI/2,0,i*Math.PI/2,'ZXY');f.position.z=-.1;flash.add(f);}
    const face=new T.Mesh(new T.PlaneGeometry(.17,.17),fm);face.position.z=-.02;flash.add(face);flash.visible=false;
    const light=new T.PointLight('#ffc57e',0,2.2,2);light.position.set(.05,.06,-.7);gun.add(light);
    root.userData={gun,mag,bolt,hand,flash,light,reticle,glass,sight:new T.Vector3(0,SIGHT_Y,SIGHT_Z),baseHand:hand.position.clone(),baseMag:mag.position.clone(),muzzle:new T.Vector3(0,.008,-.8)};
    root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
    return root;
  };

  const ez=x=>{x=S.clamp(x,0,1);return x*x*(3-2*x);},seg=(t,a,b)=>ez((t-a)/(b-a));
  S.poseWeapon=function(game,dt){
    const p=game.player,w=game.weapon,u=w.userData,g=u.gun,a=ez(p.aim),motion=game.motionReduced?.3:1;
    const speed=Math.hypot(p.vel.x,p.vel.z),move=Math.min(1,speed/4.6)*(p.grounded?1:.25);
    const sp=game.sprintPose*(1-a),low=Math.max(game.lowerPose,game.equip);
    // Stride: lateral figure-of-eight, stronger when sprinting, nearly still in ADS.
    const k=(1-a*.86)*motion,bx=Math.sin(p.bob)*(.0055+.011*sp)*move*k,by=(Math.abs(Math.cos(p.bob))*(.0065+.012*sp)-.003)*move*k;
    const breathe=Math.sin(game.time*1.3)*.0016*(1-a*.6),sw=game.weaponSway;
    // Reload beats: cant, strip, seat, charge.
    let cant=0,drop=0,reach=0,charge=0;
    if(game.reloadTime>0){const t=1-game.reloadTime/game.reloadDuration;cant=seg(t,0,.14)*(1-seg(t,.82,1));drop=seg(t,.16,.3)*(1-seg(t,.46,.6));reach=seg(t,.1,.26)*(1-seg(t,.62,.74));charge=seg(t,.72,.8)*(1-seg(t,.86,.94));}
    const hipX=.128,hipY=-.142,hipZ=-.37;
    w.position.set(S.lerp(hipX,0,a)+bx+sw.x*.9+sp*.035+low*.05-cant*.035,
      S.lerp(hipY,-u.sight.y,a)-by+breathe+sw.y*.7-sp*.045-low*.16+cant*.035-(game.landPulse||0)*1.4+(p.grounded?0:S.clamp(p.vy*.0035,-.02,.02)),
      S.lerp(hipZ,-.25,a)+(game.kickPosition||0)*(1-a*.35)+sp*.05+low*.06+cant*.03);
    w.rotation.set((game.kickAngle||0)*(1-a*.5)+sw.y*1.5-sp*.38-low*.75+cant*.34-by*1.2,
      S.lerp(.045,0,a)+sw.x*2.2+sp*.85+low*.5-cant*.42+bx*1.5,
      S.lerp(.02,0,a)-sw.x*3.2+sp*.3-cant*.72+bx*2.4+(game.kickRoll||0),'YXZ');
    u.mag.position.set(u.baseMag.x,u.baseMag.y-drop*.26,u.baseMag.z+drop*.03);u.mag.rotation.x=drop*.3;u.mag.visible=drop<.97;
    u.bolt.position.z=Math.min(.055,Math.max(0,(game.kickPosition||0))*4.5)+charge*.05;
    u.hand.position.copy(u.baseHand).add(S.v(-reach*.03+charge*.06,-reach*.075-drop*.2+charge*.11,reach*.2+drop*.06+charge*.28));
    u.hand.rotation.set(reach*.5-charge*.3,-charge*.4,reach*-.35);
    u.flash.visible=game.flash>0;if(u.flash.visible){u.flash.rotation.z=game.shots*2.399;u.flash.scale.setScalar(.75+((game.shots*.37)%1)*.6);}
    u.light.intensity=game.flash>0?9:0;
    u.reticle.visible=a>.2;u.reticle.children.forEach(c=>{c.material.opacity=.95*a;});
  };
})(window.Spice,window.THREE);
