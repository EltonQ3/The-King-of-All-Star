'use strict';
/* Scripted environmental warning, not a boss fight. A visible sub-surface ridge
 * and dust front pass east of the outpost. The event never blocks extraction. */
(function(S,T){
  const smooth=(a,b,t)=>{const x=S.clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
  S.WormWarning=class{
    constructor(game){
      this.game=game;this.root=new T.Group();game.scene.add(this.root);
      const geo=new T.PlaneGeometry(20,48,32,72);geo.rotateX(-Math.PI/2);this.base=Array.from(geo.attributes.position.array);
      this.ridge=S.mesh(this.root,geo,S.sandMaterial(),0,0,0,false);this.ridge.receiveShadow=true;
      this.clouds=[];const rnd=S.rng(770);
      for(let i=0;i<36;i++){
        const mat=new T.SpriteMaterial({map:S.softTexture(),color:i%3?'#b59471':'#d1b38a',transparent:true,opacity:0,depthWrite:false});
        const sp=new T.Sprite(mat);sp.userData={offset:(rnd()-.5)*10,trail:rnd()*38,size:6+rnd()*12,lift:3+rnd()*13,phase:rnd()*6.28};this.root.add(sp);this.clouds.push(sp);
      }
      this.screen=document.getElementById('seismic');this.graph=document.getElementById('seismic-graph');this.ctx=this.graph?.getContext('2d');this.reset();
    }
    reset(){this.triggered=false;this.elapsed=0;this.intensity=0;this.stage='dormant';this.pulses=0;this.root.visible=false;this.shake=0;this.cues=[];if(this.screen)this.screen.hidden=true;}
    trigger(){if(this.triggered)return;this.triggered=true;this.elapsed=0;this.stage='listening';this.root.visible=true;this.cue('地底震動正在增強。沙蟲接近採收區，留意前哨外圍沙海。',7);this.game.audio.seismicPulse();}
    cue(text,sec){this.game.notify(text,sec);this.cues.push({time:+this.elapsed.toFixed(2),text});}
    update(dt){
      const g=this.game;
      if(!this.triggered&&g.playTime>8&&(g.kills>=2||g.shots>=8||g.player.pos.z<3))this.trigger();
      if(!this.triggered)return;this.elapsed+=dt;const t=this.elapsed;
      const old=this.stage;this.stage=t<6?'listening':t<15?'approaching':t<25?'passing':t<36?'receding':'settled';
      if(this.stage!==old){if(this.stage==='approaching'){this.cue('沙面正在隆起。牠從前哨東側掠過，繼續向北側岩門撤離。',7);g.audio.seismicPulse();}if(this.stage==='passing')g.audio.seismicPulse();if(this.stage==='receding')this.cue('震源正在遠離。岩地仍然安全。',4);}
      this.intensity=(.12+.88*smooth(3,15,t))*(1.-smooth(23,36,t));
      this.shake=(Math.sin(t*38)*.006+Math.sin(t*23.7)*.004)*this.intensity;
      this.root.visible=t<36;
      if(this.screen)this.screen.hidden=t>36||g.state!=='playing';
      if(t>=36){this.intensity=0;this.shake=0;return;}
      const x=32+Math.sin(t*.13)*6,z=-70-t*2.5,env=smooth(3,10,t)*(1.-smooth(26,36,t));
      const pos=this.ridge.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const lx=this.base[i*3],lz=this.base[i*3+2],wx=x+lx+Math.sin(lz*.12+t*.7)*.65,wz=z+lz;
        const mound=Math.exp(-lx*lx*.1-lz*lz*.003)*3.5;
        const shoulder=(Math.sin(lx*2.0-t*8)*.5+.5)*Math.exp(-lx*lx*.015-lz*lz*.003)*.32;
        pos.setXYZ(i,wx,g.world.ground(wx,wz)+(mound+shoulder)*env-.055,wz);
      }
      pos.needsUpdate=true;this.ridge.geometry.computeVertexNormals();this.ridge.geometry.computeBoundingSphere();
      for(const cloud of this.clouds){const u=cloud.userData,cx=x+u.offset+Math.sin(t*.9+u.phase)*1.9,cz=z+u.trail-10;
        cloud.position.set(cx,g.world.ground(cx,cz)+u.lift*env,cz);cloud.scale.set(u.size*(1+env*.6),u.size*(.9+env*.85),1);
        cloud.material.opacity=env*(.20+.12*Math.sin(t+u.phase)**2);cloud.material.rotation=Math.sin(t*.13+u.phase)*.3;
      }
      if(this.ctx){const c=this.ctx,w=this.graph.width,h=this.graph.height;c.clearRect(0,0,w,h);c.strokeStyle='#d8ad6f';c.lineWidth=1.3;c.beginPath();for(let i=0;i<w;i++){const k=i/w,amp=(Math.sin(k*90-t*9)*Math.sin(k*14-t*3.1)+Math.sin(k*221+t*11)*.22)*(3+this.intensity*12);const y=h*.5+amp;c.lineTo(i,y);}c.stroke();}
      const txt=document.getElementById('seismic-label');if(txt)txt.textContent={listening:'地底訊號',approaching:'沙蟲接近',passing:'東側掠過',receding:'震源遠離'}[this.stage]||'';
      const value=document.getElementById('seismic-level');if(value)value.textContent=Math.round(this.intensity*100).toString().padStart(2,'0');
    }
    snapshot(){return {triggered:this.triggered,stage:this.stage,elapsed:+this.elapsed.toFixed(2),intensity:+this.intensity.toFixed(3),cues:this.cues.length};}
  };
})(window.Spice,window.THREE);
