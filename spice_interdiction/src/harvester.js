'use strict';
/* Spice harvester: a crawling factory. Four track pods carry a pressure hull,
 * a cutter drum feeds the intake, cyclones and stacks crowd the deck.
 * It runs until the mission shuts it down: the drum spins down, the working
 * lamps go out and the hull stops shaking. */
(function(S,T){
  const K=S.Kit,C=K.C,M=S.SURF;
  S.Harvester=class{
    constructor(world){
      this.world=world;this.running=true;this.power=1;this.spin=0;this.swallowed=0;
      const x=25,z=-22.5,y=world.ground(x,z)-.15,kit=S.mats.kit,g=this.group=new T.Group();g.position.set(x,y,z);world.group.add(g);this.base=g.position.clone();
      const b=new S.Batch(),hull='#8d8572',hull2='#7a735f',dark=C.dark;
      // Track pods.
      for(const sx of [-1,1])for(const sz of [-1,1]){
        b.push(sx*4.9,0,sz*5.6);
        b.tint(C.rubber,M.polymer).cbox(kit,0,1.35,0,2.5,2.7,9.2,.85);
        b.tint(C.black,M.polymer);for(let i=0;i<30;i++){const t=i/30*9.0-4.5+.15;b.cbox(kit,0,2.72,t,2.62,.1,.2,.03).cbox(kit,0,-.02,t,2.62,.1,.2,.03);}
        for(let i=0;i<7;i++){const a=i/6*Math.PI;for(const e of [-1,1])b.cbox(kit,0,1.35+Math.cos(a)*1.38,e*(4.05+Math.sin(a)*.62),2.62,.1,.2,.03,e*a,0,0);}
        b.tint(C.gun);for(let i=0;i<5;i++){b.cyl(kit,sx*1.28,1.0,-3.2+i*1.6,.72,.16,18,'x');b.tint(C.brass,M.metal).cyl(kit,sx*1.38,1.0,-3.2+i*1.6,.24,.1,10,'x');b.tint(C.gun);}
        b.cyl(kit,sx*1.28,2.05,-4.0,.5,.16,14,'x').cyl(kit,sx*1.28,2.05,4.0,.5,.16,14,'x');
        b.tint(dark).cbox(kit,sx*1.2,2.3,0,.2,.5,7.4,.05);
        // Suspension yoke to the hull.
        b.tint(dark).cbox(kit,-sx*1.1,2.9,0,1.3,.7,3.2,.12).beam(kit,[-sx*.4,2.6,-2.4],[-sx*1.9,3.6,-1.6],.14,8).beam(kit,[-sx*.4,2.6,2.4],[-sx*1.9,3.6,1.6],.14,8);
        b.pop();
      }
      // Pressure hull and belly.
      b.tint(hull).cbox(kit,0,5.1,-.5,10.4,4.4,19.4,.7);
      b.tint(hull2).cbox(kit,0,3.0,-.5,7.0,1.0,17,.3);
      b.tint(dark);for(let i=0;i<9;i++)b.cbox(kit,0,2.55,-8+i*2,6.6,.2,.3,.05);
      // Flank panels, hatches, hazard bands and insignia.
      for(const sx of [-1,1]){
        for(let i=0;i<6;i++){const zz=-8.6+i*3.1;b.tint(i%2?hull2:hull).cbox(kit,sx*5.22,5.2,zz,.12,3.2,2.7,.05);
          b.tint(C.steel,M.metal);for(const yy of [3.85,6.55])for(const dz of [-1.15,1.15])b.cyl(kit,sx*5.3,yy,zz+dz,.05,.05,8,'x');}
        b.tint(dark).cbox(kit,sx*5.26,3.35,-.5,.1,.5,19,.03).cbox(kit,sx*5.26,7.05,-.5,.1,.36,19,.03);
        b.tint(C.black,M.polymer).cbox(kit,sx*5.3,5.4,-5.5,.06,1.9,1.2,.02);b.tint(C.steel,M.metal).cbox(kit,sx*5.36,5.4,-5.0,.05,.3,.08,.01);
        // Radiator bank.
        b.tint(dark);for(let i=0;i<12;i++)b.cbox(kit,sx*5.32,5.3,3.2+i*.22,.16,2.6,.07,.02);
        K.decal(b,S.insignia.hazard(),sx*5.3,3.36,3.5,sx,0,0,4.2);K.decal(b,S.insignia.hazard(),sx*5.3,3.36,-6,sx,0,0,4.2);
        K.decal(b,S.insignia.glyphs(61,6,'#2c241a'),sx*5.3,5.9,-2.3,sx,0,0,5.2);K.decal(b,S.insignia.text('09','#2c241a'),sx*5.3,4.7,-2.3,sx,0,0,1.5);
        // Deck rail.
        K.railing(b,sx*4.9,-9.9,sx*4.9,8.9,7.3);
      }
      K.ladder(b,-5.42,2.9,7.3,-9.2,-1,0);K.ladder(b,5.42,2.9,7.3,6.8,1,0);
      // Upper works: deck house, cab with a slit windscreen, cyclones, stacks.
      b.tint(hull2).cbox(kit,0,8.3,-2.6,7.2,2.2,11.6,.35);
      b.tint(hull).cbox(kit,0,8.75,6.2,6.2,2.9,4.6,.4);
      b.tint(C.black,M.polymer).cbox(kit,0,9.25,8.52,5.4,.75,.1,.03).cbox(kit,3.11,9.25,6.6,.06,.7,3.2,.03).cbox(kit,-3.11,9.25,6.6,.06,.7,3.2,.03);
      b.tint(dark).cbox(kit,0,10.3,6.2,6.6,.25,5,.08);
      for(const sx of [-1,1]){
        b.tint(hull).cyl(kit,sx*2.2,10.6,-1.2,1.25,2.6,24).tint(dark).add(kit,S.geo.lathe([[1.3,0],[1.05,.5],[.42,1.2],[.42,1.9],[.55,1.95],[.55,2.1],[0,2.1]],22,'cyclone'),sx*2.2,11.9,-1.2);
        b.tint(dark).cyl(kit,sx*2.2,9.5,-1.2,1.32,.14,24).cyl(kit,sx*2.2,11.3,-1.2,1.32,.14,24);
        b.tint(C.gun).beam(kit,[sx*2.2,13.8,-1.2],[sx*.6,13.8,-1.2],.3,10).beam(kit,[sx*.6,13.8,-1.2],[sx*.6,9.6,-3.4],.3,10);
      }
      this.stacks=[];
      for(let i=0;i<4;i++){const sx=(i%2?1:-1)*1.5,sz=-6.4-(i>>1)*1.7;b.tint(dark).cyl(kit,sx,10.9,sz,.48,3.2,16,'y',.4).tint(C.black,M.polymer).cyl(kit,sx,12.56,sz,.56,.22,16);this.stacks.push(new T.Vector3(sx,12.8,sz));}
      b.tint(C.gun).cbox(kit,0,9.7,-8.6,5.6,.6,2.4,.12);
      K.mast(b,-2.6,10.4,5.4,4.2,17);
      // Intake: sloped throat, side cheeks, hydraulic rams.
      b.tint(hull2).add(kit,S.geo.prism([[0,0],[3.4,0],[3.4,1.1],[0,3.6]],9.6,'throat'),0,2.0,9.2,0,-Math.PI/2,0);
      for(const sx of [-1,1]){b.tint(hull).add(kit,S.geo.prism([[0,0],[4.6,0],[4.6,1.5],[.8,4.5],[0,4.5]],.5,'cheek'),sx*5.0,.9,9.0,0,-Math.PI/2,0);
        b.tint(C.steel,M.metal).beam(kit,[sx*4.4,5.4,8.9],[sx*4.4,2.4,12.4],.11,10).tint(dark).beam(kit,[sx*4.4,6.0,8.2],[sx*4.4,4.2,10.3],.2,10);}
      b.tint(C.hazard).cbox(kit,0,4.75,9.75,9.4,.3,.3,.06);
      K.decal(b,S.insignia.glyphs(62,8,'#2c241a'),0,6.3,9.21,0,0,1,7);
      // Rear spice chute.
      b.tint(dark).add(kit,S.geo.prism([[0,0],[2.6,-1.4],[2.6,-.9],[0,.9]],2.2,'chute'),0,4.3,-10.2,0,Math.PI/2,0);
      for(const m of b.build(g,{name:'harvester'}))if(m.userData.solid)world.solids.push(m);
      S.insignia.build(g);
      // Cutter drum (spins while running).
      const d=new S.Batch();d.tint(dark).cyl(kit,0,0,0,1.15,9.2,20,'x');d.tint(C.steel,M.metal);
      for(let i=0;i<54;i++){const a=i*.82,xx=-4.4+i*.165;d.push(xx,0,0,a,0,0).cbox(kit,0,1.25,0,.14,.42,.2,.03).pop();}
      d.tint(C.gun);for(const sx of [-1,1])d.cyl(kit,sx*4.7,0,0,1.3,.24,20,'x');
      this.drum=new T.Group();this.drum.position.set(0,1.75,11.9);d.build(this.drum,{name:'drum'});g.add(this.drum);
      // Working lamps: amber while cutting, red standby after shutdown.
      this.lampMat=new T.MeshBasicMaterial({color:'#ffb04a',toneMapped:false});this.lamps=[];
      for(const [lx,ly,lz] of [[-4.2,7.9,9.6],[4.2,7.9,9.6],[-5.3,7.6,-9.6],[5.3,7.6,-9.6],[0,10.55,8.6]]){const m=new T.Mesh(S.geo.box(),this.lampMat);m.scale.set(.5,.16,.12);m.position.set(lx,ly,lz);g.add(m);this.lamps.push(m);}
      this.light=new T.PointLight('#ffb04a',30,22,1.7);this.light.position.set(0,6.5,12.5);g.add(this.light);
      world.harvester=this;g.updateMatrixWorld(true);
    }
    // World-space emitter points for dust and exhaust.
    intake(){return this.group.localToWorld(new T.Vector3(S.range(-4.2,4.2),1.0,13.2));}
    exhaust(i){return this.group.localToWorld(this.stacks[i%4].clone());}
    stop(){this.running=false;}
    reset(){this.running=true;this.power=1;this.swallowed=0;this.group.position.copy(this.base);this.group.rotation.set(0,0,0);this.group.visible=true;}
    update(dt,time){
      this.power=S.damp(this.power,this.running?1:0,this.running?3:.9,dt);
      this.spin+=dt*this.power*5.2;this.drum.rotation.x=this.spin;
      if(!this.swallowed){const j=this.power*.012;this.group.position.set(this.base.x+Math.sin(time*31)*j,this.base.y+Math.sin(time*43)*j*.8,this.base.z);}
      const blink=.55+.45*Math.sin(time*5.5),p=this.power;
      this.lampMat.color.setRGB((1.0*p*blink+.55*(1-p))*3,(.62*p*blink+.05*(1-p))*3,(.22*p*blink+.03*(1-p))*3);
      this.light.intensity=28*p*blink;
    }
  };
})(window.Spice,window.THREE);
