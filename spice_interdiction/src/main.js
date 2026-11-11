'use strict';
(function(){
  const errors=[];window.addEventListener('error',e=>errors.push(String(e.message)));
  const boot=document.getElementById('boot');
  function fail(e){boot.hidden=false;boot.innerHTML='<div class="boot-word">無法啟動</div><p>需要支援 WebGL 2 的瀏覽器。請使用桌面 Chrome / Edge，並確認硬體加速可用。</p><pre></pre>';boot.querySelector('pre').textContent=String(e.stack||e);console.error(e);}
  // Yield once so the boot indicator is painted before procedural assets are built.
  setTimeout(()=>{try{
    const game=new Spice.Game(document.getElementById('view'));window.__ready=true;
    const testMode=new URLSearchParams(location.search).has('test') || window.__SPICE_TEST === true;
    if(testMode){
      // Explicit test-only fixtures. Not installed for ordinary play.
      window.__test={game,errors,snapshot:()=>game.snapshot(),step:(n=1,dt=1/60)=>{for(let i=0;i<n;i++)game.update(dt);game.render();return game.snapshot();},position:(x,z)=>{game.player.pos.set(x,game.world.ground(x,z),z);game.player.vel.set(0,0,0);game.render();},aim:(x,y,z)=>{const d=new THREE.Vector3(x,y,z).sub(game.player.eye());game.player.yaw=Math.atan2(-d.x,-d.z);game.player.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));game.render();},render:()=>game.render()};
    }
    let last=performance.now();const frame=now=>{requestAnimationFrame(frame);const dt=Math.max(.001,(now-last)/1000);last=now;if(!testMode){game.update(Math.min(.05,dt));game.render();}};requestAnimationFrame(frame);
    boot.hidden=true;
  }catch(e){fail(e);}},80);
})();
