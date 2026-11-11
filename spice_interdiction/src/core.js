'use strict';
/* Shared maths, deterministic noise, the merged-geometry builder and collision.
 * Everything the game shows is generated here or in the modules that follow. */
window.Spice={VERSION:'0.3.0'};
(function(S,T){
  S.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  S.lerp=(a,b,t)=>a+(b-a)*t;
  S.damp=(a,b,k,dt)=>S.lerp(a,b,1-Math.exp(-k*dt));
  S.smooth=(a,b,x)=>{x=S.clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);};
  S.angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  S.rng=function(seed=93017){return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
  S.rand=S.rng();
  S.range=(a,b)=>a+(b-a)*S.rand();
  S.v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  S.$=id=>document.getElementById(id);

  // ---- value noise (optionally periodic so generated textures tile) ----
  const hash=(x,y)=>{let a=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967295;};
  S.hash2=hash;
  S.noise2=function(x,y,period=0){
    const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);
    const w=period?(n=>((n%period)+period)%period):(n=>n);
    return S.lerp(S.lerp(hash(w(a),w(b)),hash(w(a+1),w(b)),u),S.lerp(hash(w(a),w(b+1)),hash(w(a+1),w(b+1)),u),v);
  };
  S.fbm2=function(x,y,oct=4,period=0){let s=0,a=.5,n=0;for(let i=0;i<oct;i++){s+=S.noise2(x,y,period)*a;n+=a;x=x*2+17.3;y=y*2+9.1;a*=.5;if(period)period*=2;}return s/n;};

  // ---- geometry library: every primitive is non-indexed with position + normal ----
  const cache=new Map();
  const memo=(key,make)=>{let g=cache.get(key);if(!g){g=make();if(g.index)g=g.toNonIndexed();g.deleteAttribute('uv');cache.set(key,g);}return g;};
  S.geo={
    box:()=>memo('box',()=>new T.BoxGeometry(1,1,1)),
    // Box with flat 45-degree chamfers: 26 faces that catch a highlight on every edge.
    chamfer(w,h,d,c=.03){
      c=Math.min(c,w*.45,h*.45,d*.45);
      return memo(`ch${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${c.toFixed(3)}`,()=>{
        const x=w/2,y=h/2,z=d/2,pos=[],nor=[];
        const quad=(a,b,cc,dd)=>{const n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(cc,a)).normalize();for(const p of [a,b,cc,a,cc,dd]){pos.push(p.x,p.y,p.z);nor.push(n.x,n.y,n.z);}};
        const tri=(a,b,cc)=>{const n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(cc,a)).normalize();for(const p of [a,b,cc]){pos.push(p.x,p.y,p.z);nor.push(n.x,n.y,n.z);}};
        const V=(a,b,cc)=>new T.Vector3(a,b,cc);
        for(const s of [-1,1]){
          // main faces
          const fx=[V(s*x,-y+c,-z+c),V(s*x,y-c,-z+c),V(s*x,y-c,z-c),V(s*x,-y+c,z-c)];if(s>0)quad(fx[0],fx[1],fx[2],fx[3]);else quad(fx[3],fx[2],fx[1],fx[0]);
          const fy=[V(-x+c,s*y,-z+c),V(-x+c,s*y,z-c),V(x-c,s*y,z-c),V(x-c,s*y,-z+c)];if(s>0)quad(fy[0],fy[1],fy[2],fy[3]);else quad(fy[3],fy[2],fy[1],fy[0]);
          const fz=[V(-x+c,-y+c,s*z),V(x-c,-y+c,s*z),V(x-c,y-c,s*z),V(-x+c,y-c,s*z)];if(s>0)quad(fz[0],fz[1],fz[2],fz[3]);else quad(fz[3],fz[2],fz[1],fz[0]);
        }
        for(const a of [-1,1])for(const b of [-1,1]){
          // edge chamfers along z, x and y
          let p=[V(a*x,b*(y-c),-z+c),V(a*(x-c),b*y,-z+c),V(a*(x-c),b*y,z-c),V(a*x,b*(y-c),z-c)];if(a*b>0)quad(p[0],p[1],p[2],p[3]);else quad(p[3],p[2],p[1],p[0]);
          p=[V(-x+c,a*y,b*(z-c)),V(-x+c,a*(y-c),b*z),V(x-c,a*(y-c),b*z),V(x-c,a*y,b*(z-c))];if(a*b>0)quad(p[0],p[1],p[2],p[3]);else quad(p[3],p[2],p[1],p[0]);
          p=[V(a*(x-c),-y+c,b*z),V(a*x,-y+c,b*(z-c)),V(a*x,y-c,b*(z-c)),V(a*(x-c),y-c,b*z)];if(a*b>0)quad(p[0],p[1],p[2],p[3]);else quad(p[3],p[2],p[1],p[0]);
          for(const cz of [-1,1]){const t=[V(a*x,b*(y-c),cz*(z-c)),V(a*(x-c),b*y,cz*(z-c)),V(a*(x-c),b*(y-c),cz*z)];if(a*b*cz>0)tri(t[0],t[1],t[2]);else tri(t[2],t[1],t[0]);}
        }
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));return g;
      });
    },
    cyl:(r=1,h=1,n=12,r2=r,open=false)=>memo(`cy${r},${h},${n},${r2},${open}`,()=>new T.CylinderGeometry(r2,r,h,n,1,open)),
    sphere:(r=1,w=14,h=10)=>memo(`sp${r},${w},${h}`,()=>new T.SphereGeometry(r,w,h)),
    capsule:(r=.1,len=.3,n=10)=>memo(`ca${r},${len},${n}`,()=>new T.CapsuleGeometry(r,len,4,n)),
    torus:(r=1,t=.1,a=8,b=24,arc=Math.PI*2)=>memo(`to${r},${t},${a},${b},${arc}`,()=>new T.TorusGeometry(r,t,a,b,arc)),
    cone:(r=1,h=1,n=12)=>memo(`co${r},${h},${n}`,()=>new T.ConeGeometry(r,h,n)),
    // Profile [[radius,y],...] revolved around Y.
    lathe:(pts,n=20,key=null)=>memo(key||('la'+pts.join(';')+n),()=>new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),n)),
    // Convex or concave outline [[x,y],...] extruded along Z (centred), flat shaded.
    prism(outline,depth,key=null){
      return memo(key||('pr'+outline.join(';')+depth),()=>{
        const s=new T.Shape();outline.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();
        const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1});g.translate(0,0,-depth/2);return g;
      });
    },
    // Battered block: base w0 x d0 at y=0 tapering to w1 x d1 at y=h, flat shaded.
    frustum:(w0,d0,w1,d1,h)=>memo(`fr${w0},${d0},${w1},${d1},${h}`,()=>{const g=new T.BoxGeometry(1,1,1).toNonIndexed(),p=g.attributes.position;
      for(let i=0;i<p.count;i++){const top=p.getY(i)>0;p.setXYZ(i,p.getX(i)*(top?w1:w0),top?h:0,p.getZ(i)*(top?d1:d0));}g.computeVertexNormals();return g;}),
    custom:(key,make)=>memo(key,make)
  };

  // ---- Batch: accumulate transformed primitives, emit one mesh per material ----
  // Vertex colour is a tint; aSurf.x selects the surface class used by the kit
  // shader (0 paint, 1 bare metal, 2 polymer, 3 cloth), aSurf.y is emission.
  const _l=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3(),_n=new T.Matrix3(),_v=new T.Vector3(),_c=new T.Color();
  S.SURF={paint:0,metal:1,polymer:2,cloth:3};
  S.Batch=class{
    constructor(){this.groups=new Map();this.stack=[new T.Matrix4()];this.color=new T.Color(1,1,1);this.surf=0;this.glow=0;this.cast=true;this.bone=-1;}
    get m(){return this.stack[this.stack.length-1];}
    push(x=0,y=0,z=0,rx=0,ry=0,rz=0,s=1){_l.compose(_p.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz)),_s.set(s,s,s));this.stack.push(this.m.clone().multiply(_l));return this;}
    pushMatrix(m){this.stack.push(this.m.clone().multiply(m));return this;}
    pop(){this.stack.pop();return this;}
    tint(c,surf=this.surf,glow=0){this.color.set(c);this.surf=surf;this.glow=glow;return this;}
    shadow(on){this.cast=on;return this;}
    add(mat,geo,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx){
      _l.compose(_p.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz)),_s.set(sx,sy,sz));
      const key=mat.uuid+(this.cast?'c':'n');let g=this.groups.get(key);if(!g){g={mat,cast:this.cast,items:[],count:0};this.groups.set(key,g);}
      g.items.push({geo,m:this.m.clone().multiply(_l),color:this.color.getHex(),surf:this.surf,glow:this.glow,bone:this.bone});g.count+=geo.attributes.position.count;return this;
    }
    box(mat,x,y,z,w,h,d,rx=0,ry=0,rz=0){return this.add(mat,S.geo.box(),x,y,z,rx,ry,rz,w,h,d);}
    cbox(mat,x,y,z,w,h,d,c=.03,rx=0,ry=0,rz=0){return this.add(mat,S.geo.chamfer(w,h,d,c),x,y,z,rx,ry,rz);}
    cyl(mat,x,y,z,r,h,n=12,axis='y',r2=r){return this.add(mat,S.geo.cyl(r,h,n,r2),x,y,z,axis==='z'?Math.PI/2:0,0,axis==='x'?Math.PI/2:0);}
    sphere(mat,x,y,z,r,sx=1,sy=1,sz=1,w=14,h=10){return this.add(mat,S.geo.sphere(1,w,h),x,y,z,0,0,0,r*sx,r*sy,r*sz);}
    beam(mat,a,b,r=.05,n=8,r2=r){
      const A=Array.isArray(a)?_p.set(a[0],a[1],a[2]).clone():a,B=Array.isArray(b)?_p.set(b[0],b[1],b[2]).clone():b,len=A.distanceTo(B);if(len<1e-5)return this;
      _q.setFromUnitVectors(_v.set(0,1,0),_s.subVectors(B,A).normalize());_e.setFromQuaternion(_q);
      return this.add(mat,S.geo.cyl(r,1,n,r2),(A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2,_e.x,_e.y,_e.z,1,len,1);
    }
    build(parent,opts={}){
      const out=[];
      for(const g of this.groups.values()){
        const n=g.count,pos=new Float32Array(n*3),nor=new Int8Array(n*3),col=new Uint8Array(n*3),surf=new Uint8Array(n*2);
        const skinned=opts.skeleton?new Uint8Array(n*4):null,weights=opts.skeleton?new Uint8Array(n*4):null;let o=0;
        for(const it of g.items){
          const p=it.geo.attributes.position,nn=it.geo.attributes.normal;_n.getNormalMatrix(it.m);_c.setHex(it.color);
          const cr=Math.round(S.clamp(_c.r,0,1)*255),cg=Math.round(S.clamp(_c.g,0,1)*255),cb=Math.round(S.clamp(_c.b,0,1)*255);
          for(let i=0;i<p.count;i++,o++){
            _v.fromBufferAttribute(p,i).applyMatrix4(it.m);pos[o*3]=_v.x;pos[o*3+1]=_v.y;pos[o*3+2]=_v.z;
            _v.fromBufferAttribute(nn,i).applyMatrix3(_n).normalize();nor[o*3]=Math.round(_v.x*127);nor[o*3+1]=Math.round(_v.y*127);nor[o*3+2]=Math.round(_v.z*127);
            col[o*3]=cr;col[o*3+1]=cg;col[o*3+2]=cb;surf[o*2]=it.surf*32;surf[o*2+1]=Math.round(S.clamp(it.glow,0,1)*255);
            if(skinned){skinned[o*4]=Math.max(0,it.bone);weights[o*4]=255;}
          }
        }
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3,true));
        geo.setAttribute('color',new T.BufferAttribute(col,3,true));geo.setAttribute('aSurf',new T.BufferAttribute(surf,2,true));
        let mesh;
        if(skinned){geo.setAttribute('skinIndex',new T.BufferAttribute(skinned,4));geo.setAttribute('skinWeight',new T.BufferAttribute(weights,4,true));mesh=new T.SkinnedMesh(geo,g.mat);}
        else mesh=new T.Mesh(geo,g.mat);
        geo.computeBoundingSphere();geo.computeBoundingBox();
        mesh.castShadow=g.cast&&opts.cast!==false;mesh.receiveShadow=opts.receive!==false;mesh.userData.solid=g.cast;if(opts.name)mesh.name=opts.name;
        if(parent)parent.add(mesh);out.push(mesh);
      }
      this.groups.clear();return out;
    }
  };

  // ---- text and insignia ----
  S.textTexture=function(text,fg='#dcccad',bg=null,w=512,h=128,font='600'){
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h);}
    g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font=`${font} ${h*.55}px sans-serif`;g.fillText(text,w/2,h/2,w*.92);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
  };

  // ---- collision: axis-aligned boxes for movement, AI sight lines and cover ----
  S.Collision=class{
    constructor(){this.boxes=[];this.ellipses=[];this.ray=new T.Ray();this.tmp=S.v();this.bounds={minX:-60,maxX:60,minZ:-90,maxZ:70};}
    // Upright elliptical column (rock massifs, silos). rot follows Object3D.rotation.y.
    addEllipse(x,z,rx,rz,y0,y1,rot=0,tag=null){const e={x,z,rx,rz,y0,y1,c:Math.cos(rot),s:Math.sin(rot),tag};this.ellipses.push(e);return e;}
    add(x,y,z,w,h,d,tag=null){const b=new T.Box3(S.v(x-w/2,y,z-d/2),S.v(x+w/2,y+h,z+d/2));b.tag=tag;this.boxes.push(b);return b;}
    remove(b){const i=this.boxes.indexOf(b);if(i>=0)this.boxes.splice(i,1);}
    move(pos,dx,dz,r=.34,height=1.45){
      const attempt=(axis,delta)=>{
        pos[axis]+=delta;
        for(const b of this.boxes){
          if(b.off||pos.y+height<b.min.y||pos.y+.25>b.max.y)continue;
          const x=S.clamp(pos.x,b.min.x,b.max.x),z=S.clamp(pos.z,b.min.z,b.max.z),ox=pos.x-x,oz=pos.z-z,dist=Math.hypot(ox,oz);
          if(dist<r){if(dist>1e-5){pos.x+=ox/dist*(r-dist);pos.z+=oz/dist*(r-dist);}else pos[axis]-=delta;}
        }
      };
      attempt('x',dx);attempt('z',dz);
      for(const e of this.ellipses){
        if(pos.y+.25>e.y1||pos.y+height<e.y0)continue;
        const ox=pos.x-e.x,oz=pos.z-e.z,lx=ox*e.c-oz*e.s,lz=ox*e.s+oz*e.c,ax=e.rx+r,az=e.rz+r,k=lx*lx/(ax*ax)+lz*lz/(az*az);
        if(k<1){const f=1/Math.sqrt(Math.max(k,1e-6)),nx=lx*f,nz=lz*f;pos.x=e.x+nx*e.c+nz*e.s;pos.z=e.z-nx*e.s+nz*e.c;}
      }
      pos.x=S.clamp(pos.x,this.bounds.minX,this.bounds.maxX);pos.z=S.clamp(pos.z,this.bounds.minZ,this.bounds.maxZ);
    }
    inside(x,z,r=.3,y=.6){
      for(const b of this.boxes){if(b.off||y<b.min.y||y>b.max.y)continue;if(x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)return true;}
      for(const e of this.ellipses){if(y<e.y0||y>e.y1)continue;const ox=x-e.x,oz=z-e.z,lx=ox*e.c-oz*e.s,lz=ox*e.s+oz*e.c;if(lx*lx/((e.rx+r)*(e.rx+r))+lz*lz/((e.rz+r)*(e.rz+r))<1)return true;}
      return false;
    }
    distance(origin,dir,max=250){
      this.ray.set(origin,dir);let best=max;
      for(const b of this.boxes){if(b.off)continue;if(this.ray.intersectBox(b,this.tmp)){const d=origin.distanceTo(this.tmp);if(d<best)best=d;}}
      for(const e of this.ellipses){
        const ox=origin.x-e.x,oz=origin.z-e.z,px=(ox*e.c-oz*e.s)/e.rx,pz=(ox*e.s+oz*e.c)/e.rz,qx=(dir.x*e.c-dir.z*e.s)/e.rx,qz=(dir.x*e.s+dir.z*e.c)/e.rz;
        const a=qx*qx+qz*qz,bb=px*qx+pz*qz,cc=px*px+pz*pz-1;let t;
        if(cc<=0)t=0;else{if(a<1e-9)continue;const disc=bb*bb-a*cc;if(disc<0)continue;t=(-bb-Math.sqrt(disc))/a;if(t<0)continue;}
        const y=origin.y+dir.y*t;if(y<e.y0||y>e.y1||t>=best)continue;best=t;
      }
      return best;
    }
    visible(a,b){const dir=b.clone().sub(a),dist=dir.length();if(dist<1e-4)return true;return this.distance(a,dir.multiplyScalar(1/dist),dist+.05)>=dist-.1;}
  };
})(window.Spice,window.THREE);
