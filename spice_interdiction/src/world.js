'use strict';
/* Harvest Outpost 09. Layout (x east, z south, north is -z):
 *
 *            landing shelf · beacon · pad            z -58 … -78
 *   ══════════ north wall ═══[ gate ]═══════════     z -52
 *   control │ west service │ silo │ east harvest
 *   tower   │ lane: relay, │ spine│ field: harvester,
 *           │ survey alcove│      │ depot, supply cache
 *   ═══[ west gate ]═══ sand wall ═══[ east gate ]═  z 6
 *                    canyon (start)                  z 54
 *
 * The spine has two cross-passages, so the routes can be swapped mid-way. */
(function(S,T){
  const K=S.Kit,C=K.C,M=S.SURF,G=(x,z)=>S.groundHeight(x,z);
  S.World=class{
    constructor(scene,renderer){
      this.scene=scene;this.collision=new S.Collision();this.collision.bounds={minX:-47,maxX:49,minZ:-80.5,maxZ:62};
      this.solids=[];this.dynamic=[];this.lamps=[];this.spawn=S.v(0,0,54);this.mapShapes=[];
      const mats=this.mats=S.mats;mats.farRock=S.mineralMaterial('rock','#ffffff',{scale:.05});mats.farRock.side=T.DoubleSide;
      this.sky=new S.Sky(scene,renderer);
      this.terrain=new S.Terrain(scene,mats);
      this.terrain.addTrack([16.2,22],[16.2,-6],3.4);this.terrain.addTrack([16.2,-6],[25,-12],3.4);this.terrain.addTrack([-12.5,20],[-12.5,-34],1.6);this.terrain.addTrack([-3,-44],[-3,-60],2.6);
      this.terrain.build();
      this.group=new T.Group();scene.add(this.group);
      this.points={
        relay:{pos:S.v(-17.55,1.15,-13),stand:S.v(-15.9,0,-13)},
        terminal:{pos:S.v(-17.0,1.25,-28),stand:S.v(-15.2,0,-28)},
        harvester:{pos:S.v(16.9,1.25,-25),stand:S.v(15.2,0,-25)},
        supply:{pos:S.v(34.2,.7,-3.6),stand:S.v(32.8,0,-3.6)},
        beacon:{pos:S.v(-12.6,1.25,-60.4),stand:S.v(-11.2,0,-60.4)},
        pad:S.v(-3,0,-67),board:{pos:S.v(-3,1.2,-64.2),stand:S.v(-3,0,-62.6)},
        gate:S.v(-3,0,-52)
      };
      for(const k of ['relay','terminal','harvester','supply','beacon','board'])this.points[k].stand.y=G(this.points[k].stand.x,this.points[k].stand.z);
      this.points.pad.y=G(-3,-67);
      this.buildRocks();this.buildWalls();this.buildTower();this.buildSpine();this.buildWestLane();this.buildEastField();this.buildNorthYard();this.buildLanding();this.buildBackdrop();this.buildDynamic();
      S.insignia.build(this.group);
      this.buildNav();scene.updateMatrixWorld(true);
    }
    ground(x,z){return G(x,z);}
    emit(b,name){for(const m of b.build(this.group,{name})){if(m.userData.solid)this.solids.push(m);}}
    // Axis-aligned collider resting on the ground; also recorded for the tactical map.
    block(x,z,w,d,h,tag='structure',y=null){const yy=y===null?Math.min(G(x-w/2,z-d/2),G(x+w/2,z+d/2),G(x,z))-.4:y;const box=this.collision.add(x,yy,z,w,h+(y===null?.4:0),d,tag);this.mapShapes.push({type:'box',x,z,w,d,tag});return box;}
    round(x,z,rx,rz,h,rot=0,tag='rock'){const y=G(x,z)-1;this.mapShapes.push({type:'ellipse',x,z,rx,rz,rot,tag});return this.collision.addEllipse(x,z,rx,rz,y,y+h+1,rot,tag);}

    rock(x,z,sx,h,sz,seed,collide=true){
      let y=G(x,z)-1.2;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;y=Math.min(y,G(x+Math.cos(a)*sx*1.2,z+Math.sin(a)*sz*1.2)-1.2);}
      const m=new T.Mesh(S.rockGeometry(seed),this.mats.rock);m.position.set(x,y,z);m.scale.set(sx,h,sz);m.rotation.y=seed*.67;m.castShadow=m.receiveShadow=true;this.group.add(m);
      if(collide){this.solids.push(m);this.round(x,z,sx*.97,sz*.97,h,m.rotation.y);}return m;
    }
    buildRocks(){
      const spec=[[-13.5,58,10,25,13],[-12.5,40,8,20,11],[-18,25,10,22,9],[13.5,56,8,22,11],[12.5,39,7,17,12],[19,25,10,18,10],[-34,50,16,34,20],[33,55,15,31,22],[0,72,15,27,8],
        [-54,12,10,24,15],[-58,-20,12,31,24],[-54,-50,10,23,13],[56,16,9,19,13],[59,-14,11,27,19],[57,-42,10,21,15],[-32,-68,10,25,13],[27,-66,11,21,14],[-36,-90,13,19,11],[24,-92,10,15,9]];
      spec.forEach((s,i)=>this.rock(...s,i+4));
      const rnd=S.rng(808);
      for(let i=0;i<26;i++){const a=rnd()*Math.PI*2,r=170+rnd()*330,x=Math.cos(a)*r,z=Math.sin(a)*r-20;if(z>140&&Math.abs(x)<90)continue;this.rock(x,z,10+rnd()*26,16+rnd()*46,10+rnd()*24,90+i,false);}
      // Boulders and scree: one instanced mesh.
      const g=S.rockGeometry(3,10,6),count=380,im=new T.InstancedMesh(g,this.mats.rock,count),o=new T.Object3D();
      for(let i=0;i<count;i++){
        let x,z,tries=0;do{x=-50+rnd()*102;z=-84+rnd()*150;tries++;}while(tries<8&&(S.shelfMask(x,z)<.5||(Math.abs(x)<44&&z<4&&z>-50&&rnd()>.25)));
        const big=rnd()>.93,s=big?.5+rnd()*.7:.05+rnd()*rnd()*.4;o.position.set(x,G(x,z)-s*.25,z);o.scale.set(s*(1+rnd()*.8),s*(.5+rnd()*.5),s*(1+rnd()*.6));o.rotation.set(rnd()*.5,rnd()*6.28,rnd()*.5);o.updateMatrix();im.setMatrixAt(i,o.matrix);
      }
      im.castShadow=im.receiveShadow=true;this.group.add(im);
    }

    buildWalls(){
      const b=new S.Batch();
      const wall=(x0,z0,x1,z1,h,t)=>{K.wall(b,x0,z0,x1,z1,h,t,G((x0+x1)/2,(z0+z1)/2));this.block((x0+x1)/2,(z0+z1)/2,Math.abs(x1-x0)||t,Math.abs(z1-z0)||t,h+.3,'wall');};
      wall(-46,6,-17,6,3.5,1.4);wall(-8,6,10.5,6,3.5,1.4);wall(22,6,47.5,6,3.5,1.4);
      wall(-46,-52,-9.5,-52,4.8,1.6);wall(3.5,-52,47.5,-52,4.8,1.6);
      const portal=(x,z,w,h,d)=>{K.portal(b,x,G(x,z),z,w,h,0,d);for(const s of [-1,1])this.block(x+s*(w/2+1.2),z,2.5,d,h+2,'wall');};
      portal(-12.5,6,4,4.3,2.4);portal(16.25,6,6.5,4.8,2.4);portal(-3,-52,8,6.2,2.8);
      K.decal(b,S.insignia.text('維修道','#3a2d20'),-12.5,5.1,7.0,0,0,1,2.2);K.decal(b,S.insignia.glyphs(21,5,'#3a2d20'),-12.5,5.75,7.0,0,0,1,3);
      K.decal(b,S.insignia.text('採收場','#3a2d20'),16.25,5.6,7.0,0,0,1,2.4);K.decal(b,S.insignia.glyphs(22,7,'#3a2d20'),16.25,6.25,7.0,0,0,1,4.4);
      K.decal(b,S.insignia.text('09','#3a2d20'),1,2.2,6.72,0,0,1,2.4);K.decal(b,S.insignia.sigil('#3a2d20'),-3.2,2.2,6.72,0,0,1,1.7);
      K.decal(b,S.insignia.glyphs(23,8,'#3a2d20'),-3,7.2,-50.55,0,0,1,5.6);K.decal(b,S.insignia.text('接應坪','#3a2d20'),-3,6.45,-50.55,0,0,1,2.6);
      // Sensor posts and marker lamps along the approach.
      for(const [x,z] of [[-6,16],[6,13],[-17.5,9.2],[-7.5,9.2],[11,9.2],[21.5,9.2]])this.lamps.push(K.lamp(b,x,G(x,z),z,3.2,C.amber));
      this.emit(b,'walls');
    }

    buildTower(){
      const b=new S.Batch(),con=this.mats.concrete,kit=this.mats.kit,cx=-31,cz=-20;
      b.push(cx,0,cz);
      b.tint(C.concreteDark).add(con,S.geo.frustum(26.4,34.4,25.6,33.6,1.3),0,-.1,0);
      const tiers=[[24,32,21.6,29.6,13,1.2],[17.4,23.6,15.6,21.6,10,14.2],[9.6,13.6,8.6,12.6,7.4,24.2]];
      for(const [w0,d0,w1,d1,h,y] of tiers){
        b.tint(C.concrete).add(con,S.geo.frustum(w0,d0,w1,d1,h),0,y,0);
        b.tint(C.concreteDark).cbox(con,0,y+h+.25,0,w1+.9,.5,d1+.9,.1);
        // Buttress fins on all four faces.
        const slope=(w0-w1)/2,fin=S.geo.prism([[0,0],[1.5,0],[.35+slope,h*.97],[0,h*.97]],.85,'fin'+h);
        b.tint(C.concrete);
        for(const s of [-1,1]){
          const nz=Math.floor(d0/4.2);for(let i=0;i<nz;i++){const zz=-d0/2+2.1+i*(d0-4.2)/(nz-1);if(y<2&&s>0&&(Math.abs(zz+8)<3.2||Math.abs(zz-7)<4.4))continue;b.add(con,fin,s*(w0/2-.55),y,zz,0,s>0?0:Math.PI,0);}
          const nx=Math.floor(w0/4.2);for(let i=0;i<nx;i++){const xx=-w0/2+2.1+i*(w0-4.2)/(nx-1);if(y<2&&s>0&&Math.abs(xx)<5)continue;b.add(con,fin,xx,y,s*(d0/2-.55),0,s>0?-Math.PI/2:Math.PI/2,0);}
        }
      }
      // Slit windows: a few lit, most dark.
      const rnd=S.rng(41);
      for(const [w0,d0,,,h,y] of tiers.slice(0,2)){
        for(let i=0;i<7;i++){const zz=-d0/2+3.4+i*(d0-6.8)/6,lit=rnd()>.55;b.tint(lit?C.amber:C.black,lit?0:M.polymer,lit?.75:0).cbox(kit,w0/2-.35-(h*.62)*((w0-21.6)/2/13>0?.09:.09),y+h*.62,zz+2,.12,1.5,.34,.02);}
        for(let i=0;i<5;i++){const xx=-w0/2+3.4+i*(w0-6.8)/4,lit=rnd()>.5;b.tint(lit?C.amber:C.black,lit?0:M.polymer,lit?.75:0).cbox(kit,xx+2,y+h*.62,d0/2-.4,.34,1.5,.12,.02);}
      }
      // Main door, south face: deep frame, ribbed slab, light bar.
      b.tint(C.concrete);for(const s of [-1,1])b.add(con,S.geo.frustum(2.2,2.6,1.9,2.2,9.4),s*4.6,1.2,16.6);
      b.cbox(con,0,10.4,16.5,11.6,1.5,2.5,.12).tint(C.black,M.polymer).cbox(kit,0,5.3,15.9,7,8.4,.3,.05);
      b.tint(C.dark);for(let i=0;i<8;i++)b.cbox(kit,-3.1+i*.89,5.3,16.08,.16,8.2,.2,.03);
      b.tint(C.amber,0,1).cbox(kit,0,9.55,16.2,6.6,.09,.06,.01);
      b.tint(C.concreteDark).cbox(con,0,1.0,18.4,10,.5,1.6,.06).cbox(con,0,.75,19.6,10,.5,1.0,.06);
      // Roofscape.
      b.pop();
      K.mast(b,cx+2.4,31.7,cz-2,9,3);K.mast(b,cx-2.2,31.7,cz+3.4,6.5,5);
      b.tint(C.gun);for(const [x,z] of [[cx+5,cz-8],[cx+5,cz+7],[cx-6,cz-7]]){b.cbox(kit,x,25.2,z,2.2,1.4,2.8,.08).tint(C.black,M.polymer).cbox(kit,x,25.95,z,1.8,.1,2.4,.02).tint(C.gun);}
      K.railing(b,cx-10.6,cz-14.6,cx+10.6,cz-14.6,14.75);K.railing(b,cx+10.6,cz-14.6,cx+10.6,cz+14.6,14.75);K.railing(b,cx+10.6,cz+14.6,cx-10.6,cz+14.6,14.75);
      K.decal(b,S.insignia.sigil('#40311f'),-19.95,9.4,-21.5,1,0,-.09,4.6);K.decal(b,S.insignia.glyphs(31,6,'#40311f'),-19.6,5.3,-21.5,1,0,-.09,7);
      K.decal(b,S.insignia.glyphs(32,8,'#40311f'),cx,13.2,-3.9,0,0,1,9);
      this.block(cx,cz,26,34,34,'tower');this.block(cx,-2.2,12,3.4,10,'tower');

      // Survey alcove on the east face: porch, sealed door, data terminal.
      b.push(-18,0,-28);
      b.tint(C.concrete);for(const s of [-1,1])b.cbox(con,1.15,1.75,s*2.05,2.6,3.5,.6,.08);
      b.cbox(con,1.2,3.75,0,2.9,.55,5.0,.1).tint(C.black,M.polymer).cbox(kit,.02,1.6,0,.2,3.1,3.2,.04);
      b.tint(C.dark);for(let i=0;i<5;i++)b.cbox(kit,.16,1.6,-1.28+i*.64,.1,3,.1,.02);
      b.tint(C.cyan,0,.9).cbox(kit,.2,3.3,0,.05,.07,3.0,.01);
      b.pop();
      K.console(b,-17.0,G(-17,-28),-28,Math.PI/2,C.gun);
      K.decal(b,S.insignia.text('勘測','#d9c9a6'),-15.52,4.02,-28,1,0,0,1.5);
      this.block(-16.85,-30.05,2.7,.6,3.6,'tower');this.block(-16.85,-25.95,2.7,.6,3.6,'tower');this.block(-17.2,-28,.9,.9,1.5,'prop');
      // Alarm relay bay.
      K.cabinet(b,-18.02,G(-17.8,-13),-13,Math.PI/2,1.25,1.9,C.rust);
      b.tint(C.gun).cyl(kit,-17.7,4.3,-13,.07,3.2,8).tint(C.dark).add(kit,S.geo.lathe([[.06,0],[.1,.02],[.3,.5],[.34,.52],[.3,.54],[.06,.08]],14,'horn'),-17.55,5.6,-13,0,0,-Math.PI/2);
      K.decal(b,S.insignia.text('警報','#e3d3ae'),-17.66,2.25,-13,1,0,0,.9);
      // Service trunks high on the wall.
      K.pipe(b,[[-17.75,3.1,-5.5],[-17.75,3.1,-23.4],[-17.75,5.2,-23.4],[-18.6,5.2,-23.4]],.2,C.gun,false);K.pipe(b,[[-17.55,2.55,-5.5],[-17.55,2.55,-10.8],[-17.55,.4,-10.8]],.13,C.rust,false);
      K.pipe(b,[[-17.7,3.3,-32.6],[-17.7,3.3,-36.6],[-17.7,.3,-36.6]],.17,C.sandPaint,false);
      K.cable(b,[-17.55,5.6,-13],[-2.3,10.2,1.2],1.2);
      this.emit(b,'tower');
    }

    buildSpine(){
      const b=new S.Batch(),con=this.mats.concrete,kit=this.mats.kit;
      const silo=(x,z,r,h,color,seed)=>{K.silo(b,x,G(x,z)-.1,z,r,h,color,seed);this.round(x,z,r+.25,r+.25,h+3,0,'silo');};
      silo(0,1.0,2.5,9.6,C.sandPaint,1);silo(0,-4.7,2.5,8.6,C.concretePale,2);silo(0,-30.3,2.5,9.2,C.sandPaint,3);silo(0,-35.9,2.5,8.2,C.concretePale,4);
      // Pump house.
      const gy=G(0,-15.6);b.push(0,gy,-15.6);
      b.tint(C.concrete).add(con,S.geo.frustum(6.4,7.8,5.9,7.3,4.2),0,-.1,0).tint(C.concreteDark).cbox(con,0,4.25,0,6.5,.4,7.9,.08);
      b.tint(C.black,M.polymer).cbox(kit,3.13,1.25,1.2,.12,2.3,1.5,.03).tint(C.dark).cbox(kit,3.2,2.55,1.2,.3,.2,1.9,.04);
      b.tint(C.gun).cbox(kit,-.8,4.9,-1.4,2.2,.9,2.4,.08).cbox(kit,1.3,4.75,1.8,1.4,.6,1.6,.06);b.tint(C.black,M.polymer);for(let i=0;i<8;i++)b.cbox(kit,-1.7+i*.26,4.9,-.18,.12,.6,.04,.01);
      b.tint(C.steel,M.metal).cyl(kit,1.3,5.6,1.8,.22,1.1,12).cyl(kit,1.3,6.2,1.8,.3,.12,12);
      K.decal(b,S.insignia.glyphs(8,5,'#3a2d20'),3.02,3.2,-1.4,1,0,0,3);K.decal(b,S.insignia.hazard(),3.2,.5,1.2,1,0,0,1.5);
      b.pop();this.block(0,-15.6,6.4,7.8,4.6,'structure');
      K.tank(b,0,G(0,-21.6),-21.6,1.05,4.4,0,C.gun);this.block(0,-21.6,5.6,2.3,2.7,'structure');
      // Overhead lines bridging the two cross-passages.
      K.pipe(b,[[.9,6.4,-1.6],[.9,6.4,-9.5],[.9,5.0,-11.9]],.2,C.gun,false);K.pipe(b,[[-.8,5.4,-7.1],[-.8,5.4,-11.9]],.13,C.rust,false);
      K.pipe(b,[[.8,3.3,-22.6],[.8,5.6,-22.6],[.8,5.6,-27.9]],.18,C.gun,false);K.pipe(b,[[-.9,4.9,-19.4],[-.9,4.9,-27.9]],.12,C.sandPaint,false);
      this.lamps.push(K.lamp(b,-3.6,G(-3.6,-9.5),-9.5,3.4,C.amber),K.lamp(b,3.6,G(3.6,-25.5),-25.5,3.4,C.amber));
      this.emit(b,'spine');
    }

    buildWestLane(){
      const b=new S.Batch();
      const stack=(x,z,ry,seed)=>{K.stack(b,x,G(x,z),z,ry,seed);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x+.15*c,z+.1*s,3.3*c+1.25*s,3.3*s+1.25*c,1.25,'cover');};
      const barrier=(x,z,ry,len=3.6)=>{K.barrier(b,x,G(x,z)-.05,z,len,ry);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x,z,len*c+.9*s,len*s+.9*c,1.15,'cover');};
      stack(-15.4,1.6,0,11);stack(-6.8,-2.4,Math.PI/2,12);stack(-38,1.5,.1,13);stack(-13.6,-38.6,.3,14);
      barrier(-13,-7.4,0);barrier(-8.4,-25.6,Math.PI/2);barrier(-14.2,-33,0);barrier(-26,1.2,0);barrier(-9.6,-13,0,2.6);
      K.crawler(b,-9.6,G(-9.6,-19.5),-19.5,.08);this.block(-9.6,-19.5,2.6,4.5,2.3,'cover');
      K.tank(b,-5.4,G(-5.4,-15.6),-15.6,.95,5.2,Math.PI/2,C.rust);this.block(-5.4,-15.6,2.1,6.4,2.5,'structure');
      K.generator(b,-15.6,G(-15.6,-20.5),-20.5,Math.PI/2);this.block(-15.6,-20.5,1.6,3,1.8,'cover');
      for(const [x,z,c] of [[-16.6,-5.2,C.dark],[-16.0,-5.6,C.rust],[-16.5,-6.0,C.dark],[-5.6,-28.4,C.rust],[-6.3,-28.6,C.dark],[-11.5,-30.2,C.dark]])K.barrel(b,x,G(x,z),z,c);
      this.block(-16.3,-5.6,1.3,1.2,1,'cover');this.block(-5.95,-28.5,1.4,.8,1,'cover');
      K.awning(b,-14.5,G(-14.5,-42),-42.5,5,3.4,3,0);K.crate(b,-15.4,G(-15.4,-42.6),-42.6,1.6,1.1,1.1,.2,C.olive,4);K.crate(b,-13.4,G(-13.4,-42.8),-42.8,1.2,.8,1.0,-.3,C.sandPaint,0);this.block(-14.5,-42.7,3.6,1.3,1.1,'cover');
      this.lamps.push(K.lamp(b,-17.4,G(-17.4,-3),-3,3.6,C.amber),K.lamp(b,-4.6,G(-4.6,-22.6),-22.6,3.4,C.amber),K.lamp(b,-30,G(-30,3.8),3.8,4,C.amber));
      this.emit(b,'west');
    }

    buildEastField(){
      const b=new S.Batch(),con=this.mats.concrete,kit=this.mats.kit;
      const stack=(x,z,ry,seed)=>{K.stack(b,x,G(x,z),z,ry,seed);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x+.15*c,z+.1*s,3.3*c+1.25*s,3.3*s+1.25*c,1.25,'cover');};
      const barrier=(x,z,ry,len=3.6)=>{K.barrier(b,x,G(x,z)-.05,z,len,ry);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x,z,len*c+.9*s,len*s+.9*c,1.15,'cover');};
      this.block(25,-22.2,12.9,24.6,10,'harvester');   // the machine itself is built by harvester.js
      // Depot bunker with a deep west-facing doorway and a canopy.
      const dx=41.5,dz=-1.5,gy=G(dx,dz);b.push(dx,gy,dz);
      b.tint(C.concrete).add(con,S.geo.frustum(9.6,11.6,8.6,10.6,4.8),0,-.2,0).tint(C.concreteDark).cbox(con,0,4.75,0,9.4,.45,11.4,.1);
      b.tint(C.concrete);for(const s of [-1,1])b.cbox(con,-5.3,1.9,s*2.0,1.6,3.8,.7,.08);b.cbox(con,-5.3,4.0,0,1.9,.6,4.9,.1);
      b.tint(C.black,M.polymer).cbox(kit,-4.82,1.7,0,.2,3.3,3.3,.04).tint(C.amber,0,.9).cbox(kit,-5.05,3.55,0,.05,.07,3.1,.01);
      b.tint(C.gun).cbox(kit,1.5,5.3,-2.5,2.4,.8,2.6,.08).cbox(kit,-1.6,5.2,2.6,1.6,.6,1.8,.06);
      b.pop();K.mast(b,dx+2.2,gy+4.9,dz+3,6,9);
      K.decal(b,S.insignia.text('補給','#3a2d20'),dx-6.12,4.05,dz,-1,0,0,1.6);K.decal(b,S.insignia.glyphs(44,5,'#3a2d20'),dx-4.3,3.9,dz+5.83,0,0,1,4);
      this.block(dx,dz,9.6,11.6,5,'structure');this.block(dx-5.3,dz-2.0,1.7,.75,4,'structure');this.block(dx-5.3,dz+2.0,1.7,.75,4,'structure');
      K.awning(b,33.4,G(33.4,-5.4),-5.4,4.6,4.2,3.1,Math.PI/2);
      K.crate(b,32.2,G(32.2,-7.3),-7.3,1.6,1.1,1.1,.15,C.sandPaint,6);K.crate(b,33.9,G(33.9,-7.5),-7.5,1.2,.8,1.0,-.2,C.olive,0);this.block(33,-7.4,3.3,1.3,1.1,'cover');
      stack(8.6,-2.2,0,21);stack(9.4,-13.6,.5,22);stack(34.5,-39.5,1.2,23);stack(11.2,-39.6,-.3,24);stack(40.5,-21.5,Math.PI/2,25);stack(21,-3.2,.2,26);
      barrier(11.5,-8,0);barrier(31.5,-12,Math.PI/2);barrier(9.6,-31.5,0);barrier(36.5,-31,0);barrier(20,-40.5,0);barrier(28.5,-44.5,.0);
      const silo=(x,z,seed)=>{K.silo(b,x,G(x,z)-.1,z,1.7,5.2,C.rust,seed);this.round(x,z,1.95,1.95,8,0,'silo');};silo(43.2,-29.5,5);silo(43.2,-34.3,6);
      K.windtrap(b,40.5,G(40.5,-46.3),-46.3,0,7,6.2);this.block(40.5,-46.3,8.2,2.7,7,'structure');
      K.generator(b,13.2,G(13.2,-19),-19,Math.PI/2);this.block(13.2,-19,1.6,3,1.8,'cover');
      K.pipe(b,[[14,.35,-20.6],[14,.35,-23.6],[16.2,.35,-23.6]],.09,C.black,false);
      for(const [x,z,c] of [[12.6,-3.4,C.rust],[13.3,-3.0,C.dark],[30.6,-39.2,C.dark],[31.2,-39.9,C.rust],[38.6,-9.6,C.dark]])K.barrel(b,x,G(x,z),z,c);
      this.block(12.95,-3.2,1.4,.9,1,'cover');this.block(30.9,-39.5,1.3,1.3,1,'cover');
      for(const [x,z] of [[10.8,-1],[21.8,-7],[12.5,-28],[37,-38],[36.4,-16]])this.lamps.push(K.lamp(b,x,G(x,z),z,4.2,C.amber,.5));
      this.emit(b,'east');
    }

    buildNorthYard(){
      const b=new S.Batch();
      const barrier=(x,z,ry,len=3.6)=>{K.barrier(b,x,G(x,z)-.05,z,len,ry);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x,z,len*c+.9*s,len*s+.9*c,1.15,'cover');};
      const stack=(x,z,ry,seed)=>{K.stack(b,x,G(x,z),z,ry,seed);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x+.15*c,z+.1*s,3.3*c+1.25*s,3.3*s+1.25*c,1.25,'cover');};
      barrier(-11.5,-44.5,0);barrier(6.5,-44.2,0);barrier(-3,-41.4,0,2.8);barrier(-24.5,-45.5,Math.PI/2);
      stack(-20.5,-48.6,0,31);stack(17.5,-48.5,0,32);
      K.generator(b,9.6,G(9.6,-49.6),-49.6,0);this.block(9.6,-49.6,3,1.6,1.8,'cover');
      K.mast(b,-41,G(-41,-46)-.2,-46,15,7);this.block(-41,-46,1.7,1.7,6,'structure');
      K.tank(b,27,G(27,-48.8),-48.8,1,5,0,C.sandPaint);this.block(27,-48.8,6.2,2.2,2.6,'structure');
      for(const [x,z] of [[-8.8,-49.4],[2.8,-49.4],[-30,-40],[30,-41]])this.lamps.push(K.lamp(b,x,G(x,z),z,4.4,C.amber));
      this.emit(b,'north');
    }

    buildLanding(){
      const b=new S.Batch(),con=this.mats.concrete,kit=this.mats.kit,p=this.points.pad,py=p.y;
      b.tint(C.concreteDark).add(con,S.geo.cyl(9,.5,48),p.x,py-.21,p.z);
      b.tint(C.concretePale).add(con,S.geo.custom('padring',()=>{const g=new T.RingGeometry(6.6,7.0,64);g.rotateX(-Math.PI/2);return g;}),p.x,py+.05,p.z).add(con,S.geo.custom('padring2',()=>{const g=new T.RingGeometry(1.6,1.85,40);g.rotateX(-Math.PI/2);return g;}),p.x,py+.05,p.z);
      for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;b.push(p.x,py+.05,p.z,0,a,0).cbox(con,0,0,4.3,.34,.02,4.2,.005).pop();}
      this.padLights=[];
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=p.x+Math.cos(a)*8.3,z=p.z+Math.sin(a)*8.3;b.tint(C.dark).cyl(kit,x,py+.1,z,.14,.2,10);this.padLights.push(S.v(x,py+.24,z));}
      // Beacon mast and its console.
      K.mast(b,-14.4,G(-14.4,-59.4)-.2,-59.4,10.5,11);this.block(-14.4,-59.4,1.7,1.7,5,'structure');
      K.console(b,-12.6,G(-12.6,-60.4),-60.4,Math.PI/2,C.olive);this.block(-12.75,-60.4,.8,.9,1.5,'prop');
      K.cable(b,[-13.0,.4,-60.4],[-14.4,.6,-59.6],.1,.03);
      const barrier=(x,z,ry,len=3.6)=>{K.barrier(b,x,G(x,z)-.05,z,len,ry);const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));this.block(x,z,len*c+.9*s,len*s+.9*c,1.15,'cover');};
      barrier(5.2,-57.6,0);barrier(-9.4,-56.6,0,2.8);barrier(9.6,-63.4,Math.PI/2);barrier(-14.5,-66.8,Math.PI/2);barrier(-1.5,-77.5,0);
      K.stack(b,11.5,G(11.5,-71),-71,.4,41);this.block(11.6,-70.9,3.2,2.2,1.25,'cover');
      K.tank(b,-19,G(-19,-73.5),-73.5,.95,4.4,.5,C.gun);this.block(-19,-73.5,4.6,3.6,2.5,'structure');
      K.windtrap(b,15.5,G(15.5,-78.2),-78.2,.25,6,5.2);this.block(15.5,-78.2,7,3,6,'structure');
      for(const [x,z] of [[-8.6,-54.6],[2.6,-54.6]])this.lamps.push(K.lamp(b,x,G(x,z),z,4.4,C.amber));
      this.emit(b,'landing');
    }

    buildBackdrop(){
      const b=new S.Batch(),con=this.mats.concrete,kit=this.mats.kit;
      // Refinery stacks far to the north-east give the horizon a sense of scale.
      for(let i=0;i<4;i++){const x=118+i*13,z=-176+i*5,g=G(x,z);b.tint(C.concreteDark).add(con,S.geo.frustum(6,9,4.4,6.6,46+i*5),x,g-2,z).tint(C.black,M.polymer).cbox(kit,x,g+43+i*5,z,3.6,1.2,5.6,.1);}
      b.tint(C.concreteDark).add(con,S.geo.frustum(70,34,62,28,13),135,G(135,-170)-2,-196);
      // A second ziggurat on the western horizon.
      const wx=-210,wz=-150,g=G(wx,wz)-3;b.tint(C.concreteDark).add(con,S.geo.frustum(60,60,52,52,22),wx,g,wz).add(con,S.geo.frustum(40,40,34,34,16),wx,g+22,wz).add(con,S.geo.frustum(20,20,17,17,12),wx,g+38,wz);
      for(const m of b.build(this.group,{name:'backdrop',cast:false}))m.frustumCulled=false;
    }

    // Moving and state-driven parts: gate leaves, screens, alarm and beacon lamps, supply cache.
    buildDynamic(){
      const kit=this.mats.kit,con=this.mats.concrete,gp=this.points.gate,gy=G(gp.x,gp.z);
      this.gate={open:0,target:0,leaves:[],box:this.collision.add(gp.x,gy-.5,gp.z,8.2,7,.9,'gate')};
      for(const s of [-1,1]){
        const b=new S.Batch();b.tint(C.dark).cbox(kit,0,3.1,0,4.02,6.2,.5,.06);b.tint(C.gun);for(let i=0;i<5;i++)b.cbox(kit,-1.6+i*.8,3.1,.27,.2,5.9,.1,.03);
        b.tint(C.hazard).cbox(kit,-s*1.86,3.1,.27,.24,6.0,.08,.02).tint(C.black,M.polymer).cbox(kit,0,.3,.27,3.9,.12,.06,.02).cbox(kit,0,5.9,.27,3.9,.12,.06,.02);
        const g=new T.Group();g.position.set(gp.x+s*2.01,gy-.05,gp.z);for(const m of b.build(g)){this.solids.push(m);}this.group.add(g);this.gate.leaves.push({g,s,x:gp.x+s*2.01});
      }
      const screen=(key,w,h,x,y,z,ry,rx=-.32)=>{
        const c=document.createElement('canvas');c.width=256;c.height=128;const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
        const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,toneMapped:false}));m.material.color.setScalar(2.2);m.position.set(x,y,z);m.rotation.set(rx,ry,0,'YXZ');this.group.add(m);
        return {canvas:c,ctx:c.getContext('2d'),texture:t,mesh:m,key};
      };
      const tp=this.points.terminal.pos,hp=this.points.harvester.pos,bp=this.points.beacon.pos;
      this.screens={
        terminal:screen('terminal',.66,.33,tp.x+.145,G(-17,-28)+1.25,tp.z,Math.PI/2),
        harvester:screen('harvester',.66,.33,hp.x-.145,G(16.9,-25)+1.25,hp.z,-Math.PI/2),
        beacon:screen('beacon',.66,.33,bp.x+.145,G(-12.6,-60.4)+1.25,bp.z,Math.PI/2)
      };
      { const b=new S.Batch();K.console(b,16.9,G(16.9,-25),-25,-Math.PI/2,C.gun);this.emit(b,'hconsole');this.block(17.05,-25,.8,.9,1.5,'prop'); }
      // Rotating alarm lamp above the relay and the beacon strobe on the mast.
      const lampMesh=(color,x,y,z,r=.16)=>{const m=new T.Mesh(S.geo.sphere(1,12,8),new T.MeshBasicMaterial({color,toneMapped:false}));m.scale.setScalar(r);m.position.set(x,y,z);this.group.add(m);return m;};
      this.alarmLamp=lampMesh('#ff3a1e',-17.4,6.1,-13,.15);this.alarmLight=new T.PointLight('#ff4422',0,16,1.8);this.alarmLight.position.set(-16.6,5.6,-13);this.group.add(this.alarmLight);
      this.beaconLamp=lampMesh('#8fd8ff',-14.4,G(-14.4,-59.4)+12.4,-59.4,.2);this.beaconLight=new T.PointLight('#8fd8ff',0,26,1.6);this.beaconLight.position.copy(this.beaconLamp.position);this.group.add(this.beaconLight);
      this.padLampMeshes=this.padLights.map(p=>lampMesh('#ffb04a',p.x,p.y,p.z,.09));
      // Supply cache: lidded case; the lid swings when it is taken.
      const sp=this.points.supply.pos,sy=G(sp.x,sp.z);
      { const b=new S.Batch();b.tint(C.olive).cbox(kit,0,.3,0,1.5,.6,.9,.04).tint(C.dark);for(const s of [-1,1])b.cbox(kit,s*.7,.3,0,.08,.62,.94,.02);b.tint(C.brass,M.metal).cbox(kit,0,.42,.47,.2,.12,.04,.01);
        b.tint(C.gun,M.metal);for(let i=0;i<4;i++)b.cbox(kit,-.5+i*.33,.58,0,.24,.1,.6,.02);
        const g=new T.Group();g.position.set(sp.x,sy,sp.z);g.rotation.y=Math.PI/2;b.build(g).forEach(m=>this.solids.push(m));this.group.add(g);
        const lb=new S.Batch();lb.tint(C.olive).cbox(kit,0,.05,.45,1.52,.1,.92,.03).tint(C.dark).cbox(kit,0,.11,.45,1.2,.03,.6,.01);const lid=new T.Group();lid.position.set(0,.6,-.45);lb.build(lid);g.add(lid);this.supplyLid=lid;
        K.decal({m:g.matrixWorld.compose(g.position,g.quaternion,g.scale)},S.insignia.glyphs(51,3,'#e1d1aa'),0,.3,.455,0,0,1,.8);
        this.block(sp.x,sp.z,.95,1.55,.75,'prop'); }
      this.drawScreen('terminal','locked');this.drawScreen('harvester','running');this.drawScreen('beacon','locked');
    }
    // Console screens are redrawn only when their state changes.
    drawScreen(key,state,progress=0){
      const s=this.screens[key];if(!s||s.state===state+progress.toFixed(2))return;s.state=state+progress.toFixed(2);const g=s.ctx,W=256,H=128;
      const pal={locked:['#1a0f08','#c98a45'],ready:['#0b1612','#9fe0c0'],running:['#1c1206','#ffb347'],busy:['#141006','#ffd28a'],done:['#07140f','#7fdcae'],off:['#050505','#3a3a3a'],alert:['#1c0705','#ff6a4a'],count:['#06121a','#8fd8ff']}[state]||['#111','#ccc'];
      g.fillStyle=pal[0];g.fillRect(0,0,W,H);g.strokeStyle=g.fillStyle=pal[1];g.lineWidth=3;g.strokeRect(6,6,W-12,H-12);
      g.font='700 26px "PingFang TC","Microsoft JhengHei",sans-serif';g.textAlign='center';g.textBaseline='middle';
      const label={terminal:{locked:'勘測資料庫',busy:'讀取紀錄',done:'紀錄已取得'},harvester:{running:'採收作業中',busy:'停機程序',done:'採收機停機',alert:'震源接近'},beacon:{locked:'頻率未授權',ready:'接應信標待命',busy:'發送頻率',count:'接應途中',done:'撲翼機就位'}}[key][state]||'';
      g.fillText(label,W/2,44);
      if(state==='busy'){g.fillRect(28,78,(W-56)*progress,16);g.strokeRect(28,78,W-56,16);}
      else{g.lineWidth=2;g.beginPath();for(let i=0;i<=40;i++){const x=28+i*5,y=88+Math.sin(i*.9+key.length)*(state==='running'||state==='count'?12:state==='done'||state==='off'?1:5)*Math.sin(i*.27+1);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
      s.texture.needsUpdate=true;
    }

    // ---- navigation: 2 m grid, 8-connected, built from the colliders ----
    buildNav(){
      this.gate.box.off=true;const b=this.collision.bounds,step=2,x0=Math.ceil(b.minX/step)*step,z0=Math.ceil(b.minZ/step)*step,nx=Math.floor((b.maxX-x0)/step)+1,nz=Math.floor((b.maxZ-z0)/step)+1;
      const free=new Uint8Array(nx*nz),col=this.collision,clear=(x,z)=>!col.inside(x,z,.42,G(x,z)+.6)&&S.shelfMask(x,z)>.45;
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)free[j*nx+i]=clear(x0+i*step,z0+j*step)?1:0;
      const link=(i,j,di,dj)=>{const a=free[j*nx+i],ii=i+di,jj=j+dj;if(!a||ii<0||jj<0||ii>=nx||jj>=nz||!free[jj*nx+ii])return false;
        for(let t=.25;t<1;t+=.25)if(!clear(x0+(i+di*t)*step,z0+(j+dj*t)*step))return false;return true;};
      const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],links=new Uint8Array(nx*nz);
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){let m=0;for(let k=0;k<8;k++)if(link(i,j,dirs[k][0],dirs[k][1]))m|=1<<k;links[j*nx+i]=m;}
      this.nav={step,x0,z0,nx,nz,free,links,dirs};this.gate.box.off=false;
    }
    navIndex(x,z){
      const n=this.nav,i=S.clamp(Math.round((x-n.x0)/n.step),0,n.nx-1),j=S.clamp(Math.round((z-n.z0)/n.step),0,n.nz-1);
      if(n.free[j*n.nx+i])return j*n.nx+i;
      let best=-1,bd=1e9;for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=n.nx||jj>=n.nz||!n.free[jj*n.nx+ii])continue;const d=Math.hypot(x-(n.x0+ii*n.step),z-(n.z0+jj*n.step));if(d<bd){bd=d;best=jj*n.nx+ii;}}
      return best;
    }
    navPos(index){const n=this.nav,i=index%n.nx,j=(index-i)/n.nx,x=n.x0+i*n.step,z=n.z0+j*n.step;return S.v(x,G(x,z),z);}
    // A* over the grid, then string-pulled against the colliders. Returns [Vector3,...] or null.
    path(from,to){
      const n=this.nav,start=this.navIndex(from.x,from.z),goal=this.navIndex(to.x,to.z);if(start<0||goal<0)return null;
      if(start===goal)return [to.clone()];
      const size=n.nx*n.nz;if(!this._g){this._g=new Float32Array(size);this._f=new Float32Array(size);this._prev=new Int32Array(size);this._mark=new Uint32Array(size);this._gen=0;}
      const g=this._g,f=this._f,prev=this._prev,mark=this._mark,gen=++this._gen,gi=goal%n.nx,gj=(goal-gi)/n.nx;
      const h=k=>{const i=k%n.nx,j=(k-i)/n.nx,dx=Math.abs(i-gi),dz=Math.abs(j-gj);return (Math.max(dx,dz)+.414*Math.min(dx,dz));};
      const open=[start];g[start]=0;f[start]=h(start);prev[start]=-1;mark[start]=gen;let found=false,guard=0;
      while(open.length&&guard++<6000){
        let bi=0;for(let k=1;k<open.length;k++)if(f[open[k]]<f[open[bi]])bi=k;
        const cur=open[bi];open[bi]=open[open.length-1];open.pop();if(cur===goal){found=true;break;}
        const ci=cur%n.nx,cj=(cur-ci)/n.nx,mask=n.links[cur];
        for(let k=0;k<8;k++){if(!(mask&(1<<k)))continue;const nb=(cj+n.dirs[k][1])*n.nx+ci+n.dirs[k][0],cost=g[cur]+(k<4?1:1.414);
          if(mark[nb]!==gen||cost<g[nb]){const fresh=mark[nb]!==gen;mark[nb]=gen;g[nb]=cost;f[nb]=cost+h(nb);prev[nb]=cur;if(fresh||open.indexOf(nb)<0)open.push(nb);}}
      }
      if(!found)return null;
      const pts=[];for(let k=goal;k>=0;k=prev[k])pts.push(this.navPos(k));pts.reverse();pts.push(S.v(to.x,G(to.x,to.z),to.z));
      // String pulling: drop waypoints that a clear straight walk makes unnecessary.
      const out=[];let anchor=S.v(from.x,G(from.x,from.z),from.z),i=0;
      while(i<pts.length){let j=pts.length-1;while(j>i&&!this.walkable(anchor,pts[j]))j--;out.push(pts[j]);anchor=pts[j];i=j+1;}
      return out;
    }
    walkable(a,b){const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(d/.6);for(let i=1;i<=n;i++){const t=i/n,x=S.lerp(a.x,b.x,t),z=S.lerp(a.z,b.z,t);if(this.collision.inside(x,z,.4,G(x,z)+.6))return false;}return true;}

    setGate(open){this.gate.target=open?1:0;}
    update(dt,time,state={}){
      const g=this.gate;if(g.open!==g.target){g.open=S.clamp(g.open+Math.sign(g.target-g.open)*dt*.42,0,1);const e=S.smooth(0,1,g.open);for(const l of g.leaves)l.g.position.x=l.x+l.s*e*3.7;g.box.off=g.open>.6;}
      const alarm=state.alarm?1:0;this.alarmLamp.visible=!!alarm;this.alarmLight.intensity=alarm?(.5+.5*Math.sin(time*7))*60:0;if(alarm)this.alarmLamp.scale.setScalar(.13+.05*Math.sin(time*7));
      const beacon=state.beacon?1:0,pulse=Math.pow(.5+.5*Math.sin(time*3.2),8);this.beaconLamp.visible=!!beacon;this.beaconLight.intensity=beacon?pulse*160:0;if(beacon)this.beaconLamp.scale.setScalar(.14+pulse*.2);
      for(let i=0;i<this.padLampMeshes.length;i++){const m=this.padLampMeshes[i],on=beacon?(.35+.65*Math.pow(.5+.5*Math.sin(time*4-i*.52),3)):.12;m.material.color.setRGB(1.0*on*3,.62*on*3,.25*on*3);}
      if(this.supplyLid)this.supplyLid.rotation.x=S.damp(this.supplyLid.rotation.x,state.supply?-1.9:0,5,dt);
    }
  };
})(window.Spice,window.THREE);
