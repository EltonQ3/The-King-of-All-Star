'use strict';
/* Art pass: machinery articulation, ground contact, tread impressions,
 * architectural scale cues and locally generated insignia. No collision changes. */
(function(S,T){
  const P=S.World.prototype;
  P.addGroundShadow=function(x,z,w,d,opacity=.28){
    const m=new T.MeshBasicMaterial({map:S.softTexture(),color:'#2b2219',transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const mesh=S.mesh(this.scene,new T.PlaneGeometry(w,d),m,x,this.ground(x,z)+.025,z,false);mesh.rotation.x=-Math.PI/2;return mesh;
  };
  P.buildDetail=function(){
    const m=this.materials,s=this.scene,h=this.harvester;
    this.debrisClock=0;this.rotors=[];
    this.addGroundShadow(18,-25,32,24,.52);
    for(const b of this.collision.boxes){const size=b.getSize(S.v()),c=b.getCenter(S.v());if(size.x<6)this.addGroundShadow(c.x,c.z,size.x+2,size.z+2,.27);}
    // Locally drawn crawler marks: two imperfect bands rather than tiled squares.
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;const c=canvas.getContext('2d'),rnd=S.rng(881);
    for(let y=0;y<1024;y+=14){c.fillStyle=`rgba(40,28,15,${.12+rnd()*.15})`;for(const x of [85,355]){c.save();c.translate(x+(rnd()-.5)*3,y);c.rotate((rnd()-.5)*.03);c.fillRect(-38,0,76,7);c.fillRect(-42,5,9,8);c.fillRect(33,5,9,8);c.restore();}}
    const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;
    const tread=S.mesh(s,new T.PlaneGeometry(18,40,12,30),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,opacity:.7,polygonOffset:true,polygonOffsetFactor:-1}),18,0,-3,false);
    tread.rotation.x=-Math.PI/2;const tp=tread.geometry.attributes.position;for(let i=0;i<tp.count;i++)tp.setZ(i,this.ground(18+tp.getX(i),-3-tp.getY(i))+.035);tp.needsUpdate=true;
    // Harvester: service access panels, inset fasteners, wheel hubs and cooling fins.
    for(const side of [-1,1]){
      for(let k=0;k<5;k++){
        const z=-4+k*2.;S.mesh(h,S.bevelBox(.12,2.1,1.78,.04),m.steel,side*8.53,4.7,z);
        S.box(h,m.black,side*8.61,4.9,z,.025,.05,1.43,false);
        for(const y of [3.83,5.56])for(const zz of [z-.68,z+.68]){const bolt=S.cylinder(h,m.bronze,side*8.63,y,zz,.043,.035,8);bolt.rotation.z=Math.PI/2;}
      }
      for(let k=0;k<7;k++){const z=-5.5+k*1.8;const hub=S.cylinder(h,m.bronze,side*9.81,1.7,z,.26,.18,12);hub.rotation.z=Math.PI/2;const pin=S.cylinder(h,m.dark,side*9.92,1.7,z,.11,.035,6);pin.rotation.z=Math.PI/2;}
      for(let k=0;k<8;k++)S.box(h,m.steel,side*4.1,8.1,-3+k*.55,.06,1.1,.25);
      S.beam(h,m.black,[side*6,6.1,-4.8],[side*6,7.3,-4.8],.23);S.beam(h,m.black,[side*6,7.3,-4.8],[side*3.4,7.3,-4.8],.23);
    }
    // Hydraulic pistons and ladder — clear scale cues at human height.
    for(const side of [-1,1]){
      S.beam(h,m.dark,[side*5.8,4.4,5.5],[side*5.8,2,7.7],.20);S.beam(h,m.steel,[side*5.8,3.3,6.6],[side*5.8,1.4,8.1],.095);
    }
    for(let y=1;y<6.8;y+=.45)S.beam(h,m.steel,[6.9,y,5.8],[7.8,y,5.8],.035);
    for(const x of [6.9,7.8])S.beam(h,m.steel,[x,1,5.8],[x,6.8,5.8],.055);
    for(let k=0;k<3;k++){
      const rotor=new T.Group();rotor.position.set(-3+k*2.5,8.98,-1);h.add(rotor);
      const ring=S.mesh(rotor,new T.TorusGeometry(.82,.035,6,32),m.black);ring.rotation.x=Math.PI/2;
      for(let j=0;j<7;j++){const f=S.box(rotor,m.dark,0,.02,0,.17,.04,1.5);f.rotation.y=j*Math.PI/7;}
      this.rotors.push(rotor);
    }
    S.label(h,'H A R K O N N E N',0,5.56,5.61,7,.34,'#c4bca4');S.label(h,'CAUTION · INTAKE',0,2.78,8.63,4,.23,'#c6a876');
    // The control building has horizontal construction joints and dark recesses.
    for(let y=3;y<25;y+=3){
      S.box(s,m.stoneDark,-31,y,-3.96,23-y*.22,.033,.04,false);
    }
    for(let k=0;k<7;k++){
      const z=-33+k*4.8;
      S.box(s,m.stoneDark,-18.76,3.7,z,.08,.045,3.2,false);
      S.box(s,m.black,-18.70,5.2,z,.035,1.5,.19,false);
      S.box(s,m.steel,-18.61,4.2,z,.12,.12,.6);
    }
    for(const [x,z] of [[-15,-6],[30,-2]]){
      const g=new T.Group();g.position.set(x,this.ground(x,z),z);s.add(g);
      S.mesh(g,S.bevelBox(1.1,1.7,.65,.05),m.dark,0,.9,0);
      S.box(g,m.black,0,1.24,.34,.73,.4,.025,false);
      S.label(g,'09 / LOCAL',0,1.26,.365,.65,.1,'#c3b37e');
      for(let k=0;k<4;k++)S.box(g,m.steel,-.29+k*.19,.76,.35,.1,.08,.02);
      S.beam(g,m.black,[.4,.2,0],[.4,.2,-1.5],.055);
    }
    // Ribbed utility trunks and service cable clips, all on the outpost wall.
    for(const z of [-6,-11,-16,-21]){
      S.beam(s,m.dark,[-17.2,.7,z],[-17.2,2.3,z],.12);
      S.beam(s,m.dark,[-17.2,2.3,z],[-19,2.3,z],.12);
      for(const y of [1.,1.65,2.2]){const clamp=S.cylinder(s,m.bronze,-17.2,y,z,.145,.08,12);}
    }
    // A torn windbreak uses a real wave-deformed cloth, not a floating UI card.
    const awning=new T.PlaneGeometry(6,4,24,16),am=S.weatherMaterial(S.material('#514c3d',.96),'cloth',2);am.side=T.DoubleSide;
    const canopy=S.mesh(s,awning,am,28,4.4,17);canopy.rotation.x=-Math.PI/2;canopy.rotation.z=.08;this.canopy=canopy;
    for(const x of [25,31])S.beam(s,m.dark,[x,.1,19],[x,4.7,19],.05);
    S.beam(s,m.black,[25,4.7,19],[24,.08,22],.012);S.beam(s,m.black,[31,4.7,19],[32,.08,22],.012);
    // Sparse exposed foundation stones disappear beneath windblown sand.
    const rubble=new T.InstancedMesh(S.bevelBox(1,.45,.7,.045),m.stoneDark,100),o=new T.Object3D();
    for(let i=0;i<100;i++){const x=S.range(-15,33),z=S.range(-48,12);o.position.set(x,this.ground(x,z)-.08,z);o.rotation.set(0,S.range(0,6.28),S.range(-.25,.25));o.scale.setScalar(S.range(.17,.75));o.updateMatrix();rubble.setMatrixAt(i,o.matrix);}rubble.castShadow=rubble.receiveShadow=true;s.add(rubble);
  };
  P.updateDetail=function(dt,time){
    for(const r of this.rotors||[])r.rotation.y=time*.7;
    if(this.canopy){const p=this.canopy.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(time*1.8+x*1.6+y*.4)*.045+.18*Math.cos(x*.48));}p.needsUpdate=true;}
  };
})(window.Spice,window.THREE);
