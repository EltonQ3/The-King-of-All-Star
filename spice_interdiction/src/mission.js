'use strict';
/* Mission flow for Harvest Outpost 09. Progress is driven by objectives, never by
 * a kill count:
 *   survey records + harvester shutdown (either order) -> beacon -> board.
 * Optional choices with consequences: cut the alarm relay (west) so the outpost
 * cannot call reinforcements; take the supply cache (east) for ammunition and repair.
 * One unified hold-to-interact system serves every console; one checkpoint is
 * stored when both outpost objectives are complete. */
(function(S,T){
  const GARRISON=[
    ['trooper',18.6,2.6,0,null],['trooper',-12.5,1.5,0,[[-12.5,1.5],[-12.5,-9]]],['trooper',-11,-24,3.1,[[-12,-22],[-12,-34],[-7,-34]]],['trooper',-14.4,-13.6,1.57,null],
    ['trooper',12,-10,0,[[12,-10],[30,-8],[33,-14]]],['trooper',15,-30,0,[[15,-31],[15,-17]]],['trooper',34,-10.5,-1.57,null],['trooper',38,-36,0,[[38,-36],[30,-42],[16,-42]]],
    ['trooper',-8,-47,0,[[-10,-47],[6,-47]]],['elite',1.5,-48.5,0,null]];
  const SPAWNS=[[-40,1.5],[46,-10],[-30,-45],[33.5,-47],[-2,15],[46.5,-37],[-22,-40],[20,-47]];
  S.Mission=class{
    constructor(game){
      this.game=game;const P=game.world.points;
      this.items=[
        {id:'relay',point:P.relay,label:'切斷警報線路',hold:2.2,optional:true,short:'警報'},
        {id:'terminal',point:P.terminal,label:'下載勘測紀錄',hold:3.0,short:'勘測紀錄'},
        {id:'harvester',point:P.harvester,label:'執行停機程序',hold:3.0,short:'採收機'},
        {id:'supply',point:P.supply,label:'取用補給',hold:1.1,optional:true,short:'補給'},
        {id:'beacon',point:P.beacon,label:'啟動接應信標',hold:2.4,short:'信標'},
        {id:'board',point:P.board,label:'登上撲翼機',hold:1.5,short:'登機'}];
      for(const it of this.items){const d=it.point.stand.clone().sub(it.point.pos);d.y=0;d.normalize();it.aim=it.point.pos.clone().addScaledVector(d,.55);}
      this.reset();
    }
    reset(){
      this.flags={relay:false,terminal:false,harvester:false,supply:false,beacon:false,board:false};
      this.alarm='idle';this.alarmTimer=0;this.alarmClock=0;this.events={alarmWave:false,objectiveWave:false,entered:false,spottedSaid:false,gateSaid:false,cutSaid:false};
      this.queue=[];this.queueClock=0;this.focus=null;this.progress=0;this.latch=false;this.denyClock=0;this.route=null;this.checkpoint=null;this.checkpointDue=0;this.stats={kills:0,damage:0,spotted:0};
      const g=this.game,w=g.world;g.enemies.reset();
      for(const [kind,x,z,yaw,patrol] of GARRISON)g.enemies.spawn(kind,x,z,{yaw,patrol,group:'garrison'});
      w.setGate(false);w.gate.open=0;w.gate.target=0;for(const l of w.gate.leaves)l.g.position.x=l.x;w.gate.box.off=false;
      w.harvester.reset();this.refreshScreens();
    }
    get alarmActive(){return this.alarm==='active'&&this.alarmClock<45;}
    get mainDone(){return this.flags.terminal&&this.flags.harvester;}
    enabled(it){
      const f=this.flags,g=this.game;
      switch(it.id){case 'relay':return !f.relay;case 'terminal':return !f.terminal;case 'harvester':return !f.harvester;case 'supply':return !f.supply;
        case 'beacon':return !f.beacon&&this.mainDone;case 'board':return f.beacon&&!f.board&&g.world.thopter.landed;}
    }
    // Why a visible console refuses input (shown instead of a hold prompt).
    refusal(it){
      const f=this.flags;
      if(it.id==='beacon'&&!f.beacon&&!this.mainDone)return !f.terminal&&!f.harvester?'信標未授權：需要勘測紀錄中的頻率，並先讓採收機停機':!f.terminal?'信標未授權：先取得勘測紀錄':'北門鎖閉中：先讓採收機停機';
      if(it.id==='board'&&f.beacon&&!f.board&&!this.game.world.thopter.landed)return '接應機尚未就位';
      return null;
    }
    refreshScreens(){
      const w=this.game.world,f=this.flags;
      w.drawScreen('terminal',f.terminal?'done':'locked');w.drawScreen('harvester',f.harvester?'done':'running');
      w.drawScreen('beacon',f.beacon?(w.thopter&&w.thopter.landed?'done':'count'):this.mainDone?'ready':'locked');
    }
    complete(it){
      const g=this.game,f=this.flags,w=g.world;f[it.id]=true;g.audio.ui('ok');
      if(it.id==='relay'){
        if(this.alarm==='active'){this.alarm='cut';g.radio('哨兵','警報停了。已經出發的增援攔不住，但後面不會再有人來。',5);}
        else{this.alarm='cut';this.alarmTimer=0;g.radio('哨兵','警報線路已斷。前哨現在叫不到任何人。',5);}
      }else if(it.id==='terminal'){
        if(!this.route)this.route='west';g.audio.sting('objective');g.radio('哨兵',f.harvester?'紀錄到手，接應頻率就在裡面。北門已開，去坪上叫撲翼機。':'紀錄到手。現在讓那台採收機停下來，控制台在它的西側。',6);
      }else if(it.id==='harvester'){
        if(!this.route)this.route='east';w.harvester.stop();g.audio.shutdown();g.audio.sting('objective');w.setGate(true);g.audio.gate();
        g.radio('哨兵',f.terminal?'採收機停了，北門鎖閉解除。去接應坪啟動信標。':'採收機停了，北門鎖閉解除。還差勘測紀錄：控制塔東面的凹室。',6);
      }else if(it.id==='supply'){
        g.reserve=Math.min(g.reserveMax,g.reserve+120);g.player.health=g.player.maxHealth;g.kits=Math.min(3,g.kits+2);g.audio.pickup();g.toast('彈藥已補滿 · 蒸餾服修補完成 · 急救包 +2');
      }else if(it.id==='beacon'){g.extraction.activate();}
      else if(it.id==='board'){g.extraction.board();}
      if((it.id==='terminal'||it.id==='harvester')&&this.mainDone){this.checkpointDue=.6;}
      this.refreshScreens();
    }
    onSpotted(enemy){
      const g=this.game;this.stats.spotted++;
      if(this.alarm==='idle'&&g.player.pos.z<8){this.alarmTimer=5.5;this.alarm='pending';g.radio('哨兵','你被看見了！他們正在拉警報——'+(this.flags.relay?'':'除非線路先斷。'),4);}
      else if(this.alarm==='cut'&&!this.events.cutSaid){this.events.cutSaid=true;g.radio('哨兵','他們在按警報，沒有回應。只剩眼前這幾個。',4);}
    }
    onKill(enemy){this.stats.kills++;}
    enqueue(list,group){for(const kind of list)this.queue.push({kind,group});}
    // Bring one queued soldier in at a point the player cannot see; respects the live cap.
    pumpQueue(dt){
      if(!this.queue.length)return;this.queueClock-=dt;const g=this.game;if(this.queueClock>0||g.enemies.living>=g.maxAlive)return;
      const p=g.player,eye=p.eye(),pts=(this.queue[0].group==='pursuit'&&g.world.gate.open>.6?SPAWNS.concat([[-20,-47],[14,-45]]):SPAWNS);let best=null,bs=-1e9;
      for(const [x,z] of pts){const y=g.world.ground(x,z),d=Math.hypot(x-p.pos.x,z-p.pos.z);if(d<20)continue;const hidden=!g.world.collision.visible(eye,S.v(x,y+1.5,z));let s=(hidden?100:0)-Math.abs(d-48)*.6+g.rand()*8;
        for(const e of g.enemies.list)if(e.active&&e.alive&&Math.hypot(e.pos.x-x,e.pos.z-z)<2)s-=60;if(s>bs){bs=s;best=[x,z];}}
      if(!best)return;const q=this.queue.shift(),e=g.enemies.spawn(q.kind,best[0]+(g.rand()-.5),best[1]+(g.rand()-.5),{alert:true,group:q.group});if(e){e.lastKnown=p.pos.clone();}this.queueClock=.7;
    }
    update(dt){
      const g=this.game,p=g.player,f=this.flags;
      if(!this.events.entered&&p.pos.z<4.5){this.events.entered=true;g.radio('哨兵',p.pos.x<0?'你走維修道。警報繼電器在控制塔牆上，先切掉它，前哨就叫不到增援。':'你走採收場。守衛多，但補給站裡有彈藥。採收機控制台在機身西側。',6);}
      // Alarm: a spotted intruder gives the garrison a few seconds to raise it.
      if(this.alarm==='pending'){this.alarmTimer-=dt;if(this.alarmTimer<=0){this.alarm='active';this.alarmClock=0;g.audio.sting('alarm');g.enemies.alertAll(p.pos);g.radio('哨兵','全區警報！增援從控制塔和補給站出來了。',5);if(!this.events.alarmWave){this.events.alarmWave=true;this.enqueue(['trooper','trooper','trooper','trooper'],'alarm');}}}
      if(this.alarm==='active')this.alarmClock+=dt;
      if(this.mainDone&&!this.events.objectiveWave){this.events.objectiveWave=true;this.enqueue(f.relay?['trooper','trooper']:['trooper','trooper','trooper','elite'],'objective');if(!f.relay)g.radio('哨兵','巡邏隊正在回防前哨。別戀戰，往北走。',5);}
      this.pumpQueue(dt);
      if(this.checkpointDue>0){this.checkpointDue-=dt;if(this.checkpointDue<=0&&g.state==='playing'&&p.health>0){this.save();g.toast('檢查點已儲存：前哨目標完成');}}
      if(!f.harvester&&!this.events.gateSaid&&p.pos.z<-47&&Math.abs(p.pos.x+3)<7){this.events.gateSaid=true;g.radio('哨兵','北門跟採收作業連鎖。採收機不停，門不會開。',5);}
      this.updateInteraction(dt);
    }
    updateInteraction(dt){
      const g=this.game,p=g.player,eye=p.eye(),fwd=S.v(0,0,-1).applyQuaternion(g.camera.quaternion);let best=null,bd=1e9,refuse=null;
      for(const it of this.items){
        const d=eye.distanceTo(it.point.pos);if(d>2.7)continue;const dir=it.point.pos.clone().sub(eye).normalize();if(dir.dot(fwd)<.35)continue;
        if(!g.world.collision.visible(eye,it.aim))continue;
        if(this.enabled(it)){if(d<bd){bd=d;best=it;}}else if(!refuse)refuse=this.refusal(it);
      }
      const held=g.input.interact;if(!held)this.latch=false;
      if(best!==this.focus){this.focus=best;this.progress=0;}
      if(best&&held&&!this.latch){
        if(this.progress===0)g.audio.ui('tick');const before=this.progress;this.progress+=dt/best.hold;if(Math.floor(before*6)!==Math.floor(this.progress*6))g.audio.ui('blip');
        if(best.id==='terminal'||best.id==='harvester'||best.id==='beacon')g.world.drawScreen(best.id,'busy',Math.round(Math.min(1,this.progress)*20)/20);
        if(this.progress>=1){this.latch=true;this.progress=0;this.complete(best);this.focus=null;}
      }else if(this.progress>0){this.progress=0;this.refreshScreens();}
      g.weaponLowered=!!(best&&held&&!this.latch);
      this.denyClock=Math.max(0,this.denyClock-dt);if(refuse&&held&&this.denyClock<=0&&!best){g.audio.ui('deny');this.denyClock=1.2;}
      this.prompt=best?{label:best.label,progress:this.progress,locked:false}:refuse?{label:refuse,progress:0,locked:true}:null;
    }
    // Objective list for the HUD and the tactical map.
    objectives(){
      const f=this.flags,ex=this.game.extraction;
      return [{id:'terminal',text:'取得勘測紀錄',done:f.terminal,active:!f.terminal},{id:'harvester',text:'停止採收機',done:f.harvester,active:!f.harvester},
        {id:'beacon',text:'啟動接應信標',done:f.beacon,active:this.mainDone&&!f.beacon},{id:'board',text:'登機並撤離',done:f.board,active:f.beacon&&!f.board},
        {id:'relay',text:'切斷警報線路',done:f.relay,active:!f.relay&&!f.beacon,optional:true,failed:!f.relay&&this.events.alarmWave},{id:'supply',text:'取用東側補給',done:f.supply,active:!f.supply&&!f.board,optional:true}];
    }
    headline(){
      const f=this.flags,g=this.game,ex=g.extraction;
      if(!this.events.entered)return '穿越岩隙，選擇進入前哨的路線';
      if(!f.terminal&&!f.harvester)return '取得勘測紀錄，並讓採收機停機';if(!f.terminal)return '取得勘測紀錄';if(!f.harvester)return '停止採收機';
      if(!f.beacon)return '穿過北門，啟動接應信標';if(!g.world.thopter.landed)return '守住接應坪，等待撲翼機';if(!f.board)return '登上撲翼機';return '離開沙海';
    }
    markers(){
      const out=[],f=this.flags,P=this.game.world.points;
      for(const o of this.objectives()){if(!o.active||o.done||o.failed)continue;if(o.id==='board'&&!this.game.world.thopter.landed)continue;const it=this.items.find(i=>i.id===o.id);out.push({id:o.id,pos:it.point.pos,label:it.short,optional:!!o.optional});}
      if(f.beacon&&!f.board&&!this.game.world.thopter.landed)out.push({id:'pad',pos:P.pad.clone().add(S.v(0,1.2,0)),label:'接應坪'});
      return out;
    }
    save(){
      const g=this.game,p=g.player;
      this.checkpoint={flags:{...this.flags},alarm:this.alarm==='pending'?'idle':this.alarm,alarmClock:99,events:{...this.events,objectiveWave:false},route:this.route,stats:{...this.stats},queue:this.queue.filter(q=>q.group!=='objective').map(q=>({...q})),
        player:{x:p.pos.x,z:p.pos.z,yaw:p.yaw,health:Math.max(60,p.health)},ammo:g.ammo,reserve:Math.max(g.reserve,54),kits:g.kits,enemies:g.enemies.snapshot(),playTime:g.playTime,shots:g.shots,hits:g.hits,deaths:g.deaths};
    }
    // Restore every system the checkpoint describes, not just the player's position.
    load(){
      const c=this.checkpoint,g=this.game,w=g.world;if(!c)return false;
      this.flags={...c.flags,beacon:false,board:false};this.alarm=c.alarm;this.alarmClock=c.alarmClock;this.alarmTimer=0;this.events={...c.events};this.route=c.route;this.stats={...c.stats};this.queue=c.queue.map(q=>({...q}));this.queueClock=1.5;
      this.focus=null;this.progress=0;this.latch=true;this.checkpointDue=0;
      g.enemies.restore(c.enemies);for(const e of g.enemies.list)if(e.active&&e.alive&&e.state==='fight'){e.state='search';e.lastKnown=S.v(c.player.x,0,c.player.z);e.wait=0;}
      w.harvester.reset();if(this.flags.harvester){w.harvester.running=false;w.harvester.power=0;}
      const open=this.flags.harvester;w.setGate(open);w.gate.open=open?1:0;for(const l of w.gate.leaves)l.g.position.x=l.x+l.s*(open?3.7:0);w.gate.box.off=open;
      g.ammo=c.ammo;g.reserve=c.reserve;g.kits=c.kits;g.playTime=c.playTime;g.shots=c.shots;g.hits=c.hits;
      const p=g.player;p.reset();p.pos.set(c.player.x,w.ground(c.player.x,c.player.z),c.player.z);p.yaw=c.player.yaw;p.health=c.player.health;
      this.refreshScreens();return true;
    }
    snapshot(){return {flags:{...this.flags},alarm:this.alarm,events:{...this.events},queue:this.queue.length,route:this.route,checkpoint:!!this.checkpoint,focus:this.focus?.id||null,progress:+this.progress.toFixed(2),prompt:this.prompt?.label||null,headline:this.headline(),stats:{...this.stats}};}
  };
})(window.Spice,window.THREE);
