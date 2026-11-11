'use strict';
/* Shared geometry, deterministic procedural assets and collision helpers. */
window.Spice = {};
(function(S,T){
  S.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  S.lerp=(a,b,t)=>a+(b-a)*t;
  S.damp=(a,b,k,dt)=>S.lerp(a,b,1-Math.exp(-k*dt));
  S.rng=function(seed=93017){return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};
  S.rand=S.rng();
  S.range=(a,b)=>a+(b-a)*S.rand();
  S.v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  S.material=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const unitBox=new T.BoxGeometry(1,1,1);
  const cylinders=new Map();
  S.mesh=function(parent,geo,mat,x=0,y=0,z=0,shadow=true){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;};
  S.box=function(parent,mat,x,y,z,w,h,d,shadow=true){const m=S.mesh(parent,unitBox,mat,x,y,z,shadow);m.scale.set(w,h,d);return m;};
  S.cylinder=function(parent,mat,x,y,z,r,h,n=12,r2=r){const key=[r,r2,h,n].join(',');if(!cylinders.has(key))cylinders.set(key,new T.CylinderGeometry(r2,r,h,n));return S.mesh(parent,cylinders.get(key),mat,x,y,z);};
  S.beam=function(parent,mat,a,b,r=.06){a=Array.isArray(a)?S.v(...a):a;b=Array.isArray(b)?S.v(...b):b;const m=S.cylinder(parent,mat,0,0,0,r,a.distanceTo(b),8);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(S.v(0,1,0),b.clone().sub(a).normalize());return m;};
  S.bevelBox=function(w,h,d,b=.08){
    const x=-w/2,y=-h/2,s=new T.Shape();b=Math.min(b,w*.3,h*.3,d*.3);
    s.moveTo(x+b,y);s.lineTo(x+w-b,y);s.quadraticCurveTo(x+w,y,x+w,y+b);s.lineTo(x+w,y+h-b);s.quadraticCurveTo(x+w,y+h,x+w-b,y+h);s.lineTo(x+b,y+h);s.quadraticCurveTo(x,y+h,x,y+h-b);s.lineTo(x,y+b);s.quadraticCurveTo(x,y,x+b,y);
    const g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b*.45,bevelSegments:3,steps:1,curveSegments:5});g.translate(0,0,-d/2+b);return g;
  };
  S.texture=function(kind,size=256){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const c=canvas.getContext('2d'),im=c.createImageData(size,size),rnd=S.rng(kind==='sand'?19:47);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=rnd(),wave=Math.sin(y/size*Math.PI*18+2.4*Math.sin(x/size*Math.PI*2)+.6*Math.sin(x/size*Math.PI*6));
      let a=kind==='sand'? .84+wave*.025+(n-.5)*.08: .69+(n-.5)*.27+Math.sin(y*.41)*.04;
      const i=(y*size+x)*4;im.data[i]=255*a;im.data[i+1]=255*a;im.data[i+2]=255*a;im.data[i+3]=255;
    }
    c.putImageData(im,0,0);const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;tex.colorSpace=T.SRGBColorSpace;return tex;
  };
  S.textTexture=function(text,fg='#dcccad',bg=null,w=512,h=128){
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h);}g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font=`600 ${h*.55}px sans-serif`;g.fillText(text,w/2,h/2,w*.9);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  };
  S.label=function(parent,text,x,y,z,w,h,color='#d5c4a4'){
    const tex=S.textTexture(text,color);const m=S.mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),x,y,z,false);return m;
  };
  S.rockGeometry=function(seed=1){
    const rnd=S.rng(seed),radial=28,levels=40,pos=[],col=[],ix=[],uv=[];
    const shades=[new T.Color('#655d53'),new T.Color('#a08b73'),new T.Color('#bda78a')];
    const lobes=Array.from({length:radial},()=>.78+rnd()*.32);
    for(let j=0;j<=levels;j++){
      const h=j/levels;const taper=h<.75?1:1-(h-.75)*1.3;
      for(let i=0;i<=radial;i++){
        const angle=(i%radial)/radial*Math.PI*2;
        const ring=taper*(1+.023*Math.sin(h*29+seed+Math.sin(h*8)*2)+.008*Math.sin(h*103)+.028*Math.sin(h*17+angle*3+seed));
        const r=ring*lobes[i%radial];pos.push(Math.cos(angle)*r+.14*Math.sin(h*5+seed),h,Math.sin(angle)*r+.12*Math.sin(h*8));
        const v=S.clamp(.32+h*.27+Math.sin(h*42+seed)*.095+rnd()*.07,0,1);const cl=shades[0].clone().lerp(shades[2],v);col.push(cl.r,cl.g,cl.b);uv.push(i/radial*3,h*5);
        if(j<levels&&i<radial){const a=j*(radial+1)+i,b=a+radial+1;ix.push(a,b,a+1,b,b+1,a+1);}
      }
    }
    for(let i=1;i<radial-1;i++)ix.push(levels*(radial+1),levels*(radial+1)+i,levels*(radial+1)+i+1);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
  };
  S.Collision=class{
    constructor(){this.boxes=[];this.ray=new T.Ray();this.tmp=S.v();}
    add(x,y,z,w,h,d){const b=new T.Box3(S.v(x-w/2,y,z-d/2),S.v(x+w/2,y+h,z+d/2));this.boxes.push(b);return b;}
    move(pos,dx,dz,r=.34){
      const attempt=(axis,delta)=>{pos[axis]+=delta;for(const b of this.boxes){if(pos.y+1.45<b.min.y||pos.y>b.max.y)continue;const x=S.clamp(pos.x,b.min.x,b.max.x),z=S.clamp(pos.z,b.min.z,b.max.z),ox=pos.x-x,oz=pos.z-z,dist=Math.hypot(ox,oz);if(dist<r){if(dist>.00001){pos.x+=ox/dist*(r-dist);pos.z+=oz/dist*(r-dist);}else{pos[axis]-=delta;}}}};
      attempt('x',dx);attempt('z',dz);pos.x=S.clamp(pos.x,-51,51);pos.z=S.clamp(pos.z,-70,64);
    }
    distance(origin,dir,max=250){this.ray.set(origin,dir);let best=max;for(const b of this.boxes){if(this.ray.intersectBox(b,this.tmp)){const d=origin.distanceTo(this.tmp);if(d<best)best=d;}}return best;}
    visible(a,b){const dir=b.clone().sub(a),dist=dir.length();return this.distance(a,dir.normalize(),dist+.05)>=dist-.1;}
  };
})(window.Spice,window.THREE);
