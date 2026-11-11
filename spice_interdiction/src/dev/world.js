'use strict';
/* Development harness: the full static world under the post pipeline with a free camera. */
(function(S,T){
  setTimeout(()=>{try{
  const canvas=document.getElementById('view');document.getElementById('boot').hidden=true;
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.autoClear=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1,.07,2600);camera.rotation.order='YXZ';
  S.initMaterials();const t0=performance.now();const world=new S.World(scene,renderer);console.log('world ms',Math.round(performance.now()-t0));
  if(S.Harvester){world.harvester=new S.Harvester(world);}
  if(S.Thopter){world.thopter=new S.Thopter(world);const P=new URLSearchParams(location.search);if(P.get('thopter'))world.thopter.showcase(P.get('thopter'));}
  const game={renderer,scene,camera,sky:world.sky,world,viewScene:new T.Scene(),viewCamera:new T.PerspectiveCamera(50,1,.01,10),quality:'high',time:0,player:{aim:0,health:100},hurt:0,state:'title',lastDt:.016,showViewModel:()=>false};
  const fast=new URLSearchParams(location.search).has('fast');if(fast)world.sky.setShadowQuality(2048,62);const post=new S.CinematicRenderer(game);
  const P=new URLSearchParams(location.search),cam=(P.get('cam')||'0,1.7,30,0,2.5,-20').split(',').map(Number);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();post.resize(w,h,true);if(fast){post.world.samples=post.work.samples=0;post.world.dispose();post.work.dispose();}}
  resize();addEventListener('resize',resize);
  window.__setCam=c=>{cam.splice(0,6,...c);};window.__frames=0;window.__game=game;window.__post=post;window.__world=world;
  let last=performance.now();
  (function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||.016);last=now;game.time+=dt;S.shared.uTime.value=game.time;
    camera.position.set(cam[0],cam[1],cam[2]);camera.lookAt(cam[3],cam[4],cam[5]);camera.updateMatrixWorld(true);
    world.update(dt,game.time,{});if(world.harvester)world.harvester.update(dt,game.time);if(world.thopter)world.thopter.update(dt,game.time);
    world.sky.follow(camera.position,new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion));post.frame();window.__frames++;window.__ready=true;window.__stats=post.worldStats;})(last);
  }catch(e){console.error(e.stack||e);window.__ready=true;}},50);
})(window.Spice,window.THREE);
