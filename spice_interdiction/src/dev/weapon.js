'use strict';
(function(S,T){
  setTimeout(()=>{try{
  const canvas=document.getElementById('view');document.getElementById('boot').hidden=true;
  const renderer=new T.WebGLRenderer({canvas,antialias:false});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.autoClear=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1,.07,2600);camera.rotation.order='YXZ';
  S.initMaterials();S.mats.farRock=S.mineralMaterial('rock','#ffffff',{scale:.05});S.mats.farRock.side=T.DoubleSide;
  const sky=new S.Sky(scene,renderer);const terrain=new S.Terrain(scene,S.mats);terrain.build();
  const P=new URLSearchParams(location.search);
  const game={renderer,scene,camera,sky,viewScene:new T.Scene(),viewCamera:new T.PerspectiveCamera(50,1,.01,10),quality:'high',time:0,hurt:0,state:'playing',lastDt:.016,showViewModel:()=>true,
    player:{aim:+(P.get('aim')||0),health:100,vel:new T.Vector3(),grounded:true,bob:0,sprinting:P.has('sprint'),vy:0},weaponSway:new T.Vector2(),reloadTime:+(P.get('reload')||0),reloadDuration:1,shots:3,flash:P.has('flash')?1:0,kickPosition:0,kickAngle:0,equip:0};
  if(P.has('sprint'))game.player.vel.set(0,0,-7);
  game.weapon=S.makeWeapon();game.viewScene.add(game.weapon);
  const key=new T.DirectionalLight('#ffe0b0',5);game.viewScene.add(key);game.viewScene.add(new T.DirectionalLight('#9db8e0',.5).translateX(2).translateY(-1));
  const post=new S.CinematicRenderer(game);
  const cam=(P.get('cam')||'0,1.7,30,0,1.75,-20').split(',').map(Number);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();game.viewCamera.aspect=w/h;game.viewCamera.updateProjectionMatrix();post.resize(w,h,true);}
  resize();window.__setCam=c=>{cam.splice(0,6,...c);};window.__frames=0;window.__game=game;
  let last=performance.now();
  (function frame(now){requestAnimationFrame(frame);const dt=.016;last=now;game.time+=dt;S.shared.uTime.value=game.time;
    camera.position.set(cam[0],cam[1],cam[2]);camera.lookAt(cam[3],cam[4],cam[5]);camera.updateMatrixWorld(true);
    game.sprintPose=game.player.sprinting?1:0;S.poseWeapon(game,dt);if(P.has('sprint'))game.sprintPose=1;
    key.position.copy(S.SUN_DIR).applyQuaternion(camera.quaternion.clone().invert()).multiplyScalar(5);
    game.viewScene.environmentRotation.set(-camera.rotation.x,-camera.rotation.y,0,'YXZ');
    sky.follow(camera.position,new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion));post.frame();window.__frames++;window.__ready=true;})(last);
  }catch(e){console.error(e.stack||e);window.__ready=true;}},50);
})(window.Spice,window.THREE);
