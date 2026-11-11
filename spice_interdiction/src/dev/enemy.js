'use strict';
(function(S,T){
  setTimeout(()=>{try{
  const canvas=document.getElementById('view');document.getElementById('boot').hidden=true;
  const renderer=new T.WebGLRenderer({canvas,antialias:false});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.autoClear=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.07,2600);
  S.initMaterials();S.mats.farRock=S.mineralMaterial('rock','#ffffff',{scale:.05});S.mats.farRock.side=T.DoubleSide;
  const sky=new S.Sky(scene,renderer);const terrain=new S.Terrain(scene,S.mats);terrain.build();
  const game={renderer,scene,camera,sky,viewScene:new T.Scene(),viewCamera:new T.PerspectiveCamera(50,1,.01,10),quality:'high',time:0,hurt:0,state:'title',lastDt:.016,showViewModel:()=>false,
    world:{ground:S.groundHeight},player:{aim:0,health:100,pos:new T.Vector3(0,0,40),vel:new T.Vector3()},fx:{puff(){}},audio:{enemyStep(){}},enemies:{list:[]}};
  const mk=(kind,x,cfg)=>{const e=new S.Enemy(game,x+5,kind);e.spawn(x,20,{yaw:cfg.yaw||0});Object.assign(e,cfg);return e;};
  const list=[mk('trooper',-3,{aimW:0,yaw:.5}),mk('trooper',-1.5,{aimW:1,yaw:.3,vel:0}),mk('elite',0,{aimW:1,yaw:-.2}),mk('elite',1.5,{aimW:.45,vel:4.5,yaw:.9}),mk('trooper',3,{crouch:1,aimW:1,yaw:-.5}),mk('trooper',4.8,{alive:false,deathTime:3,fall:0,yaw:1})];
  const post=new S.CinematicRenderer(game);
  const P=new URLSearchParams(location.search),cam=(P.get('cam')||'0.6,1.5,27.5,0.6,1.0,20').split(',').map(Number);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();post.resize(w,h,true);}
  resize();window.__setCam=c=>{cam.splice(0,6,...c);};window.__frames=0;
  (function frame(){requestAnimationFrame(frame);const dt=.016;game.time+=dt;S.shared.uTime.value=game.time;
    camera.position.set(cam[0],cam[1],cam[2]);camera.lookAt(cam[3],cam[4],cam[5]);camera.updateMatrixWorld(true);
    for(const e of list){e.root.rotation.y=e.yaw;const a=e.aimW,c=e.crouch;e.animate(dt,e.vel||0,0);e.aimW=a;e.crouch=c;}
    sky.follow(camera.position,new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion));post.frame();window.__frames++;window.__ready=true;})();
  }catch(e){console.error(e.stack||e);window.__ready=true;}},50);
})(window.Spice,window.THREE);
