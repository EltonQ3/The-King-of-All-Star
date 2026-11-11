'use strict';
/* Boot. Ordinary play runs on requestAnimationFrame. With ?test (or
 * window.__SPICE_TEST) the loop is stepped by the harness instead and a small
 * fixture API is exposed; nothing of it exists in a normal session. */
(function(S){
  const errors=[];window.addEventListener('error',e=>errors.push(String(e.message)));
  const boot=S.$('boot');
  function fail(e){boot.hidden=false;boot.innerHTML='<div class="boot-word">無法啟動</div><p>需要支援 WebGL 2 的瀏覽器。請使用桌面 Chrome / Edge / Safari，並確認硬體加速可用。</p><pre></pre>';boot.querySelector('pre').textContent=String(e.stack||e);console.error(e);}
  // Yield once so the boot screen paints before the world is generated.
  setTimeout(()=>{try{
    const params=new URLSearchParams(location.search),testMode=params.has('test')||window.__SPICE_TEST===true;
    const game=new S.Game(S.$('view'),{test:testMode});window.__ready=true;
    if(testMode){
      window.__test={game,errors,S,snapshot:()=>game.snapshot(),
        step:(n=1,dt=1/60,draw=false)=>{for(let i=0;i<n;i++)game.update(dt);if(draw)game.render();return game.snapshot();},
        render:()=>game.render(),
        place:(x,z,yaw)=>{game.player.pos.set(x,game.world.ground(x,z),z);game.player.vel.set(0,0,0);if(yaw!==undefined)game.player.yaw=yaw;},
        look:(x,y,z)=>{const d=new THREE.Vector3(x,y,z).sub(game.player.eye());game.player.yaw=Math.atan2(-d.x,-d.z);game.player.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));},
        cam:c=>{game.debugCam=c;}};
    }
    let last=performance.now();const frame=now=>{requestAnimationFrame(frame);const dt=Math.max(.001,(now-last)/1000);last=now;if(!testMode){game.update(Math.min(.05,dt));game.render();}};requestAnimationFrame(frame);
    boot.hidden=true;
  }catch(e){fail(e);}},60);
})(window.Spice);
