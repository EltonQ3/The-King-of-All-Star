'use strict';
/* SANDWALKER / K-18. Machined receiver, shrouded barrel, analogue optic,
 * physically separate magazine, bolt and support hand. All mesh data is local. */
(function(S,T){
  S.makeWeapon=function(){
    const root=new T.Group(),gun=new T.Group();root.add(gun);
    const metal=S.weatherMaterial(S.material('#3b4548',.4,.62),'metal',7);
    const edge=S.weatherMaterial(S.material('#8b9188',.4,.8),'metal',7);
    const brass=S.weatherMaterial(S.material('#a48656',.46,.73),'metal',6);
    const ceramic=S.weatherMaterial(S.material('#565d55',.69,.22),'metal',7);
    const black=S.material('#11191c',.77,.15),rubber=S.material('#272d2a',.94,.04);
    const cloth=S.weatherMaterial(S.material('#696451',.96),'cloth',3),glove=S.weatherMaterial(S.material('#373d36',.86),'cloth',5);
    const part=(g,w,h,d,r,mat,x,y,z)=>S.mesh(g,S.bevelBox(w,h,d,r),mat,x,y,z);
    part(gun,.126,.144,.55,.015,metal,0,-.014,-.055);
    part(gun,.12,.069,.39,.012,ceramic,0,.064,-.115);
    part(gun,.10,.042,.22,.012,metal,0,.035,.28);
    for(const side of [-1,1])S.beam(gun,metal,[side*.036,-.037,.17],[side*.036,-.037,.40],.012);
    part(gun,.10,.095,.035,.012,rubber,0,-.005,.40);
    // Recessed receiver panels and engraved service marks.
    for(const side of [-1,1]){
      part(gun,.012,.078,.23,.005,black,side*.068,-.006,-.026);
      part(gun,.013,.018,.21,.004,brass,side*.075,.043,-.033);
      for(const z of [-.22,-.1,.16]){const screw=S.cylinder(gun,edge,side*.074,-.042,z,.008,.008,10);screw.rotation.z=Math.PI/2;const slot=S.box(gun,black,side*.079,-.042,z,.003,.002,.009,false);}
      S.box(gun,edge,side*.069,-.064,.02,.008,.007,.4);
    }
    const bolt=new T.Group();bolt.position.set(.083,.018,-.06);gun.add(bolt);
    part(bolt,.018,.035,.1,.004,edge,0,0,0);S.cylinder(bolt,brass,.016,0,.045,.012,.035,8).rotation.z=Math.PI/2;
    // Elliptical, perforated heat shroud, not a solid extruded block.
    part(gun,.112,.104,.4,.013,ceramic,0,-.014,-.48);
    for(let i=0;i<8;i++)for(const side of [-1,1]){
      S.box(gun,black,side*.057,.008,-.32-i*.042,.004,.035,.025,false);
      S.box(gun,edge,side*.058,-.029,-.32-i*.042,.005,.006,.026,false);
    }
    for(let i=0;i<5;i++)S.box(gun,rubber,0,-.073,-.34-i*.058,.116,.018,.034);
    function tube(g,mat,x,y,z,r,len){const v=S.cylinder(g,mat,x,y,z,r,len,24);v.rotation.x=Math.PI/2;return v;}
    tube(gun,metal,0,.014,-.79,.025,.29);
    for(let i=0;i<5;i++)tube(gun,edge,0,.014,-.689-i*.026,.032,.008);
    tube(gun,metal,0,.014,-.948,.037,.095);tube(gun,edge,0,.014,-.994,.037,.008);
    const bore=S.mesh(gun,new T.RingGeometry(.019,.035,24),black,0,.014,-1.001);bore.rotation.y=Math.PI;
    for(const side of [-1,1])for(let i=0;i<3;i++)S.box(gun,black,side*.037,.014,-.918-i*.023,.004,.02,.011,false);
    S.box(gun,brass,0,.104,-.22,.042,.01,.48);
    // Low, rectangular optic hood with visible screws and an amber etched reticle.
    const optic=new T.Group();optic.position.set(0,.152,.035);gun.add(optic);
    part(optic,.117,.012,.12,.003,metal,0,.045,0);part(optic,.117,.014,.13,.003,metal,0,-.044,0);
    for(const x of [-.053,.053])part(optic,.013,.09,.12,.003,metal,x,0,0);
    const glass=new T.MeshPhysicalMaterial({color:'#bac8bd',metalness:.25,roughness:.15,transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide});
    S.mesh(optic,new T.PlaneGeometry(.088,.071),glass,0,0,.051,false);
    const reticle=new T.Group();reticle.position.z=.054;optic.add(reticle);
    const retmat=new T.MeshBasicMaterial({color:'#ffd49a',transparent:true,opacity:.8,toneMapped:false,depthWrite:false});
    S.mesh(reticle,new T.RingGeometry(.007,.0078,32),retmat,0,0,0,false);S.mesh(reticle,new T.CircleGeometry(.0014,12),retmat,0,0,.001,false);
    for(const x of [-1,1])S.box(reticle,retmat,x*.013,0,0,.007,.0008,.0001,false);
    const dial=tube(optic,brass,.076,-.02,0,.02,.022);dial.rotation.set(0,0,Math.PI/2);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;S.box(optic,black,.088,-.02+Math.sin(a)*.021,Math.cos(a)*.021,.004,.003,.005);}
    S.box(gun,metal,0,.117,-.68,.027,.055,.025);S.box(gun,brass,0,.15,-.68,.009,.018,.01);
    // Magazine follows a non-linear drop/insert/reseat animation.
    const mag=new T.Group();mag.position.set(0,-.155,.01);gun.add(mag);
    part(mag,.085,.25,.137,.012,metal,0,-.075,0);part(mag,.095,.025,.15,.004,edge,0,-.21,0);
    for(const side of [-1,1])for(let i=0;i<4;i++)S.box(mag,ceramic,side*.045,-.055-i*.035,0,.007,.014,.11);
    part(gun,.083,.18,.105,.015,rubber,0,-.135,.19).rotation.x=-.24;
    // An actual open trigger guard rather than a filled block.
    S.beam(gun,metal,[0,-.085,.135],[0,-.2,.105],.008);S.beam(gun,metal,[0,-.2,.105],[0,-.2,.02],.008);S.beam(gun,metal,[0,-.2,.02],[0,-.083,.015],.008);
    S.beam(gun,brass,[0,-.09,.096],[0,-.15,.078],.008);
    // Finger articulation: knuckle segments, wrist seals, ribbed stillsuit sleeves.
    const hand=new T.Group();hand.position.set(-.018,-.104,-.46);gun.add(hand);
    const sleeve=S.beam(hand,cloth,[-.26,-.18,.77],[-.06,-.04,.14],.067);
    S.mesh(hand,new T.SphereGeometry(.059,18,12),glove,-.047,-.008,.055).scale.set(.8,.72,1.25);
    for(let i=0;i<4;i++){
      const z=-.025+i*.031;S.beam(hand,glove,[-.045,.003,z],[.012,.027,z],.0115);S.beam(hand,glove,[.012,.027,z],[.055,.008,z],.01);
      part(hand,.023,.015,.023,.004,ceramic,-.025,.027,z);
    }
    S.beam(hand,glove,[-.054,-.008,.09],[-.06,.047,.035],.014);
    S.beam(gun,cloth,[.19,-.36,.57],[.069,-.16,.21],.072);
    S.mesh(gun,new T.SphereGeometry(.065,18,12),glove,.045,-.14,.198).scale.set(.85,1.1,1.0);
    for(let i=0;i<3;i++){const y=-.15-i*.029;S.beam(gun,glove,[.063,y,.232],[-.027,y,.199],.013);}
    S.beam(gun,glove,[.064,-.13,.188],[.063,-.14,.086],.011);
    for(let i=0;i<6;i++){
      const a=i*.028;S.beam(gun,rubber,[.126+a*.3,-.25-a*.7,.34+a],[.073+a*.3,-.23-a*.7,.32+a],.009);
    }
    const label=S.label(gun,'K–18',.071,.005,.12,.075,.026,'#d2c8a4');label.rotation.y=Math.PI/2;
    const bars=[];for(let i=0;i<6;i++){const bar=S.box(gun,new T.MeshBasicMaterial({color:'#bd9a61'}),.077,.04,-.135+i*.016,.003,.006,.008,false);bars.push(bar);}
    const flashG=new T.Group();flashG.position.set(0,.014,-1.04);gun.add(flashG);
    const fm=new T.MeshBasicMaterial({map:S.softTexture(),color:'#ffdb9d',transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
    for(let i=0;i<3;i++){const f=S.mesh(flashG,new T.PlaneGeometry(.14,.38),fm,0,0,-.08,false);f.rotation.x=Math.PI/2;f.rotation.z=i*Math.PI/3;}
    const flare=new T.Sprite(new T.SpriteMaterial({map:S.softTexture(),color:'#ffeac5',transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));flare.scale.set(.14,.14,1);flashG.add(flare);flashG.visible=false;
    const light=new T.PointLight('#ffc57e',0,2.4,2);light.position.set(.04,.05,-.9);gun.add(light);
    gun.userData.mag=mag;
    root.userData={gun,mag,bolt,hand,flash:flashG,light,reticle,bars,baseHand:hand.position.clone()};
    root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;}});
    return root;
  };
  S.poseWeapon=function(game){
    const p=game.player,a=p.aim,w=game.weapon,u=w.userData;
    const move=Math.min(1,Math.hypot(p.vel.x,p.vel.z)/4.6),motion=game.motionReduced?.3:1;
    const bob=Math.sin(p.bob)*.0065*move*(1-a)*motion;
    const reload=game.reloadTime>0?1-game.reloadTime/game.reloadDuration:0;
    const ease=x=>{x=S.clamp(x,0,1);return x*x*(3-2*x);};
    const tilt=reload>0?ease(reload/.17)*(1-ease((reload-.73)/.27)):0;
    const drop=reload>0?ease((reload-.15)/.15)*(1-ease((reload-.47)/.22)):0;
    const sprint=p.sprinting?1:0;game.sprintPose=S.damp(game.sprintPose||0,sprint,10,game.lastDt||1/60);
    w.position.set(S.lerp(.285,0,a)+bob+game.weaponSway.x,S.lerp(-.285,-.152,a)-tilt*.12+Math.cos(p.bob*2)*.002*move,S.lerp(-.95,-.80,a)+(game.kickPosition||0)+tilt*.08);
    w.rotation.set((game.kickAngle||0)+tilt*.28+game.sprintPose*.18,-tilt*.28+game.weaponSway.x*.4,tilt*-.5+bob*.8+game.sprintPose*.16+game.weaponSway.y*.45);
    u.mag.position.set(0,-.155-drop*.29,.01+drop*.06);u.mag.rotation.x=drop*.18;
    u.bolt.position.z=-.06+Math.min(.07,(game.kickPosition||0)*2.5);
    u.hand.position.copy(u.baseHand).add(S.v(.035*tilt,-.12*drop,.43*tilt));u.hand.rotation.set(tilt*.55,0,tilt*-.5);
    u.flash.visible=game.flash>0;u.flash.rotation.z=game.shots*2.399;u.flash.scale.setScalar(.85+Math.sin(game.time*81)*.15);
    u.light.intensity=game.flash>0?7:0;u.reticle.visible=true;
    for(let i=0;i<u.bars.length;i++)u.bars[i].visible=game.ammo>i*3;
  };
})(window.Spice,window.THREE);
