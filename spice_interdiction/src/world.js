'use strict';
(function(S,T){
  const dunes=[[-105,-15,20,60,90],[105,35,25,70,65],[-145,-160,55,100,80],[90,-185,44,85,120],[235,-260,85,130,130],[-300,-300,92,160,130],[0,-355,88,170,110],[-90,160,24,100,75],[150,180,48,100,90]];
  S.groundHeight=function(x,z){let h=.15*Math.sin(x*.16)+.12*Math.sin(z*.18+x*.08);for(const [cx,cz,amp,wx,wz] of dunes){const dx=(x-cx)/wx,dz=(z-cz)/wz;h+=amp*Math.exp(-(dx*dx+dz*dz)*2.4);}const far=S.clamp((Math.hypot(x,z+10)-90)/110,0,1);
    const wind=z*.013+x*.004,crest=Math.sin(wind+Math.sin(x*.006)*1.4)*.5+.5;
    h+=far*(Math.pow(crest,2.1)*7+Math.sin(x*.012+z*.007)*2.2);return h-.3;};
  S.World=class{
    constructor(scene){
      this.scene=scene;this.collision=new S.Collision();this.rayTargets=[];this.dynamic=[];this.spawn=S.v(0,0,53);this.exit=S.v(-3,0,-57);this.exit.y=S.groundHeight(this.exit.x,this.exit.z);
      this.materials={sand:S.sandMaterial(),stone:S.material('#b4a18a',.9),stoneDark:S.material('#8c7d67',.93),dark:S.material('#353d3c',.6,.58),steel:S.material('#72796f',.49,.62),bronze:S.material('#8b7046',.6,.45),cloth:S.material('#494638'),light:S.material('#dbb36a'),black:S.material('#131c1c',.78,.15)};
      for(const key of ['stone','stoneDark'])S.weatherMaterial(this.materials[key],'stone');for(const key of ['dark','steel','bronze'])S.weatherMaterial(this.materials[key],'metal');
      
      this.rockMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.97});
      S.weatherMaterial(this.rockMat,'rock');this.buildSky();this.buildTerrain();this.buildRocks();this.buildOutpost();this.buildHarvester();this.buildProps();this.buildExit();this.buildDust();this.buildSandDrift();scene.updateMatrixWorld(true);
    }
    block(mesh,x,z,w,h,d,y=0){this.collision.add(x,y,z,w,h,d);this.rayTargets.push(mesh);return mesh;}
    ground(x,z){return S.groundHeight(x,z);}
    buildSky(){
      const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:S.v(-.42,.30,-.855).normalize()}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 vDir;uniform vec3 sun;void main(){vec3 d=normalize(vDir);float h=max(0.,d.y);vec3 col=mix(vec3(.69,.43,.24),vec3(.105,.17,.23),pow(h,.45));float s=max(dot(d,sun),0.);col+=vec3(.48,.27,.10)*pow(s,9.);col+=vec3(1.,.68,.28)*pow(s,100.);float disk=smoothstep(.99948,.99958,s);col=mix(col,vec3(3.5,2.9,1.9),disk);gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
      this.sky=S.mesh(this.scene,new T.SphereGeometry(650,32,16),skyMat,0,0,0,false);this.sky.frustumCulled=false;
      this.scene.fog=new T.FogExp2('#c2a27d',.00165);
      const hemi=new T.HemisphereLight('#acbec7','#9e7850',.94);this.scene.add(hemi,new T.AmbientLight('#bda388',.065));
      const sun=new T.DirectionalLight('#ffe1af',3.75);sun.position.set(-86,62,-175);sun.target.position.set(0,0,-10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-72,right:72,top:78,bottom:-78,near:1,far:340});sun.shadow.normalBias=.035;sun.shadow.bias=-.000055;sun.shadow.radius=2.4;this.scene.add(sun,sun.target);this.sun=sun;
    }
    buildTerrain(){
      // Nonlinear grid: fine mesh where the player walks, coarser at the horizon.
      const g=new T.PlaneGeometry(2,2,320,320);g.rotateX(-Math.PI/2);const p=g.attributes.position;
      for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getZ(i);const x=u*55+u*u*u*470,z=v*55+v*v*v*470;p.setXYZ(i,x,this.ground(x,z),z);}g.computeVertexNormals();
      const mat=this.materials.sand;
      const mesh=S.mesh(this.scene,g,mat,0,0,0,false);mesh.receiveShadow=true;this.rayTargets.push(mesh);
    }
    rock(x,z,sx,h,sz,seed,collide=true){
      // Sink the base below the lowest sampled point under the footprint.
      // Centre-height placement alone makes remote rocks float on steep dunes.
      let y=this.ground(x,z)-.8;for(let i=0;i<16;i++){const a=i/16*Math.PI*2;y=Math.min(y,this.ground(x+Math.cos(a)*sx*1.45,z+Math.sin(a)*sz*1.45)-.8);}const m=S.mesh(this.scene,S.rockGeometry(seed),this.rockMat,x,y,z);m.scale.set(sx,h,sz);m.rotation.y=seed*.67;
      if(collide)this.block(m,x,z,sx*1.32,h,sz*1.32,y);return m;
    }
    buildRocks(){
      const spec=[[-13,57,10,25,13],[-12,39,8,20,11],[-17,23,10,22,9],[13,55,8,22,11],[12,38,7,17,12],[18,23,10,18,10],[-33,51,16,34,20],[32,55,15,31,22],[-43,14,8,16,8],[45,9,12,23,12],[-49,-52,16,26,14],[45,-53,13,20,16],[-65,-140,18,24,16],[85,-150,21,28,18]];
      spec.forEach((s,i)=>this.rock(...s,i+4));
      for(let i=0;i<18;i++){let a=i/18*Math.PI*2,r=145+S.range(-15,35);if(Math.sin(a)<-.2)continue;this.rock(Math.cos(a)*r,Math.sin(a)*r-45,S.range(5,14),S.range(10,32),S.range(6,14),80+i,false);}
      // Ground debris is instanced, not hundreds of independent draw calls.
      const g=new T.IcosahedronGeometry(1,0),m=new T.InstancedMesh(g,S.material('#887250'),260),o=new T.Object3D();
      for(let i=0;i<260;i++){const x=S.range(-60,60),z=S.range(-75,70),size=S.range(.06,.35);o.position.set(x,this.ground(x,z)+size*.2,z);o.scale.set(size*1.6,size*.65,size);o.rotation.set(S.range(0,1),S.range(0,6),0);o.updateMatrix();m.setMatrixAt(i,o.matrix);}m.receiveShadow=true;this.scene.add(m);
    }
    buildOutpost(){
      const s=this.scene,m=this.materials;
      // Tapered, monolithic sand-resistant mass; the repeated buttresses frame the route.
      const tower=new T.Group();tower.position.set(-31,0,-20);s.add(tower);
      const bodyGeo=new T.BoxGeometry(24,29,32);const p=bodyGeo.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>0)p.setX(i,p.getX(i)*.68);bodyGeo.computeVertexNormals();
      const main=S.mesh(tower,bodyGeo,m.stone,0,14,0);this.block(main,-31,-20,20.5,29,32);
      S.box(tower,m.stoneDark,0,.6,0,26,1.2,35);
      for(let i=0;i<6;i++){
        const zz=-13+i*5.1;const butt=S.box(tower,m.stone,-12.1,8.5,zz,3,17,1.6);butt.rotation.z=-.1;
        const east=S.box(tower,m.stone,-(-12.1),7.6,zz,3,15.2,1.6);east.rotation.z=.1;
      }
      const door=S.box(tower,m.black,1,5.8,16.03,7,11.6,.12);S.box(tower,m.stoneDark,1,11.7,17,10,1,2);
      for(let i=0;i<7;i++)S.box(tower,m.dark,-2+i,5.6,16.2,.12,10.7,.22);
      const glow=new T.MeshBasicMaterial({color:'#d6a35e'});S.box(tower,glow,1,11.15,16.26,6.7,.06,.04,false);
      S.label(tower,'09',-6.2,7.3,16.1,3.3,1.4,'#544535');S.label(tower,'HARVEST CONTROL',1,13.6,16.11,11,.8,'#5f4d36');
      for(let i=0;i<9;i++)S.box(tower,m.black,8.2,19+i*.6,10,.03,.17,4,false);
      // Smaller sloped utility bunker, with a deep recessed doorway.
      const bunker=new T.Group();bunker.position.set(32,0,7);s.add(bunker);
      const shell=S.mesh(bunker,S.bevelBox(10,6,12,.4),m.stoneDark,0,3,0);this.block(shell,32,7,10,6,12);
      S.box(bunker,m.black,0,2.1,6.01,3.1,4.2,.1);S.box(bunker,m.stone,0,4.5,6.6,4.5,.7,1.6);
      S.label(bunker,'H / 09',0,5.4,6.1,4,.6);
      // Three tall exhaust stacks in the distance provide readable scale.
      for(let i=0;i<3;i++){const x=1+i*8,z=-86;S.box(s,m.stoneDark,x,15,z,3.5,30,7);S.box(s,m.black,x,28,z+3.55,2.4,.6,.12);}
      const pipes=new T.Group();s.add(pipes);for(let i=0;i<4;i++){const x=-15+i*.8;S.beam(pipes,m.steel,[x,1.1,-36],[x,1.1,-47],.22);S.beam(pipes,m.steel,[x,1.1,-47],[x,4,-49],.22);}
    }
    buildHarvester(){
      const m=this.materials,g=new T.Group();g.position.set(18,0,-25);g.rotation.y=-.12;this.scene.add(g);this.harvester=g;
      const hull=S.mesh(g,S.bevelBox(17,4.6,11,.48),m.dark,0,4.3,0);this.block(hull,18,-25,18.5,7.2,12);
      const upper=S.mesh(g,S.bevelBox(10,2.8,7,.2),m.steel,-1,7.5,-1);
      S.box(g,m.black,0,7.9,2.55,6.7,.66,.09);S.box(g,m.bronze,0,8.28,2.62,7.2,.14,.2);
      // Crawler assemblies and individual tread ribs.
      for(const side of [-1,1]){
        const track=S.mesh(g,S.bevelBox(3.3,2.2,14,.65),m.black,side*8,1.7,0);
        const ribs=new T.InstancedMesh(new T.BoxGeometry(3.35,.2,.54),m.steel,44),o=new T.Object3D();let n=0;
        for(let i=0;i<22;i++)for(const y of [.66,2.65]){o.position.set(side*8,y,-6.7+i*.63);o.updateMatrix();ribs.setMatrixAt(n++,o.matrix);}ribs.castShadow=true;g.add(ribs);
        for(let i=0;i<7;i++){const w=S.cylinder(g,m.steel,side*9.7,1.7,-5.5+i*1.8,.75,.14,14);w.rotation.z=Math.PI/2;}
        for(let i=0;i<6;i++)S.box(g,m.bronze,side*8.53,4.5,-4+i*1.7,.08,2.2,.13);
      }
      for(let i=0;i<14;i++)S.box(g,m.black,-6.8+i*.48,6.65,-.6,.22,.08,5.8,false);
      for(let i=0;i<3;i++){S.cylinder(g,m.steel,2+i*1.4,10.1,-2.2,.46,3.2);S.cylinder(g,m.black,2+i*1.4,11.78,-2.2,.57,.3);}
      const intake=S.mesh(g,S.bevelBox(12,1.6,3,.2),m.steel,0,1.9,7.1);
      for(let i=0;i<16;i++)S.box(g,m.black,-5.8+i*.76,1.9,8.65,.3,1.2,.18);
      S.beam(g,m.bronze,[-5,4,4],[-5,2.2,7],.17);S.beam(g,m.bronze,[5,4,4],[5,2.2,7],.17);
      S.box(g,m.steel,-1,6.8,4.9,10,.18,1.7);
      for(let i=0;i<6;i++)S.beam(g,m.bronze,[-5+i*1.7,6.8,5.6],[-5+i*1.7,7.9,5.6],.035);S.beam(g,m.bronze,[-5,7.9,5.6],[3.5,7.9,5.6],.035);
      for(const x of [-5.8,-3.5,3.5,5.8]){S.box(g,m.steel,x,4.3,5.65,.11,3.2,.1);for(const y of [3,5.6]){const rivet=S.cylinder(g,m.bronze,x,y,5.72,.085,.1,6);rivet.rotation.x=Math.PI/2;}}
      S.box(g,m.bronze,0,2.65,5.7,12,.13,.1);S.label(g,'SPICE / 09',0,4.6,5.59,6,1.1,'#b6a176');
      const lamp=new T.MeshBasicMaterial({color:'#ffce80'});for(const x of [-6,6]){S.box(g,m.black,x,3.5,5.7,1.1,.65,.25);S.box(g,lamp,x,3.5,5.86,.8,.22,.03,false);}
      S.beam(g,m.dark,[-3,9,-2],[-3,13.2,-2],.045);
      // A cloth pennant with a simple wave, created locally as geometry.
      const flagG=new T.PlaneGeometry(2.7,1.1,12,4),flag=S.mesh(g,flagG,m.cloth,-1.7,12.3,-2,false);flag.material=flag.material.clone();flag.material.side=T.DoubleSide;this.flag=flag;this.flag.material.color.set('#777064');
    }
    buildProps(){
      const m=this.materials,s=this.scene;
      const covers=[[-8,9,4,1.25,2.2],[8,2,3.5,1.3,2.3],[-6,-12,4.6,1.25,2.2],[4,-30,3.8,1.5,2.5],[-8,-39,5,1.4,2.2],[24,-7,3,1.2,2]];
      covers.forEach(([x,z,w,h,d])=>{const y=this.ground(x,z);const b=S.mesh(s,S.bevelBox(w,h,d,.13),m.stoneDark,x,y+h/2,z);this.block(b,x,z,w,h,d,y);S.box(s,m.dark,x,y+h+.04,z,w*.9,.07,d*.78);for(const xx of [-w*.32,w*.32])S.box(s,m.bronze,x+xx,y+h/2,z+d/2+.01,.09,h*.86,.06);});
      for(const [x,z] of [[-13,0],[10,-7],[-11,-30]]){
        const y=this.ground(x,z),tank=S.cylinder(s,m.dark,x,y+1.4,z,1,2.8,16);this.block(tank,x,z,2,2.8,2,y);for(const yy of [.4,2.3])S.cylinder(s,m.bronze,x,y+yy,z,1.03,.12,16);S.cylinder(s,m.steel,x,y+2.9,z,.27,.25);
      }
      // Broken pavers and wind-marked route lights.
      for(let i=0;i<14;i++){let z=18-i*5.4,x=-.5+Math.sin(i*.61)*1.3;const slab=S.box(s,m.stoneDark,x,this.ground(x,z)-.06,z,2.8,.14,1.7,false);slab.rotation.y=Math.sin(i)*.08;}
      for(let i=0;i<9;i++){let z=14-i*8.5,x=-12.8;S.box(s,m.dark,x,this.ground(x,z)+.45,z,.15,.9,.15);S.box(s,new T.MeshBasicMaterial({color:'#cf9e57'}),x,this.ground(x,z)+.89,z,.18,.035,.18,false);}
    }
    buildExit(){
      const g=new T.Group();g.position.copy(this.exit);this.scene.add(g);const m=this.materials;
      for(const x of [-4,4])S.box(g,m.stone,x,5,0,1.7,10,2.4);S.box(g,m.stone,-0,10,0,10,1.2,3);S.label(g,'EXTRACTION',0,8.7,1.25,6,.6);
      this.beaconMat=new T.MeshBasicMaterial({color:'#bf7635',transparent:true,opacity:.75,depthWrite:false});const ring=S.mesh(g,new T.TorusGeometry(2.1,.035,6,48),this.beaconMat,0,.12,0,false);ring.rotation.x=-Math.PI/2;
      this.beacon=S.mesh(g,new T.CylinderGeometry(.1,.1,7,8),this.beaconMat,0,3.5,0,false);this.exitRing=ring;
      const thopter=new T.Group();thopter.position.set(3,7,-22);g.add(thopter);S.mesh(thopter,new T.SphereGeometry(1,12,8),m.dark).scale.set(1.4,1.25,4.6);
      for(const side of [-1,1])for(const z of [-1.8,1.5]){S.beam(thopter,m.steel,[side,0,z],[side*11.5,.15,z-1.9],.09);const wing=S.box(thopter,m.black,side*6,.08,z-1,10.5,.06,1.1);wing.rotation.y=side*.18;}
      S.mesh(thopter,new T.SphereGeometry(1,12,8),m.black,0,.2,3.5).scale.set(.9,.8,1.3);this.thopter=thopter;
    }
    buildDust(){
      const positions=[],sizes=450;for(let i=0;i<sizes;i++)positions.push(S.range(-100,100),S.range(.4,20),S.range(-100,80));
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      const mat=new T.PointsMaterial({color:'#e7c893',size:.085,transparent:true,opacity:.38,depthWrite:false});this.dust=new T.Points(g,mat);this.scene.add(this.dust);
    }
    buildSandDrift(){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
      const grad=c.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,0.8)');grad.addColorStop(.35,'rgba(255,255,255,0.28)');grad.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=grad;c.fillRect(0,0,128,128);
      const tex=new T.CanvasTexture(canvas);this.drifts=[];
      for(let i=0;i<18;i++){const mat=new T.SpriteMaterial({map:tex,color:'#d1b482',transparent:true,opacity:.12,depthWrite:false});const sp=new T.Sprite(mat);const x=9+S.rand()*25,z=-32+S.rand()*23;sp.position.set(x,this.ground(x,z)+1,z);sp.scale.set(11,3.4,1);sp.userData={x,z,phase:S.rand()*7};this.scene.add(sp);this.drifts.push(sp);}
    }
    update(dt,time,unlocked){
      this.dust.position.x=(time*.5)%15;for(const sp of this.drifts){sp.position.x=sp.userData.x+Math.sin(time*.15+sp.userData.phase)*4;sp.material.opacity=.07+(.5+.5*Math.sin(time*.3+sp.userData.phase))*.07;}
      if(this.flag){const p=this.flag.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(time*2.1+p.getX(i)*2.7)*.12*(p.getX(i)+1.35)/2.7);p.needsUpdate=true;}
      this.beaconMat.color.set(unlocked?'#9ab7ac':'#bf7635');this.beaconMat.opacity=.55+Math.sin(time*2.2)*.2;
      this.thopter.position.y=7+Math.sin(time*.7)*.2;if(this.updateDetail)this.updateDetail(dt,time);
    }
  };
})(window.Spice,window.THREE);
