'use strict';
/* Heightfield: a wind-scoured rock shelf (safe from the worm) set in a field of
 * transverse dunes with sharp crests and steep slip faces. Also the stratified
 * sandstone massifs and the distant Shield Wall. */
(function(S,T){
  // Signed distance to the union of the walkable shelf rectangles (negative inside).
  const rects=[[-49,-52,50,24,14],[-11,20,11,64,6],[-26,-82,22,-50,12]];
  function shelfDistance(x,z){
    let best=1e9;
    for(const [x0,z0,x1,z1,r] of rects){const cx=(x0+x1)/2,cz=(z0+z1)/2,hx=(x1-x0)/2-r,hz=(z1-z0)/2-r,dx=Math.abs(x-cx)-hx,dz=Math.abs(z-cz)-hz;
      const d=Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0)-r;if(d<best)best=d;}
    return best;
  }
  S.shelfMask=(x,z)=>1-S.smooth(-2,26,shelfDistance(x,z));
  function dunes(x,z){
    const w=x*.93+z*.36,c=-x*.36+z*.93;
    let h=0;
    // Primary dune train: 150 m apart, long gentle windward slope, abrupt lee.
    const warp=(S.fbm2(c*.0055+3.1,w*.0031+.7,3)-.5)*150,ph=(w+warp)/150,f=ph-Math.floor(ph),row=Math.floor(ph);
    const prof=f<.74?Math.pow(f/.74,1.4):Math.pow(1-(f-.74)/.26,1.7);
    h+=prof*(15+17*S.noise2(c*.0047+row*5.3,row*1.7));
    // Secondary dunes riding the big ones.
    const warp2=(S.noise2(c*.021+9.2,w*.013)-.5)*30,p2=(w+warp2)/41,f2=p2-Math.floor(p2);
    h+=(f2<.7?Math.pow(f2/.7,1.3):Math.pow(1-(f2-.7)/.3,1.6))*(2.6+2.2*S.noise2(c*.02,Math.floor(p2)*2.3));
    // Broad swells so the horizon is never a flat line.
    h+=(S.fbm2(x*.0016+11,z*.0016+4,3)-.42)*70;
    return h;
  }
  S.groundHeight=function(x,z){
    const m=S.shelfMask(x,z);
    // Shelf: almost level, a few centimetres of relief, rising slightly northward to the pad.
    const shelf=.12*Math.sin(x*.13+1.1)*Math.sin(z*.11)+.08*Math.sin(z*.31+x*.07)+(S.noise2(x*.05+40,z*.05+12)-.5)*.5;
    if(m>=.999)return shelf;
    const far=S.smooth(40,260,Math.hypot(x,z+12));
    const d=dunes(x,z)*(.35+.65*far)+3.2*(1-m);
    return S.lerp(d,shelf,m*m*(3-2*m));
  };
  // March a ray against the heightfield; returns distance or Infinity.
  S.rayGround=function(o,d,max=200){
    if(d.y>=0&&o.y>S.groundHeight(o.x,o.z)+.01&&d.y>.25)return Infinity;
    let t=0,prev=0;const step=.7;
    while(t<max){const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;
      if(y<S.groundHeight(x,z)){let a=prev,b=t;for(let i=0;i<8;i++){const m=(a+b)/2;if(o.y+d.y*m<S.groundHeight(o.x+d.x*m,o.z+d.z*m))b=m;else a=m;}return b;}
      prev=t;t+=step+t*.02;}
    return Infinity;
  };

  // Wadi-Rum style massif: lobed plan, fluted walls, stepped strata, domed crown.
  S.rockGeometry=function(seed=1,radial=44,levels=30){
    const rnd=S.rng(seed*7919+11),pos=[],col=[],ix=[];
    const lobes=[];for(let k=1;k<=5;k++)lobes.push([rnd()*6.28,(.3/k)*(.4+rnd()*.8)]);
    const fluteN=9+Math.floor(rnd()*9),flutePh=rnd()*6.28,lean=[(rnd()-.5)*.22,(rnd()-.5)*.22];
    const ledges=[];let yy=0;while(yy<1){yy+=.06+rnd()*.14;ledges.push([yy,(rnd()-.42)*.16]);}
    const A=new T.Color('#7b5d42'),B=new T.Color('#dcbb8c'),C=new T.Color('#b98f63'),tmp=new T.Color();
    for(let j=0;j<=levels;j++){
      // Near-vertical walls, a shoulder, then a low domed crown.
      const t=j/levels,crown=t<.8?1-.07*t:(1-.07*t)*(1-.62*Math.pow((t-.8)/.2,2.2));
      let step=0;for(const [ly,amt] of ledges)if(t>ly)step+=amt;step=S.clamp(step,-.2,.14);
      for(let i=0;i<=radial;i++){
        const a=(i%radial)/radial*Math.PI*2;let r=1;for(let k=0;k<lobes.length;k++)r+=Math.sin(a*(k+1)+lobes[k][0])*lobes[k][1];
        const flute=Math.pow(Math.abs(Math.sin(a*fluteN*.5+flutePh+Math.sin(t*4+seed)*.5)),.5);
        const rough=(S.noise2(a*3.1+seed*3.7,t*8+seed)-.5)*.2+(S.noise2(a*10+seed,t*30)-.5)*.06;
        r=Math.max(.25,r*(1-.15*(1-flute)*(1-t*.5))+rough+step*(1-t*.4))*crown;
        const foot=1+.3*Math.pow(1-Math.min(1,t*6),2);
        pos.push(Math.cos(a)*r*foot+lean[0]*t,t*(t>.8?1-.25*Math.pow((t-.8)/.2,2):1),Math.sin(a)*r*foot+lean[1]*t);
        const band=.5+.5*Math.sin(t*41+seed)+.3*Math.sin(t*97+seed*2.);
        tmp.copy(A).lerp(B,S.clamp(.3+t*.34+band*.22+flute*.16,0,1)).lerp(C,S.noise2(a*2+seed,t*4)*.45).multiplyScalar(.78+.22*flute);
        col.push(tmp.r,tmp.g,tmp.b);
        if(j<levels&&i<radial){const p=j*(radial+1)+i,q=p+radial+1;ix.push(p,q,p+1,q,q+1,p+1);}
      }
    }
    // Close the crown.
    const top=levels*(radial+1),centre=pos.length/3;pos.push(lean[0],.78,lean[1]);col.push(B.r*.95,B.g*.95,B.b*.95);
    for(let i=0;i<radial;i++)ix.push(top+i,centre,top+i+1);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();
    // The seam column is duplicated; copy normals across so shading is continuous.
    const n=g.attributes.normal;for(let j=0;j<=levels;j++){const a=j*(radial+1),b=a+radial,x=n.getX(a)+n.getX(b),y=n.getY(a)+n.getY(b),z=n.getZ(a)+n.getZ(b),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(b,x/l,y/l,z/l);}
    return g;
  };

  S.Terrain=class{
    constructor(scene,mats){
      this.scene=scene;this.mats=mats;this.tracks=[];
    }
    // Vehicle routes darken and flatten the sand: list of [[x,z],[x,z],width].
    addTrack(a,b,w=2.2){this.tracks.push([a[0],a[1],b[0],b[1],w]);}
    trackMask(x,z){let m=0;for(const [ax,az,bx,bz,w] of this.tracks){const dx=bx-ax,dz=bz-az,t=S.clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-ax-dx*t,z-az-dz*t);m=Math.max(m,1-S.smooth(w*.5,w,d));}return m;}
    build(){
      const N=340,g=new T.PlaneGeometry(2,2,N,N);g.rotateX(-Math.PI/2);const p=g.attributes.position,mask=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i++){
        const u=p.getX(i),v=p.getZ(i),x=u*62+u*u*u*1500,z=v*62+v*v*v*1500-10;
        p.setXYZ(i,x,S.groundHeight(x,z),z);
        const m=S.shelfMask(x,z);mask[i*3]=S.smooth(.5,.97,m);
        const tr=this.trackMask(x,z);mask[i*3+1]=tr*(.55+.45*S.noise2(x*1.7,z*1.7));
      }
      g.setAttribute('aMask',new T.BufferAttribute(mask,3));g.computeVertexNormals();g.computeBoundingSphere();
      const mesh=this.mesh=new T.Mesh(g,this.mats.sand);mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;this.scene.add(mesh);
      this.buildShieldWall();return mesh;
    }
    // Layered cliff silhouettes on the horizon; haze separates the ranges.
    buildShieldWall(){
      const layers=[[820,150,-2.5,-.25,90,11,1.0],[1250,250,-2.9,.5,120,23,.85],[1050,120,.9,2.2,70,37,.9]];
      for(const [dist,height,a0,a1,seg,seed,shade] of layers){
        const pos=[],col=[],ix=[],rows=7,c=new T.Color('#9a7755').multiplyScalar(shade);
        for(let i=0;i<=seg;i++){
          const t=i/seg,a=S.lerp(a0,a1,t),n=S.fbm2(t*9+seed,seed*.37,4),mesa=S.smooth(.3,.5,S.noise2(t*5+seed*2,1.3));
          const top=height*(.35+.65*mesa*(.7+.3*n)+.15*n)*S.smooth(0,.08,t)*S.smooth(0,.08,1-t)+6;
          const cx=Math.sin(a),cz=-Math.cos(a),base=S.groundHeight(cx*dist,cz*dist-10)-20;
          for(let j=0;j<=rows;j++){
            const v=j/rows,out=dist-(1-v)*height*.5-(v>.86?(v-.86)*height*1.6:0)+Math.sin(v*23+seed+t*40)*4+S.noise2(t*60+seed,v*5)*10;
            pos.push(cx*out,base+top*Math.min(1,v*1.08)+(v>.93?-top*.02:0),cz*out-10);
            const k=.72+.28*Math.sin(v*31+seed)+.1*S.noise2(t*30,v*9);col.push(c.r*k,c.g*k,c.b*k);
            if(i<seg&&j<rows){const p0=i*(rows+1)+j,p1=p0+rows+1;ix.push(p0,p0+1,p1,p1,p0+1,p1+1);}
          }
        }
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();
        const m=new T.Mesh(g,this.mats.farRock);m.frustumCulled=false;this.scene.add(m);
      }
    }
  };
})(window.Spice,window.THREE);
