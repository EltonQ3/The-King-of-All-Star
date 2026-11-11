/* In-page test pilot. It plays through the real input layer: it presses keys,
 * turns the view, holds the trigger and the interact key. It never teleports,
 * never edits mission state and never removes enemies. Aim is scripted. */
window.SpiceBot=function(test,route){
  const g=test.game,S=test.S,w=g.world,m=g.mission,keys=g.input.keys;
  const plan=route==='west'?['relay','terminal','harvester','beacon','board']:['supply','harvester','terminal','beacon','board'];
  const bot={route,step:0,log:[],ticks:0,path:null,pathAge:0,stuck:0,last:null,fired:0,done:false,failed:null,holdAt:null};
  const item=id=>m.items.find(i=>i.id===id);
  function aimAt(v,rate=1){const e=g.player.eye(),dx=v.x-e.x,dy=v.y-e.y,dz=v.z-e.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));g.player.yaw+=S.angleDelta(yaw,g.player.yaw)*rate;g.player.pitch+=(pitch-g.player.pitch)*rate;}
  function target(){let best=null,bd=48;const eye=g.player.eye();for(const e of g.enemies.list){if(!e.active||!e.alive)continue;const d=e.pos.distanceTo(g.player.pos);if(d>bd||(e.state!=='fight'&&d>24))continue;const chest=S.v(e.pos.x,e.pos.y+1.32-e.crouch*.45,e.pos.z);if(w.collision.visible(eye,chest)){bd=d;best=chest;}}return best;}
  function walk(to,dt){
    bot.pathAge-=dt;if(!bot.path||bot.pathAge<=0||bot.goalKey!==to.x+','+to.z){bot.path=w.path(g.player.pos,to);bot.pathIndex=0;bot.pathAge=1.5;bot.goalKey=to.x+','+to.z;}
    if(!bot.path){bot.failed='no path to '+bot.goalKey;return;}
    while(bot.pathIndex<bot.path.length-1&&Math.hypot(bot.path[bot.pathIndex].x-g.player.pos.x,bot.path[bot.pathIndex].z-g.player.pos.z)<.7)bot.pathIndex++;
    const wp=bot.path[Math.min(bot.pathIndex,bot.path.length-1)];aimAt(S.v(wp.x,g.player.pos.y+1.6,wp.z),.35);keys.add('KeyW');
    const dist=Math.hypot(to.x-g.player.pos.x,to.z-g.player.pos.z);if(dist>6)keys.add('ShiftLeft');else keys.delete('ShiftLeft');
  }
  bot.tick=function(dt){
    if(bot.done||bot.failed)return;bot.ticks++;const p=g.player;
    if(g.state==='dead'){bot.failed='died at step '+plan[bot.step];return;}
    if(g.state==='complete'){bot.done=true;return;}
    if(g.state!=='playing')return;
    keys.delete('KeyW');keys.delete('ShiftLeft');keys.delete('KeyE');g.input.fire=false;g.input.ads=false;
    if(p.health<45&&g.kits>0)g.input.actions.add('KeyQ');
    const id=plan[bot.step];if(m.flags[id]){bot.log.push(id+'@'+g.playTime.toFixed(1));bot.step++;bot.holdAt=null;return;}
    // Fight what can be seen; otherwise keep moving on the objective.
    const t=target();if(t&&!(id==='board'&&w.thopter.landed&&bot.pacifist)){aimAt(t,.6);const e=p.eye(),d=t.clone().sub(e).normalize(),f=S.v(0,0,-1).applyQuaternion(g.camera.quaternion);g.input.ads=true;if(d.dot(f)>.9996){g.input.fire=true;bot.fired++;}return;}
    if(id==='board'&&!w.thopter.landed){const hold=S.v(-9.4,0,-58.2);if(Math.hypot(hold.x-p.pos.x,hold.z-p.pos.z)>1.2)walk(hold,dt);else aimAt(S.v(-3,2,-50),.2);return;}
    if(id==='beacon'&&!m.mainDone){bot.failed='beacon before objectives';return;}
    const it=item(id),stand=it.point.stand,dist=Math.hypot(stand.x-p.pos.x,stand.z-p.pos.z);
    if(dist>.55)walk(stand,dt);else{aimAt(it.point.pos,.5);keys.add('KeyE');}
    // Watchdog.
    if(bot.last&&Math.hypot(bot.last.x-p.pos.x,bot.last.z-p.pos.z)<.01&&dist>.6)bot.stuck+=dt;else bot.stuck=0;bot.last=p.pos.clone();if(bot.stuck>12)bot.failed='stuck near '+p.pos.x.toFixed(1)+','+p.pos.z.toFixed(1)+' heading for '+id;
  };
  return bot;
};
