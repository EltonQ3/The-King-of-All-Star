'use strict';
/* Development harness: sky + terrain + rocks + a few kit primitives under the full post pipeline. */
(function(S,T){
  setTimeout(()=>{
  const canvas=document.getElementById('view');document.getElementById('boot').hidden=true;
  const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.autoClear=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1,.07,2600);camera.rotation.order='YXZ';
  S.initMaterials();const mats=S.mats;mats.farRock=S.mineralMaterial('rock','#ffffff',{scale:.05});mats.farRock.side=T.DoubleSide;
  const sky=new S.Sky(scene,renderer);
  const terrain=new S.Terrain(scene,mats);terrain.addTrack([18,20],[18,-20],3);terrain.build();
  const rocks=[[-13,57,10,25,13],[-12,39,8,20,11],[13,55,8,22,11],[12,38,7,17,12],[-33,45,16,34,20],[32,50,15,31,22],[-52,-20,14,30,24],[58,-10,16,26,22]];
  rocks.forEach(([x,z,sx,h,sz],i)=>{const m=new T.Mesh(S.rockGeometry(i+4),mats.rock);m.position.set(x,S.groundHeight(x,z)-1.5,z);m.scale.set(sx,h,sz);m.rotation.y=i*1.7;m.castShadow=m.receiveShadow=true;scene.add(m);});
  const b=new S.Batch();
  b.tint('#c1ad92');b.cbox(mats.concrete,-8,6,-10,10,12,8,.15);b.cbox(mats.concrete,-8,1,0,6,2,1.2,.06);
  b.tint('#4a4f4a').cbox(mats.kit,4,1,2,2,2,2,.06);b.tint('#8a6a3a',1).cyl(mats.kit,7,1,2,.8,2,20);b.tint('#b9852f').cbox(mats.kit,10,.6,2,1.6,1.2,1.2,.05);
  b.tint('#22262a',2).cbox(mats.kit,4,.4,5,1,.8,1,.04);b.tint('#6a6350',3).cbox(mats.kit,7,.5,5,1.2,1,1.2,.1);b.tint('#ffb060',0,1).cbox(mats.kit,10,1.5,5,.6,.1,.1,.01);
  b.build(scene);
  const ins=S.insignia;ins.place(ins.glyphs(3,7,'#3d2f22'),-8,7,-5.99,0,0,1,5);ins.place(ins.sigil('#3d2f22'),-11,4,-5.99,0,0,1,1.4);ins.place(ins.hazard(),4,1,3.01,0,0,1,1.6);ins.build(scene);
  const game={renderer,scene,camera,sky,viewScene:new T.Scene(),viewCamera:new T.PerspectiveCamera(50,1,.01,10),quality:'high',time:0,player:{aim:0,health:100},hurt:0,state:'title',lastDt:.016,showViewModel:()=>false};
  const post=new S.CinematicRenderer(game);
  const P=new URLSearchParams(location.search),cam=(P.get('cam')||'0,1.7,30,0,2.5,-20').split(',').map(Number);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();post.resize(w,h,true);}
  resize();addEventListener('resize',resize);
  window.__setCam=c=>{cam.splice(0,6,...c);};window.__frames=0;window.__game=game;window.__post=post;
  let last=performance.now();
  (function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000||.016);last=now;game.time+=dt;S.shared.uTime.value=game.time;
    camera.position.set(cam[0],cam[1],cam[2]);camera.lookAt(cam[3],cam[4],cam[5]);camera.updateMatrixWorld(true);
    sky.follow(camera.position,new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion));post.frame();window.__frames++;window.__ready=true;})(last);
  },50);
})(window.Spice,window.THREE);
