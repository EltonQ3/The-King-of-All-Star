'use strict';
(function(S,T){
  /* Extraction: beacon -> approach countdown with pursuit and rising worm sign ->
   * the ornithopter lands -> hold to board -> lift-off sequence -> debrief.
   * Boarding needs a landed aircraft; nearby enemies do not block it. */
  S.Extraction=class{
    constructor(game){this.game=game;this.reset();}
    reset(){this.phase='idle';this.t=0;this.duration=75;this.waves={a:false,b:false,c:false};this.trickle=0;this.outro=0;this.said={};const g=this.game;g.world.thopter.reset();g.worm.reset();g.post.fade=0;g.letterbox=0;}
    get active(){return this.phase==='inbound'||this.phase==='boarding';}
    get remaining(){return this.phase==='inbound'?Math.max(0,this.duration-this.t):0;}
    activate(){
      const g=this.game,cut=g.mission.flags.relay;this.phase='inbound';this.t=0;g.world.thopter.call(this.duration);g.worm.setLevel(2);g.audio.sting('objective');
      g.radio('飛行員','收到信標。七十五秒後到坪上。震波會把沙蟲引過來——守住，別離開岩地。',6);
    }
    board(){
      const g=this.game;if(this.phase!=='boarding'||!g.world.thopter.landed)return;this.phase='outro';this.outro=0;g.beginOutro();g.world.thopter.depart();g.audio.sting('arrive');
    }
    update(dt){
      const g=this.game,m=g.mission,th=g.world.thopter,cut=m.flags.relay;
      if(this.phase==='inbound'){
        this.t+=dt;const u=this.t/this.duration;
        if(!this.waves.a&&this.t>7){this.waves.a=true;m.enqueue(cut?['trooper','elite']:['trooper','trooper','elite'],'pursuit');g.radio('哨兵','追兵從前哨內側過來了。利用掩體，別站在坪中央。',5);}
        if(!this.waves.b&&u>.45){this.waves.b=true;g.worm.setLevel(3);m.enqueue(cut?['elite','trooper']:['elite','elite','trooper','trooper'],'pursuit');g.radio('哨兵','沙蟲在岩地邊緣繞圈。牠不會上來，但撲翼機不能久留。',5);}
        if(!this.said.near&&u>.8){this.said.near=true;g.radio('飛行員','看到你了。正在降落，準備登機。',4);}
        if(th.landed){this.phase='boarding';this.t=0;g.audio.sting('arrive');m.refreshScreens();if(!this.waves.c){this.waves.c=true;m.enqueue(cut?['trooper']:['trooper','elite'],'pursuit');}g.radio('飛行員','艙門開著。靠近左舷，按住互動鍵登機。',6);}
        // Rotor wash as it settles.
        if(th.altitude<16&&th.phase==='inbound'){this.wash=(this.wash||0)-dt;if(this.wash<=0){this.wash=.12;g.fx.plume(S.v(th.root.position.x,g.world.points.pad.y+.3,th.root.position.z),5+th.altitude*.4,3,{size:3.6,speed:6,vy:.6,life:2.2,alpha:.26*(1-th.altitude/16)});}}
      }else if(this.phase==='boarding'){
        this.t+=dt;this.trickle+=dt;if(this.trickle>24&&g.enemies.living<4){this.trickle=0;m.enqueue([cut?'trooper':'elite'],'pursuit');}
        if(!this.said.hurry&&this.t>30){this.said.hurry=true;g.radio('飛行員','不能再等了，快上來！',4);}
      }else if(this.phase==='outro'){
        this.outro+=dt;const t=this.outro;g.letterbox=S.smooth(0,1,t);
        if(!this.said.breach&&t>3.2){this.said.breach=true;g.worm.startBreach(g.world.harvester.group);g.audio.sting('worm');}
        if(!this.said.last&&t>8.5){this.said.last=true;g.radio('哨兵','沙海收回了它的香料。穴地見。',5);}
        if(t<3&&th.altitude<14){this.wash=(this.wash||0)-dt;if(this.wash<=0){this.wash=.1;g.fx.plume(S.v(th.root.position.x,g.world.points.pad.y+.3,th.root.position.z),6,3,{size:4,speed:7,vy:.7,life:2.2,alpha:.24});}}
        g.post.fade=S.smooth(13.5,15.5,t);if(t>15.6){this.phase='done';g.finish();}
      }
    }
    // Camera for the lift-off: first from the open door, then a chase view that holds
    // the aircraft in the foreground and the harvester behind it.
    camera(cam){
      const g=this.game,th=g.world.thopter,t=this.outro,r=th.root,h=g.world.harvester.base.clone().add(S.v(0,7,0));
      const door=r.localToWorld(S.v(-2.1,2.75,-.3)),chase=r.position.clone().add(S.v(-17-t*.6,5.5+t*.25,-13-t*.5));
      const k=S.smooth(2.4,4.4,t),pos=door.lerp(chase,k),look=r.position.clone().add(S.v(0,2,0)).lerp(h,S.lerp(.75,.55,k));
      cam.position.copy(pos);cam.lookAt(look);cam.rotation.z+=Math.sin(t*1.3)*.012*(1-k*.5);cam.fov=S.lerp(74,52,k);
    }
    snapshot(){return {phase:this.phase,t:+this.t.toFixed(1),remaining:+this.remaining.toFixed(1),waves:{...this.waves},outro:+this.outro.toFixed(1)};}
  };
})(window.Spice,window.THREE);
