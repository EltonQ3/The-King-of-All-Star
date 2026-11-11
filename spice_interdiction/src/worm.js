'use strict';
/* Shai-Hulud. During the mission it is only a sign: a travelling ridge in the open
 * sand, dust, a low-frequency bed and a seismograph. Level 0 dormant, 1 distant,
 * 2 circling, 3 at the edge of the rock shelf. It never harms the player on rock.
 * In the lift-off sequence it finally surfaces under the abandoned harvester. */
(function(S,T){
  const LEVEL=[{r:0,i:0},{r:165,i:.28},{r:112,i:.58},{r:80,i:1}];
  S.Worm=class{
    constructor(game){
      this.game=game;this.root=new T.Group();game.scene.add(this.root);
      const geo=new T.PlaneGeometry(26,70,26,70);geo.rotateX(-Math.PI/2);this.base=Float32Array.from(geo.attributes.position.array);
      geo.setAttribute('aMask',new T.BufferAttribute(new Float32Array(geo.attributes.position.count*3),3));
      this.ridge=new T.Mesh(geo,S.mats.sand);this.ridge.receiveShadow=true;this.ridge.frustumCulled=false;this.root.add(this.ridge);
      // The maw: ribbed trunk, lip, throat and three rings of crystalline teeth.
      const b=new S.Batch(),rock=this.mat=S.mineralMaterial('rock','#6d5947',{scale:.35}),pts=[];
      for(let i=0;i<=34;i++){const y=-62+i*2,rib=i%2?.0:.55;pts.push([10.2+rib+Math.sin(i*.9)*.25,y]);}pts.push([10.9,7],[10.2,8.2],[8.6,8.6],[7.2,7.6]);
      b.tint('#ffffff').add(rock,S.geo.lathe(pts,56,'wormtrunk'),0,0,0);
      b.tint('#3a2a22').add(rock,S.geo.lathe([[7.2,7.6],[6.2,4],[4.8,-2],[3,-12],[.4,-26]],40,'wormthroat'),0,0,0);
      b.tint('#e6dcc6',S.SURF.metal);for(let ring=0;ring<3;ring++){const n=46-ring*8,rr=8.1-ring*1.25,yy=7.9-ring*1.7;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+ring*.07;b.push(Math.cos(a)*rr,yy,Math.sin(a)*rr,0,-a,0).add(S.mats.kit,S.geo.cone(.2,2.6-ring*.4,5),-.9,-.2,0,0,0,1.35).pop();}}
      this.maw=new T.Group();b.build(this.maw,{name:'worm'});this.maw.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material===rock)o.material.side=T.DoubleSide;}});this.maw.visible=false;this.root.add(this.maw);
      this.graph=S.$('seismic-graph');this.ctx=this.graph?.getContext('2d');this.reset();
    }
    reset(){this.level=0;this.radius=220;this.intensity=0;this.angle=-1.1;this.shake=0;this.clock=0;this.dust=0;this.breach=null;this.maw.visible=false;this.ridge.visible=false;this.env=0;this.stage='dormant';this.head=S.v(200,0,-200);}
    setLevel(n){if(n===this.level)return;const up=n>this.level;this.level=n;if(up&&n>0){this.game.audio.sting('worm');}}
    // Final sequence: rise beneath `target` (the harvester group) and take it.
    startBreach(target){this.breach={t:0,x:target.position.x,z:target.position.z+1,target,base:target.position.clone()};this.maw.position.set(this.breach.x,this.game.world.ground(this.breach.x,this.breach.z)-60,this.breach.z);this.maw.visible=true;this.level=3;}
    update(dt){
      const g=this.game,L=LEVEL[this.level];this.clock+=dt;
      this.env=S.damp(this.env,this.level>0?1:0,.5,dt);this.radius=S.damp(this.radius,L.r||230,.22,dt);
      if(this.breach){this.updateBreach(dt);}
      const cx=6,cz=-34;this.angle+=dt*(this.level>=3?.085:.06);
      const x=cx+Math.cos(this.angle)*this.radius*1.15,z=cz+Math.sin(this.angle)*this.radius,heading=Math.atan2(-Math.sin(this.angle)*1.15,Math.cos(this.angle));
      this.head.set(x,g.world.ground(x,z),z);
      const near=S.clamp(1-(this.head.distanceTo(g.player.pos)-60)/160,0,1);
      this.intensity=S.damp(this.intensity,this.breach?1:L.i*(.55+.45*near),.9,dt);
      this.shake=this.intensity>.3?(this.intensity-.3)*(.5+.5*Math.sin(this.clock*2.1))*(this.breach?2.2:1):0;
      this.stage=this.breach?'breach':['dormant','distant','circling','closing'][this.level];
      this.ridge.visible=this.env>.02&&!this.breach;
      if(this.ridge.visible){
        const pos=this.ridge.geometry.attributes.position,c=Math.cos(heading),s=Math.sin(heading),t=this.clock,e=this.env;
        for(let i=0;i<pos.count;i++){
          const lx=this.base[i*3],lz=this.base[i*3+2],wx=x+lx*c+lz*s,wz=z-lx*s+lz*c;
          const along=S.smooth(-35,-8,lz)*(1-S.smooth(18,34,lz)),mound=Math.exp(-lx*lx*.055)*(4.2+1.6*S.smooth(8,30,lz))*along,churn=Math.sin(lx*1.7-t*6+lz*.4)*.28*Math.exp(-lx*lx*.02)*along;
          pos.setXYZ(i,wx,g.world.ground(wx,wz)+(mound+churn)*e-.06,wz);
        }
        pos.needsUpdate=true;this.ridge.geometry.computeVertexNormals();
        this.dust-=dt;if(this.dust<=0&&e>.3){this.dust=.16;g.fx.plume(S.v(x+s*24,this.head.y+2,z+c*24),9,3,{size:11,speed:2.5,vy:2.2,life:5,alpha:.2*e,height:3});g.fx.plume(S.v(x,this.head.y+1,z),8,2,{size:8,speed:1.5,vy:1.2,life:4,alpha:.16*e});}
      }
      this.drawGraph();
    }
    updateBreach(dt){
      const b=this.breach,g=this.game,gy=g.world.ground(b.x,b.z);b.t+=dt;const t=b.t;
      // 0-2.5 s ground heaves; 2.5-7 s the maw rises; the harvester tips in; 9 s+ it sinks back.
      const rise=S.smooth(2.2,7,t),sink=S.smooth(10,17,t);this.maw.position.y=gy-60+rise*98-sink*50;this.maw.rotation.y=t*.05;this.maw.rotation.z=Math.sin(t*.4)*.03;
      const h=b.target,tip=S.smooth(2.6,6.5,t);h.position.set(b.base.x+Math.sin(t*9)*.15*(1-tip),b.base.y-tip*tip*30+Math.sin(t*14)*.1*(1-tip),b.base.z);h.rotation.set(-tip*.75,0,tip*.35);if(tip>=1)h.visible=false;
      g.world.harvester.swallowed=1;
      b.dust=(b.dust||0)-dt;if(b.dust<=0&&t<14){b.dust=.09;const k=t<2.4?.5:1;g.fx.plume(S.v(b.x,gy+1,b.z),t<2.4?9:16,5,{size:7+rise*7,speed:6+rise*8,vy:2+rise*5,life:4.5,alpha:.3*k,height:3+rise*6,tone:.8+g.rand()*.5});if(t>2.4&&t<9)g.fx.plume(S.v(b.x,gy+6+rise*20,b.z),11,3,{size:8,speed:4,vy:5,life:3.6,alpha:.24,height:10,tone:.75+g.rand()*.5});}
    }
    drawGraph(){
      if(!this.ctx)return;const c=this.ctx,w=this.graph.width,h=this.graph.height,t=this.clock,k=this.intensity;c.clearRect(0,0,w,h);c.strokeStyle=k>.75?'#ff8a5a':'#d8ad6f';c.lineWidth=1.3;c.beginPath();
      for(let i=0;i<w;i++){const u=i/w,amp=(Math.sin(u*90-t*9)*Math.sin(u*14-t*3.1)+Math.sin(u*221+t*11)*.22)*(1.2+k*14);i?c.lineTo(i,h*.5+amp):c.moveTo(i,h*.5+amp);}c.stroke();
    }
    snapshot(){return {level:this.level,stage:this.stage,intensity:+this.intensity.toFixed(3),breach:!!this.breach};}
  };
})(window.Spice,window.THREE);
