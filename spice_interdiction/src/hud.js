'use strict';
/* HUD and tactical map. Reads game state each frame; owns no gameplay state. */
(function(S,T){
  const $=S.$,MAP={x0:-56,x1:60,z0:-86,z1:68};
  S.Hud=class{
    constructor(game){
      this.game=game;this.radioQueue=[];this.radioTime=0;this.radioFull='';this.radioShown=0;this.toastTime=0;this.markerEls=new Map();this.objKey='';this.mapOpen=false;this.mapClock=0;
      const tape=$('compass-tape'),names=['北','東北','東','東南','南','西南','西','西北'];
      for(let a=-360;a<=720;a+=15){const tick=document.createElement('span');tick.style.left=(a+360)*3+'px';tick.className=a%45===0?'major':'minor';tick.textContent=a%45===0?names[((a/45)%8+8)%8]:'│';tape.appendChild(tick);}
      this.mapCtx=$('map-canvas').getContext('2d');
    }
    reset(){this.radioQueue.length=0;this.radioTime=0;$('radio').hidden=true;$('toast').style.opacity=0;this.toastTime=0;this.objKey='';for(const el of this.markerEls.values())el.remove();this.markerEls.clear();}
    radio(speaker,text,seconds=4){this.radioQueue.push({speaker,text,seconds});if(this.radioQueue.length>3)this.radioQueue.splice(0,this.radioQueue.length-3);}
    toast(text,seconds=3.2){$('toast').textContent=text;$('toast').style.opacity=1;this.toastTime=seconds;}
    showCard(small,title,sub){const c=$('card');$('card-small').textContent=small;$('card-title').textContent=title;$('card-sub').textContent=sub;c.hidden=true;void c.offsetWidth;c.hidden=false;this.cardTime=5.2;}
    toggleMap(open){this.mapOpen=open;$('map').hidden=!open;if(open)this.drawMap();}
    tick(dt){
      // Radio: one line at a time, typed out, then held.
      if(this.radioTime>0){this.radioTime-=dt;this.radioShown=Math.min(this.radioFull.length,this.radioShown+dt*46);$('radio-text').textContent=this.radioFull.slice(0,Math.floor(this.radioShown));if(this.radioTime<=0)$('radio').hidden=true;}
      else if(this.radioQueue.length){const r=this.radioQueue.shift();this.radioFull=r.text;this.radioShown=0;this.radioTime=r.seconds+r.text.length/46;$('radio-speaker').textContent=r.speaker;$('radio-text').textContent='';$('radio').hidden=false;this.game.audio.ui('blip');}
      if(this.toastTime>0){this.toastTime-=dt;if(this.toastTime<=0)$('toast').style.opacity=0;}
      if(this.cardTime>0){this.cardTime-=dt;if(this.cardTime<=0)$('card').hidden=true;}
      if(this.mapOpen){this.mapClock-=dt;if(this.mapClock<=0){this.mapClock=.25;this.drawMap();}}
    }
    update(){
      const g=this.game,p=g.player,st=g.state,m=g.mission,ex=g.extraction;
      $('title').hidden=st!=='title';$('pause').hidden=!((st==='paused'&&!this.mapOpen)||(st==='title'&&g.settingsFromTitle));$('dead').hidden=st!=='dead';$('complete').hidden=st!=='complete';
      const live=st==='playing'||st==='paused';$('hud').hidden=!live;$('touch').hidden=!g.input.touch||st!=='playing';if(!live){if(st!=='intro')$('card').hidden=true;return;}
      $('ammo').textContent=String(g.ammo).padStart(2,'0');$('ammo').classList.toggle('low',g.ammo<=6);$('reserve').textContent=String(g.reserve).padStart(3,'0');
      const hp=Math.ceil(p.health);$('health').textContent=String(hp).padStart(3,'0');$('health-fill').style.width=S.clamp(p.health/p.maxHealth*100,0,100)+'%';document.querySelector('.health-panel').classList.toggle('low',hp<=35);
      $('kits').textContent='✚'.repeat(g.kits)||'—';
      $('reload-label').textContent=g.reloadTime>0?'更換彈匣':g.ammo===0?(g.reserve>0?'R 換彈':'彈藥耗盡'):g.ammo<=6?'彈量偏低':'';
      $('reload-progress').style.width=(g.reloadTime>0?(1-g.reloadTime/g.reloadDuration)*100:0)+'%';
      // Objectives: rebuilt only when something changed.
      const objs=m.objectives(),key=objs.map(o=>o.id+(o.done?1:0)+(o.active?1:0)+(o.failed?1:0)).join('')+m.headline();
      if(key!==this.objKey){this.objKey=key;$('objective').textContent=m.headline();const ul=$('obj-list');ul.textContent='';
        for(const o of objs){const li=document.createElement('li'),sp=document.createElement('span');sp.textContent=o.text;li.appendChild(sp);li.className=(o.done?'done ':'')+(o.optional?'optional ':'')+(o.failed?'failed ':'')+(!o.done&&!o.active&&!o.failed?'idle':'');if(o.optional){const em=document.createElement('em');em.textContent=o.failed?'失效':'選';li.appendChild(em);}ul.appendChild(li);}}
      const bearing=((-p.yaw*180/Math.PI)%360+360)%360;$('heading').textContent=String(Math.round(bearing)%360).padStart(3,'0')+'°';$('compass-tape').style.transform=`translateX(${190-1080-bearing*3}px)`;
      // Extraction clock.
      const timer=$('timer');timer.hidden=!ex.active;if(ex.active){const landed=ex.phase==='boarding',r=ex.remaining;timer.classList.toggle('landed',landed);timer.querySelector('small').textContent=landed?'接應機就位':'撲翼機抵達';
        $('timer-value').textContent=landed?'登機窗口開啟':`${String(Math.floor(r/60)).padStart(2,'0')}:${String(Math.floor(r%60)).padStart(2,'0')}`;$('timer-fill').style.width=(landed?100:(1-r/ex.duration)*100)+'%';}
      // Interaction prompt.
      const pr=m.prompt,pe=$('prompt');pe.hidden=!pr||st!=='playing';if(pr){pe.classList.toggle('locked',pr.locked);$('prompt-key').textContent=pr.locked?'×':g.input.touch?'互':'E';$('prompt-label').textContent=pr.locked?pr.label:'按住 · '+pr.label;$('prompt-fill').style.width=(pr.progress*100)+'%';}
      // Feedback.
      const hm=$('hitmark');hm.style.opacity=g.hitTime>0?1:0;hm.className=g.hitKind;$('hit-label').textContent=g.hitTime>0?({kill:'擊倒',head:'精準命中'}[g.hitKind]||''):'';
      const dd=$('damage-direction');dd.style.opacity=S.clamp(g.hurt*1.4,0,1);dd.style.transform=`rotate(${g.damageAngle||0}rad)`;
      const ch=$('crosshair');ch.classList.toggle('aim',p.aim>.5);ch.classList.toggle('lowered',!!g.weaponLowered||g.sprintPose>.5);ch.style.transform=`scale(${1+g.shotHeat*.7+Math.hypot(p.vel.x,p.vel.z)*.04})`;
      const se=$('seismic'),w=g.worm;se.hidden=w.intensity<.04;if(!se.hidden){se.classList.toggle('hot',w.intensity>.75);$('seismic-level').textContent=String(Math.round(w.intensity*100)).padStart(2,'0');$('seismic-label').textContent={distant:'遠方震源',circling:'沙蟲繞行',closing:'震源逼近岩地',breach:'地面破裂'}[w.stage]||'地底訊號';}
      $('key-hint').style.opacity=g.playTime<25?1:0;
      this.updateMarkers();
    }
    updateMarkers(){
      const g=this.game,list=g.state==='playing'?g.mission.markers():[],seen=new Set(),host=$('markers'),marks=$('compass-marks'),fwd=S.v(0,0,-1).applyQuaternion(g.camera.quaternion);marks.textContent='';
      for(const mk of list){
        seen.add(mk.id);let el=this.markerEls.get(mk.id);if(!el){el=document.createElement('div');el.innerHTML='<i></i><small></small><b></b>';host.appendChild(el);this.markerEls.set(mk.id,el);}
        const dir=mk.pos.clone().sub(g.camera.position),dist=dir.length(),ahead=dir.dot(fwd)>0,pr=mk.pos.clone().project(g.camera);let x=(pr.x*.5+.5)*innerWidth,y=(-pr.y*.5+.5)*innerHeight;
        const off=!ahead||x<50||x>innerWidth-50||y<110||y>innerHeight-150;if(!ahead){x=pr.x>0?50:innerWidth-50;y=innerHeight*.5;}
        el.className=(mk.optional?'optional ':'')+(off?'edge':'');el.style.left=S.clamp(x,50,innerWidth-50)+'px';el.style.top=S.clamp(y,110,innerHeight-150)+'px';el.style.opacity=dist<3.2?0:(mk.optional?.6:.92);
        el.children[1].textContent=mk.label;el.children[2].textContent=Math.round(dist)+' m';
        // Same marker on the compass tape.
        const brg=Math.atan2(dir.x,-dir.z)*180/Math.PI,head=((-g.player.yaw*180/Math.PI)%360+360)%360,d=((brg-head+540)%360)-180;if(Math.abs(d)<60){const c=document.createElement('i');c.style.left=(190+d*3)+'px';c.textContent=mk.label;if(mk.optional)c.className='optional';marks.appendChild(c);}
      }
      for(const [id,el] of this.markerEls)if(!seen.has(id)){el.remove();this.markerEls.delete(id);}
    }
    drawMap(){
      const g=this.game,c=this.mapCtx,W=620,H=860,sx=W/(MAP.x1-MAP.x0),sz=H/(MAP.z1-MAP.z0),X=x=>(x-MAP.x0)*sx,Z=z=>(z-MAP.z0)*sz,w=g.world,m=g.mission;
      c.fillStyle='#161d1b';c.fillRect(0,0,W,H);
      // Rock shelf versus open sand.
      for(let j=0;j<H;j+=10)for(let i=0;i<W;i+=10){const k=S.shelfMask(MAP.x0+(i+5)/sx,MAP.z0+(j+5)/sz);if(k>.5){c.fillStyle=`rgba(190,168,130,${.07+.07*k})`;c.fillRect(i,j,10,10);}}
      c.strokeStyle='#b6a08122';c.lineWidth=1;for(let x=-50;x<=60;x+=10){c.beginPath();c.moveTo(X(x),0);c.lineTo(X(x),H);c.stroke();}for(let z=-80;z<=60;z+=10){c.beginPath();c.moveTo(0,Z(z));c.lineTo(W,Z(z));c.stroke();}
      const col={wall:'#8f8068',tower:'#a3927a',structure:'#8a7b66',silo:'#9b8c70',cover:'#6f6657',prop:'#6f6657',rock:'#5b4f40',harvester:'#b98d4f',gate:'#c9892a',thopter:'#9fd8ff'};
      for(const s of w.mapShapes){c.fillStyle=col[s.tag]||'#777';if(s.type==='box')c.fillRect(X(s.x-s.w/2),Z(s.z-s.d/2),s.w*sx,s.d*sz);else{c.save();c.translate(X(s.x),Z(s.z));c.rotate(-s.rot);c.beginPath();c.ellipse(0,0,s.rx*sx,s.rz*sz,0,0,7);c.fill();c.restore();}}
      if(w.gate.open<.6){c.fillStyle=col.gate;c.fillRect(X(-7),Z(-52.4),8*sx,.8*sz);}
      // The two approaches.
      const route=(pts,colr)=>{c.strokeStyle=colr;c.lineWidth=2;c.setLineDash([7,6]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Z(p[1])):c.moveTo(X(p[0]),Z(p[1])));c.stroke();c.setLineDash([]);};
      route([[0,52],[-2,22],[-12.5,12],[-12.5,-4],[-14,-13],[-14,-28],[-9,-40],[-3,-47],[-3,-58]],'#9fd8ffaa');route([[0,52],[2,22],[16.2,12],[16.2,-4],[14,-16],[14.5,-25],[10,-40],[-3,-47]],'#e0a85caa');
      c.font='600 12px sans-serif';c.textAlign='center';c.fillStyle='#9fd8ff';c.fillText('西側維修道',X(-28),Z(13));c.fillStyle='#e0a85c';c.fillText('東側採收場',X(34),Z(13));
      c.fillStyle='#cdbf9f88';c.font='11px sans-serif';c.fillText('控制塔',X(-31),Z(-20));c.fillText('採收機',X(25),Z(-22));c.fillText('補給站',X(41.5),Z(-1));c.fillText('北門',X(8),Z(-54.5));c.fillText('岩隙（起點）',X(0),Z(60));
      const mark=(pos,label,done,optional,failed)=>{const x=X(pos.x),z=Z(pos.z);c.save();c.translate(x,z);c.rotate(Math.PI/4);c.lineWidth=2;c.strokeStyle=done?'#9bbfa5':failed?'#a36650':optional?'#e0cba8':'#e0a85c';c.fillStyle=done?'#9bbfa5':'#e0a85c44';if(done||!optional)c.fillRect(-5,-5,10,10);c.strokeRect(-5,-5,10,10);c.restore();
        c.font='600 12px sans-serif';c.textAlign='left';c.fillStyle=done?'#9bbfa5':failed?'#a36650':'#f4ead6';c.fillText(label,x+11,z+4);};
      const legend=$('map-legend');legend.textContent='';
      for(const o of m.objectives()){const it=m.items.find(i=>i.id===o.id),pos=o.id==='board'?w.points.pad:it.point.pos;mark(pos,it.short,o.done,o.optional,o.failed);
        const li=document.createElement('li');li.className=(o.done?'done ':'')+(o.optional?'optional ':'')+(!o.done&&!o.active?'idle':'');li.innerHTML='<i></i>';li.appendChild(document.createTextNode(o.text+(o.optional?(o.failed?'（已失效）':'（可選）'):'')));legend.appendChild(li);}
      // Known hostiles and the player.
      for(const e of g.enemies.list){if(!e.active||!e.alive||!(e.seen||e.state==='fight'))continue;c.fillStyle='#ef7b4d';c.beginPath();c.arc(X(e.pos.x),Z(e.pos.z),3.2,0,7);c.fill();}
      const p=g.player;c.save();c.translate(X(p.pos.x),Z(p.pos.z));c.rotate(-p.yaw);c.fillStyle='#fff3da';c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,3.5);c.lineTo(-6,7);c.closePath();c.fill();c.restore();
      if(g.world.thopter.landed){c.strokeStyle='#9fd8ff';c.lineWidth=2;c.beginPath();c.arc(X(w.points.pad.x),Z(w.points.pad.z),9*sx,0,7);c.stroke();}
    }
    debrief(){
      const g=this.game,m=g.mission,t=g.playTime,acc=g.shots?Math.round(g.hits/g.shots*100):0;
      $('final-time').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');$('final-accuracy').textContent=acc+'%';$('final-kills').textContent=m.stats.kills+' / '+m.stats.spotted;
      $('final-route').textContent=m.route==='west'?'西側維修道':m.route==='east'?'東側採收場':'—';$('final-alarm').textContent=m.flags.relay?(m.events.alarmWave?'警報後切斷':'事前切斷'):(m.events.alarmWave?'已響起':'未觸發');$('final-deaths').textContent=g.deaths;
      let score=0;if(t<420)score++;if(t<270)score++;if(acc>=35)score++;if(g.deaths===0)score+=2;if(!m.events.alarmWave)score+=2;if(m.flags.relay)score++;
      $('final-rating').textContent=['沙礫','沙礫','行者','行者','沙行者','敢死隊','敢死隊','納伊布','納伊布','納伊布'][score];
      $('final-line').textContent=m.events.alarmWave?'警報響徹前哨，但採收機還是留給了沙蟲。勘測紀錄已送回穴地。':'前哨直到最後都沒能呼叫任何人。採收機留給了沙蟲，紀錄已送回穴地。';
    }
  };
})(window.Spice,window.THREE);
