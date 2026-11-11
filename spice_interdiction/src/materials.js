'use strict';
/* v0.3 — material library. Every map is generated locally at start-up.
 * One tiling four-channel noise texture feeds three shader families:
 *   mineral  cast stone and rock: formwork seams, tie holes, drips, strata, drifted sand
 *   kit      hard surfaces: per-vertex tint and surface class, chipped paint, dust, emission
 *   sand     dunes and hardpan: wind ripples, spice blush, glitter, creeping sand
 * Triplanar projection in object space keeps texel density constant without UVs. */
(function(S,T){
  S.SUN_DIR=new T.Vector3(-.40,.36,-.84).normalize();
  S.shared={uTime:{value:0},uNoise:{value:null},uWet:{value:0}};

  function noiseTexture(){
    const size=512,data=new Uint8Array(size*size*4),N=S.noise2,rnd=S.rng(4711);
    // Scatter cell centres for a tileable Worley channel (pits, chips, pebbles).
    const cells=18,pts=[];for(let i=0;i<cells*cells;i++)pts.push([rnd(),rnd()]);
    const worley=(u,v)=>{const cx=Math.floor(u*cells),cy=Math.floor(v*cells);let best=9;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const x=((cx+i)%cells+cells)%cells,y=((cy+j)%cells+cells)%cells,p=pts[y*cells+x],dx=(cx+i+p[0])/cells-u,dy=(cy+j+p[1])/cells-v,d=dx*dx+dy*dy;if(d<best)best=d;}return Math.sqrt(best)*cells;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,i=(y*size+x)*4;
      const fbm=S.fbm2(u*6,v*6,5,6);                                    // R: broad cloudy variation
      const grain=N(u*96,v*96,96)*.55+N(u*200,v*200,200)*.3+rnd()*.15;  // G: fine grain
      const ridge=1-Math.abs(S.fbm2(u*9+3.1,v*9+1.7,4,9)*2-1);          // B: thin vein / crack lines
      data[i]=S.clamp(.5+(fbm-.5)*2.1,0,1)*255;data[i+1]=S.clamp(grain,0,1)*255;data[i+2]=S.clamp(Math.pow(ridge,3.2)*1.25,0,1)*255;data[i+3]=S.clamp(worley(u,v),0,1)*255;
    }
    const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;t.needsUpdate=true;return t;
  }

  const VERT_PARS=`
    varying vec3 vOp; varying vec3 vOn; varying vec3 vWp; varying vec3 vWn;
    attribute vec2 aSurf; varying vec2 vSurf;`;
  const VERT_BEGIN=`
    vOp=transformed; vOn=normal; vSurf=aSurf;`;
  const VERT_END=`
    { vec4 wp=vec4(transformed,1.); vec3 wn=objectNormal;
      #ifdef USE_INSTANCING
        wp=instanceMatrix*wp; wn=mat3(instanceMatrix)*wn;
      #endif
      vWp=(modelMatrix*wp).xyz; vWn=normalize(mat3(modelMatrix)*wn); }`;
  const FRAG_PARS=`
    varying vec3 vOp; varying vec3 vOn; varying vec3 vWp; varying vec3 vWn; varying vec2 vSurf;
    uniform sampler2D uNoise; uniform float uTime; uniform float uScale; uniform float uDust; uniform float uWear;
    vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
    vec4 tri(vec3 p,vec3 w){return texture2D(uNoise,p.zy)*w.x+texture2D(uNoise,p.xz)*w.y+texture2D(uNoise,p.xy)*w.z;}`;
  const TRI_SETUP=`
    vec3 tw=pow(abs(normalize(vOn)),vec3(5.));tw/=(tw.x+tw.y+tw.z);
    vec3 P=vOp*uScale; float viewDist=length(vViewPosition);
    vec4 nA=tri(P*.045,tw), nB=tri(P*.37,tw), nC=tri(P*2.9,tw);
    vec3 wN=normalize(vWn); float up=smoothstep(.35,.9,wN.y);`;
  const BUMP=h=>`
    { float hgt=${h}; hgt*=1.-smoothstep(18.,60.,viewDist);
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(hgt)*r1+dFdy(hgt)*r2)); }`;

  function inject(mat,key,color,rough,metal,bump,emissive=''){
    mat.onBeforeCompile=sh=>{
      sh.uniforms.uNoise=S.shared.uNoise;sh.uniforms.uTime=S.shared.uTime;sh.uniforms.uScale={value:mat.userData.scale||1};sh.uniforms.uDust={value:mat.userData.dust??1};sh.uniforms.uWear={value:mat.userData.wear??1};
      mat.userData.uniforms=sh.uniforms;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+VERT_PARS).replace('#include <begin_vertex>','#include <begin_vertex>\n'+VERT_BEGIN).replace('#include <project_vertex>','#include <project_vertex>\n'+VERT_END);
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+FRAG_PARS)
        .replace('#include <color_fragment>','#include <color_fragment>\n'+TRI_SETUP+color)
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+rough)
        .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+metal)
        .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+BUMP(bump))
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+emissive);
    };
    mat.customProgramCacheKey=()=>'spice3-'+key;mat.dithering=true;return mat;
  }

  // Cast stone / rock. kind: 'concrete' (formwork architecture) or 'rock'.
  S.mineralMaterial=function(kind='concrete',color='#b9a58b',opts={}){
    const rock=kind==='rock';
    const mat=new T.MeshStandardMaterial({color,roughness:.94,metalness:0,vertexColors:true});mat.userData.scale=opts.scale||1;
    const colorCode=`
      float macro=nA.r, mid=nB.r, fine=nC.g;
      vec3 base=diffuseColor.rgb*(.84+macro*.2+mid*.1+fine*.05);
      ${rock?`
        // Wind-cut strata: warped horizontal bands, darker recesses, pale ledges.
        float sy=P.y*1.35+macro*2.6+nB.b*.35; float band=sin(sy*3.1)+.55*sin(sy*7.3+1.7)+.3*sin(sy*17.+.4);
        base*=.86+.13*band; base=mix(base,base*vec3(1.12,.94,.80),smoothstep(.2,.9,sin(sy*.83+2.))*.45);
        float crack=smoothstep(.72,.96,nB.b)*(.5+.5*mid); base*=1.-crack*.42;
        float seamH=0.;`
      :`
        // Formwork: horizontal pour lines, vertical panel seams and tie-rod holes.
        float wall=1.-tw.y; float uAxis=abs(vOn.x)>abs(vOn.z)?P.z:P.x;
        vec2 pg=vec2(uAxis/3.6,P.y/2.4); vec2 pf=abs(fract(pg)-.5);
        float seam=max(smoothstep(.492,.4985,pf.x),smoothstep(.489,.4985,pf.y))*wall;
        vec2 tg=fract(vec2(uAxis/1.2,P.y/1.2)+.5)-.5; float hole=(1.-smoothstep(.03,.042,length(tg)))*wall;
        float panelTone=fract(sin(dot(floor(pg),vec2(12.9898,78.233)))*43758.5453);
        base*=.95+panelTone*.09; base*=1.-seam*.34-hole*.5;
        // Rain never falls here; the streaks are oil and rust weeping from fixings.
        float drip=tri(P*vec3(.42,.022,.42),tw).b*smoothstep(.35,.7,macro); base=mix(base,base*vec3(.6,.52,.45),smoothstep(.5,.95,drip)*wall*.32);
        float pit=1.-smoothstep(.06,.16,nC.a); base*=1.-pit*.25;
        float seamH=seam*.012+hole*.02;`}
      // Edges weather pale; sand drifts against the base and settles on ledges.
      float curv=clamp(length(fwidth(normalize(vWn)))*14.,0.,1.); base=mix(base,base*1.28+.02,curv*.6);
      float foot=(1.-smoothstep(-.1,1.25,vWp.y-uGround+mid*.9-.35))*.75;
      float drift=clamp(up*smoothstep(.3,.62,macro*.55+mid*.45)+foot,0.,1.)*uDust;
      vec3 sandCol=s2l(vec3(.80,.63,.43))*(.86+fine*.25);
      base=mix(base,sandCol,drift*.82);
      diffuseColor.rgb=base;`;
    inject(mat,'mineral-'+kind,colorCode,
      `roughnessFactor=clamp(.9+(mid-.5)*.16+drift*.06,.5,1.);`,'',
      rock?`(nC.g*.012+nB.b*.03+nB.r*.02)*(1.-drift*.8)`:`(nC.g*.004+nC.a*.004-seamH)*(1.-drift*.7)`);
    const base=mat.onBeforeCompile;mat.onBeforeCompile=sh=>{base(sh);sh.uniforms.uGround={value:opts.ground??0};sh.fragmentShader=sh.fragmentShader.replace('uniform float uDust;','uniform float uDust; uniform float uGround;');};
    return mat;
  };

  // Hard-surface kit shader. Vertex colour tints; aSurf.x picks the class.
  S.kitMaterial=function(opts={}){
    const mat=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:1,vertexColors:true,envMapIntensity:opts.env??1});
    mat.userData.scale=opts.scale||1;mat.userData.dust=opts.dust??1;mat.userData.wear=opts.wear??1;
    const colorCode=`
      float cls=floor(vSurf.x*7.97+.5);
      float isMetal=step(.5,cls)*(1.-step(1.5,cls)), isPoly=step(1.5,cls)*(1.-step(2.5,cls)), isCloth=step(2.5,cls), isPaint=1.-step(.5,cls);
      float macro=nA.r, mid=nB.r, fine=nC.g;
      vec3 tint=diffuseColor.rgb;
      float curv=clamp(length(fwidth(normalize(vWn)))*16.,0.,1.);
      // Paint: chips open along edges and around scattered impact points.
      float chipN=(1.-smoothstep(.05,.22,nB.a))*smoothstep(.35,.7,macro)+curv*(.35+mid);
      float chip=smoothstep(.55,.8,(chipN+fine*.25)*uWear)*isPaint;
      vec3 bare=vec3(.2,.185,.17)*(.8+fine*.4);
      vec3 col=tint*(.82+mid*.22+fine*.08);
      col=mix(col,bare,chip);
      float scratch=smoothstep(.86,.98,tri(P*vec3(7.,7.,.6),tw).b)*isMetal;
      col+=scratch*.06;
      // Grime runs downward from seams; cloth carries a visible weave.
      float streak=tri(P*vec3(.7,.035,.7),tw).b*smoothstep(.4,.75,macro); col*=1.-smoothstep(.55,.95,streak)*(1.-tw.y)*.22*(1.-isCloth);
      vec2 wv=(abs(vOn.y)>.6?P.xz:abs(vOn.x)>abs(vOn.z)?P.zy:P.xy)*190.;
      float weave=sin(wv.x)*sin(wv.y)*(1.-smoothstep(.2,1.4,length(fwidth(wv)))); col*=1.+weave*.1*isCloth; col*=1.-isCloth*(.18-mid*.2);
      // Windblown dust: heavier on upward faces and in broad patches.
      float dust=clamp((up*.75+.12)*smoothstep(.25,.75,macro*.6+mid*.4)+up*.18,0.,1.)*uDust;
      vec3 dustCol=s2l(vec3(.78,.62,.43))*(.8+fine*.3);
      col=mix(col,dustCol,dust*(.7-.25*isCloth));
      float kRough=mix(.52,.6,chip); kRough=mix(kRough,.36+mid*.22-scratch*.12,isMetal); kRough=mix(kRough,.74,isPoly); kRough=mix(kRough,.97,isCloth);
      kRough=clamp(kRough+(mid-.5)*.14+dust*.5,.16,1.);
      float kMetal=clamp(isMetal+chip*.55,0.,1.)*(1.-dust*.75);
      diffuseColor.rgb=col;`;
    return inject(mat,'kit'+(opts.key||''),colorCode,`roughnessFactor=kRough;`,`metalnessFactor=kMetal;`,
      `((nC.g*.0022+scratch*.0015)*(1.-isCloth)+isCloth*weave*.0012+dust*nC.g*.004)/(uScale*uScale)`,
      `totalEmissiveRadiance+=vColor.rgb*vSurf.y*${(opts.glow??9).toFixed(1)};`);
  };

  // Dunes, drifts and the rock shelf the outpost stands on.
  S.sandMaterial=function(){
    const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:.93,metalness:0,dithering:true});
    m.onBeforeCompile=s=>{
      s.uniforms.uNoise=S.shared.uNoise;s.uniforms.uTime=S.shared.uTime;m.userData.uniforms=s.uniforms;
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aMask; varying vec3 vMask; varying vec3 vSandPos;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvSandPos=(modelMatrix*vec4(transformed,1.)).xyz; vMask=aMask;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vMask; varying vec3 vSandPos; uniform sampler2D uNoise; uniform float uTime;
        vec3 s2l(vec3 c){return pow(c,vec3(2.2));}
        float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float ripple(vec2 p,float f){float warp=texture2D(uNoise,p*.011).r*10.+texture2D(uNoise,p*.07).r*2.4;float s=.5+.5*sin(dot(p,vec2(.93,.36))*f+warp*f*.07);return s*s*(3.-2.*s);}
      `).replace('#include <color_fragment>',`#include <color_fragment>
        vec2 sp=vSandPos.xz; float viewDist=length(vViewPosition);
        float macro=texture2D(uNoise,sp*.0037).r, meso=texture2D(uNoise,sp*.023+.37).r; vec4 mic=texture2D(uNoise,sp*.71);
        float hard=vMask.x, soft=1.-hard;
        vec3 sand=mix(s2l(vec3(.70,.50,.32)),s2l(vec3(.86,.70,.50)),smoothstep(.2,.8,macro*.62+meso*.38));
        // Spice blush: cinnamon stains where the melange lies near the surface.
        float spice=smoothstep(.57,.82,texture2D(uNoise,sp*.0093+.11).r)*smoothstep(.3,.7,meso)*soft;
        sand=mix(sand,s2l(vec3(.70,.37,.17)),spice*.55);
        float near=1.-smoothstep(10.,48.,viewDist);
        float rip=ripple(sp,13.5); sand*=1.-(1.-rip)*.085*near*soft;
        // Rock shelf: paler, pitted, cut by cracks, with sand caught in the low places.
        float crack=smoothstep(.55,.95,texture2D(uNoise,sp*.085).b)*smoothstep(.35,.6,meso);
        vec3 pan=s2l(vec3(.69,.585,.46))*(.86+meso*.2+mic.g*.1); pan*=1.-crack*.3;
        float drifted=smoothstep(.5,.72,texture2D(uNoise,sp*.031+.6).r*.7+texture2D(uNoise,sp*.13).r*.3);
        hard*=1.-drifted*.75; soft=1.-hard;
        vec3 col=mix(sand,pan,hard);
        col*=.93+mic.g*.14; col*=1.-vMask.y*.38;
        // Sand creeping over the surface in thin fast ribbons.
        vec2 wd=vec2(.93,.36); float along=dot(sp,wd), across=dot(sp,vec2(-wd.y,wd.x));
        float ribbon=texture2D(uNoise,vec2(along*.031-uTime*.21,across*.19)).b*texture2D(uNoise,vec2(along*.012-uTime*.05,across*.043)+.5).r;
        col+=vec3(.09,.07,.045)*smoothstep(.18,.5,ribbon)*near*(.35+.65*soft);
        diffuseColor.rgb=col;
        float glitter=step(.988,h21(floor(sp*150.)))*(1.-smoothstep(3.,13.,viewDist))*(soft*.85+.15);
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(mix(.95,.86,hard),.28,glitter);
      `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        { float far=1.-smoothstep(60.,240.,viewDist);
          float hgt=(ripple(sp,13.5)*.011*near+ripple(sp*.83+7.,1.25)*.085*far+mic.g*.0035*near)*soft+(mic.a*.006-crack*.02)*hard*near;
          vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
          normal=normalize(abs(det)*normal-sign(det)*(dFdx(hgt)*r1+dFdy(hgt)*r2));
          vec2 gc=floor(sp*150.); normal=normalize(normal+(vec3(h21(gc+1.3),h21(gc+7.1),h21(gc+3.7))-.5)*.9*glitter); }
      `);
    };
    m.customProgramCacheKey=()=>'spice3-sand';return m;
  };

  // ---- sprite textures ----
  S.softTexture=function(){
    if(S._softTex)return S._softTex;
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,.85)');r.addColorStop(.23,'rgba(255,255,255,.6)');r.addColorStop(.6,'rgba(255,255,255,.17)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
    S._softTex=new T.CanvasTexture(c);return S._softTex;
  };

  // ---- insignia atlas: invented House glyphs, numerals and hazard marks ----
  // One texture and one draw call per chunk; quads are lit so they sit in shadow correctly.
  S.Insignia=class{
    constructor(){
      const size=1024,c=this.canvas=document.createElement('canvas');c.width=c.height=size;this.g=c.getContext('2d');this.size=size;this.x=4;this.y=4;this.row=0;this.entries=new Map();
      this.texture=new T.CanvasTexture(c);this.texture.colorSpace=T.SRGBColorSpace;this.texture.anisotropy=8;
      this.material=new T.MeshStandardMaterial({map:this.texture,transparent:true,alphaTest:.08,roughness:.8,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false});
      this.pos=[];this.nor=[];this.uv=[];
    }
    slot(key,w,h,draw){
      if(this.entries.has(key))return this.entries.get(key);
      if(this.x+w+4>this.size){this.x=4;this.y+=this.row+6;this.row=0;}
      const g=this.g;g.save();g.translate(this.x,this.y);g.beginPath();g.rect(0,0,w,h);g.clip();draw(g,w,h);g.restore();
      const e={u0:this.x/this.size,v0:1-(this.y+h)/this.size,u1:(this.x+w)/this.size,v1:1-this.y/this.size,aspect:w/h};
      this.x+=w+6;this.row=Math.max(this.row,h);this.entries.set(key,e);this.texture.needsUpdate=true;return e;
    }
    // Abstract script: bars, arcs and dots on a strict grid, seeded per string.
    glyphs(seed,count=6,color='#d8c9a8'){
      return this.slot('g'+seed+count+color,count*44+8,64,(g,w,h)=>{
        const r=S.rng(seed*977+13);g.strokeStyle=g.fillStyle=color;g.lineWidth=5;g.lineCap='butt';
        for(let i=0;i<count;i++){const x=8+i*44,k=Math.floor(r()*6);
          g.beginPath();
          if(k===0){g.moveTo(x+6,8);g.lineTo(x+6,56);g.moveTo(x+26,8);g.lineTo(x+26,56);g.moveTo(x+6,32);g.lineTo(x+26,32);}
          else if(k===1){g.arc(x+16,32,14,Math.PI*.5,Math.PI*1.5);g.moveTo(x+16,8);g.lineTo(x+16,56);}
          else if(k===2){g.moveTo(x+4,10);g.lineTo(x+28,10);g.moveTo(x+16,10);g.lineTo(x+16,56);g.moveTo(x+4,56);g.lineTo(x+28,56);}
          else if(k===3){g.arc(x+16,26,13,0,Math.PI);g.moveTo(x+16,39);g.lineTo(x+16,56);}
          else if(k===4){g.moveTo(x+5,56);g.lineTo(x+5,8);g.lineTo(x+27,8);g.moveTo(x+27,24);g.lineTo(x+27,56);}
          else{g.arc(x+16,32,13,-Math.PI*.5,Math.PI*.5);g.moveTo(x+6,8);g.lineTo(x+6,56);}
          g.stroke();if(r()>.55){g.beginPath();g.arc(x+16,r()>.5?32:48,3.5,0,7);g.fill();}
        }
      });
    }
    text(str,color='#d8c9a8',weight='700'){
      return this.slot('t'+str+color,Math.max(48,str.length*34+16),64,(g,w,h)=>{g.fillStyle=color;g.font=`${weight} 46px "Helvetica Neue",Arial,"PingFang TC","Microsoft JhengHei",sans-serif`;g.textBaseline='middle';g.textAlign='center';g.fillText(str,w/2,h/2+2,w-8);});
    }
    hazard(color='#c9953f'){return this.slot('hz'+color,192,48,(g,w,h)=>{g.fillStyle=color;for(let i=-2;i<10;i++){g.beginPath();g.moveTo(i*32,h);g.lineTo(i*32+24,0);g.lineTo(i*32+40,0);g.lineTo(i*32+16,h);g.fill();}});}
    sigil(color='#c8b48f'){return this.slot('sg'+color,96,96,(g,w,h)=>{g.strokeStyle=g.fillStyle=color;g.lineWidth=6;g.beginPath();g.arc(48,48,38,0,7);g.stroke();g.beginPath();g.moveTo(48,14);g.lineTo(78,66);g.lineTo(18,66);g.closePath();g.stroke();g.beginPath();g.arc(48,52,7,0,7);g.fill();});}
    panel(color='#c8b48f'){return this.slot('pn'+color,128,128,(g,w,h)=>{g.strokeStyle=color;g.lineWidth=4;g.strokeRect(6,6,116,116);g.lineWidth=2;for(let i=1;i<4;i++){g.beginPath();g.moveTo(6,6+i*29);g.lineTo(122,6+i*29);g.stroke();}});}
    // Place an entry: centre, facing normal (unit, axis aligned or arbitrary), width in metres.
    place(e,x,y,z,nx,ny,nz,width,roll=0){
      const n=new T.Vector3(nx,ny,nz).normalize(),up=Math.abs(n.y)>.9?new T.Vector3(0,0,-1):new T.Vector3(0,1,0);
      const right=new T.Vector3().crossVectors(up,n).normalize(),top=new T.Vector3().crossVectors(n,right);
      if(roll){const q=new T.Quaternion().setFromAxisAngle(n,roll);right.applyQuaternion(q);top.applyQuaternion(q);}
      const hw=width/2,hh=hw/e.aspect,c=new T.Vector3(x,y,z).addScaledVector(n,.012);
      const P=(a,b)=>c.clone().addScaledVector(right,a*hw).addScaledVector(top,b*hh);
      const q=[[P(-1,-1),e.u0,e.v0],[P(1,-1),e.u1,e.v0],[P(1,1),e.u1,e.v1],[P(-1,1),e.u0,e.v1]];
      for(const i of [0,1,2,0,2,3]){this.pos.push(q[i][0].x,q[i][0].y,q[i][0].z);this.nor.push(n.x,n.y,n.z);this.uv.push(q[i][1],q[i][2]);}
    }
    build(parent){
      if(!this.pos.length)return null;
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));
      const m=new T.Mesh(g,this.material);m.receiveShadow=true;m.castShadow=false;m.renderOrder=1;parent.add(m);this.pos=[];this.nor=[];this.uv=[];return m;
    }
  };

  S.initMaterials=function(){
    S.shared.uNoise.value=noiseTexture();
    S.insignia=new S.Insignia();
    S.mats={
      sand:S.sandMaterial(),
      concrete:S.mineralMaterial('concrete','#c1ad92'),
      rock:S.mineralMaterial('rock','#ffffff'),
      kit:S.kitMaterial(),
      glass:new T.MeshStandardMaterial({color:'#1b2426',roughness:.08,metalness:.9,transparent:true,opacity:.86,envMapIntensity:1.6}),
      glow:new T.MeshBasicMaterial({color:'#ffcf8a',toneMapped:false})
    };
    return S.mats;
  };
})(window.Spice,window.THREE);
