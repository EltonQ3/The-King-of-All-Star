'use strict';
/* HDR frame pipeline, separate from gameplay.
 *   world (MSAA HDR + depth) -> half-res ambient occlusion -> depth-aware composite
 *   -> first-person view model -> unthresholded 6-level bloom pyramid (also the
 *   ADS periphery blur) -> eye adaptation -> final: heat shimmer, chromatic
 *   fringe, lens dirt, sun shafts and flare, filmic curve, grade, vignette, grain.
 * Every target is allocated once and resized; nothing is created per frame. */
(function(S,T){
  const VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const pass=(uniforms,fragmentShader)=>new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:VERT,uniforms,fragmentShader:'varying vec2 vUv;'+fragmentShader});
  const LEVELS=6;
  S.CinematicRenderer=class{
    constructor(game){
      this.game=game;this.renderer=game.renderer;this.width=this.height=1;this.exposure=.92;this.fade=0;this.flash=0;
      this.scene=new T.Scene();this.camera=new T.Camera();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),null);this.quad.frustumCulled=false;this.scene.add(this.quad);
      const target=(depth=false,type=T.HalfFloatType)=>new T.WebGLRenderTarget(8,8,{type,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:depth,stencilBuffer:false});
      this.world=target(true);this.world.depthTexture=new T.DepthTexture(8,8,T.UnsignedIntType);this.work=target(true);this.world.samples=this.work.samples=4;
      this.ao=target(false,T.UnsignedByteType);this.down=[];this.up=[];for(let i=0;i<LEVELS;i++){this.down.push(target());this.up.push(target());}
      this.adapt=[target(),target()];this.adapt.forEach(t=>t.setSize(1,1));this.adaptIndex=0;
      this.dirt=this.makeDirt();

      this.aoCompute=pass({tDepth:{value:this.world.depthTexture},uPixel:{value:new T.Vector2()},uInverseProjection:{value:new T.Matrix4()}},`
        uniform sampler2D tDepth;uniform vec2 uPixel;uniform mat4 uInverseProjection;
        vec3 positionAt(vec2 uv,float d){vec4 p=uInverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        // Every lookup is snapped to a depth texel centre: reconstructing a position at a
        // UV that does not match the sampled texel bands badly on grazing surfaces.
        vec2 texel(vec2 uv){return (floor(uv/uPixel)+.5)*uPixel;}
        void main(){
          vec2 c=texel(vUv);float depth=texture2D(tDepth,c).r,ao=1.;
          if(depth<.99996){
            vec3 p=positionAt(c,depth);
            vec2 ex=vec2(uPixel.x,0.),ey=vec2(0.,uPixel.y);
            vec3 pr=positionAt(c+ex,texture2D(tDepth,c+ex).r),pl=positionAt(c-ex,texture2D(tDepth,c-ex).r),pu=positionAt(c+ey,texture2D(tDepth,c+ey).r),pd=positionAt(c-ey,texture2D(tDepth,c-ey).r);
            vec3 dx=abs(pr.z-p.z)<abs(p.z-pl.z)?pr-p:p-pl,dy=abs(pu.z-p.z)<abs(p.z-pd.z)?pu-p:p-pd;
            vec3 normal=normalize(cross(dx,dy));if(normal.z<0.)normal=-normal;
            float radius=1.25,px=clamp(520./max(-p.z,1.),3.,48.),occ=0.;
            float turn=fract(sin(dot(floor(vUv/uPixel),vec2(12.9898,78.233)))*43758.5453)*6.283;
            for(int i=0;i<14;i++){
              float fi=float(i),angle=fi*2.399963+turn;
              vec2 uv=texel(clamp(c+vec2(cos(angle),sin(angle))*px*(.18+.82*sqrt((fi+.5)/14.))*uPixel,vec2(.002),vec2(.998)));
              vec3 delta=positionAt(uv,texture2D(tDepth,uv).r)-p;float len=length(delta);
              occ+=max(dot(normal,delta/max(len,.001))-.22,0.)*(1.-smoothstep(.1,radius,len))*step(.03,len);
            }
            ao=mix(clamp(1.-occ*.27,.45,1.),1.,smoothstep(45.,140.,-p.z));
          }
          gl_FragColor=vec4(ao,ao,ao,1.);
        }`);
      this.composite=pass({tColor:{value:this.world.texture},tAO:{value:this.ao.texture},tDepth:{value:this.world.depthTexture},uPixel:{value:new T.Vector2()},uHigh:{value:1},uNearFar:{value:new T.Vector2(.07,2600)}},`
        uniform sampler2D tColor,tAO,tDepth;uniform vec2 uPixel,uNearFar;uniform float uHigh;
        float linearDepth(float d){return uNearFar.x*uNearFar.y/(uNearFar.y+(uNearFar.x-uNearFar.y)*d);}
        void main(){vec3 col=texture2D(tColor,vUv).rgb;float ao=1.;if(uHigh>.5){
          float centre=linearDepth(texture2D(tDepth,vUv).r),sum=0.,weight=0.;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
            vec2 uv=vUv+vec2(float(x),float(y))*uPixel*2.;float d=linearDepth(texture2D(tDepth,uv).r);
            float w=exp(-abs(d-centre)/(max(.08,centre*.012)))*((x==0&&y==0)?2.:1.);sum+=texture2D(tAO,uv).r*w;weight+=w;
          }ao=sum/max(weight,.001);
          // Bright sunlit sand should not lose its bounce: occlusion bites mostly in shade.
          float lum=dot(col,vec3(.2126,.7152,.0722));ao=mix(ao,1.,smoothstep(.9,3.,lum)*.5);
        }gl_FragColor=vec4(col*ao,1.);}`);
      // 13-tap downsample (Jimenez); the first level tames fireflies by luminance weighting.
      this.downPass=pass({tSrc:{value:null},uTexel:{value:new T.Vector2()},uFirst:{value:0}},`
        uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uFirst;
        vec3 tap(vec2 o){vec3 c=min(texture2D(tSrc,vUv+o*uTexel).rgb,vec3(48.));return c;}
        float kw(vec3 c){return 1./(1.+dot(c,vec3(.2126,.7152,.0722))*uFirst);}
        void main(){
          vec3 a=tap(vec2(-2,2)),b=tap(vec2(0,2)),c=tap(vec2(2,2)),d=tap(vec2(-2,0)),e=tap(vec2(0,0)),f=tap(vec2(2,0)),g=tap(vec2(-2,-2)),h=tap(vec2(0,-2)),i=tap(vec2(2,-2)),j=tap(vec2(-1,1)),k=tap(vec2(1,1)),l=tap(vec2(-1,-1)),m=tap(vec2(1,-1));
          vec3 g0=(j+k+l+m)*.25,g1=(a+b+d+e)*.25,g2=(b+c+e+f)*.25,g3=(d+e+g+h)*.25,g4=(e+f+h+i)*.25;
          float w0=kw(g0)*.5,w1=kw(g1)*.125,w2=kw(g2)*.125,w3=kw(g3)*.125,w4=kw(g4)*.125;
          gl_FragColor=vec4((g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4),1.);
        }`);
      this.upPass=pass({tLow:{value:null},tHigh:{value:null},uTexel:{value:new T.Vector2()},uMix:{value:.5}},`
        uniform sampler2D tLow,tHigh;uniform vec2 uTexel;uniform float uMix;
        void main(){vec2 d=uTexel;vec3 s=texture2D(tLow,vUv).rgb*4.;
          s+=(texture2D(tLow,vUv+vec2(d.x,0.)).rgb+texture2D(tLow,vUv-vec2(d.x,0.)).rgb+texture2D(tLow,vUv+vec2(0.,d.y)).rgb+texture2D(tLow,vUv-vec2(0.,d.y)).rgb)*2.;
          s+=texture2D(tLow,vUv+d).rgb+texture2D(tLow,vUv-d).rgb+texture2D(tLow,vUv+vec2(d.x,-d.y)).rgb+texture2D(tLow,vUv+vec2(-d.x,d.y)).rgb;
          gl_FragColor=vec4(mix(texture2D(tHigh,vUv).rgb,s/16.,uMix),1.);}`);
      this.adaptPass=pass({tSrc:{value:null},tPrev:{value:null},uRate:{value:1}},`
        uniform sampler2D tSrc,tPrev;uniform float uRate;
        void main(){float sum=0.,wsum=0.;
          for(int y=0;y<6;y++)for(int x=0;x<8;x++){vec2 uv=(vec2(float(x),float(y))+.5)/vec2(8.,6.);float w=1.-.55*length(uv-vec2(.5,.45));
            sum+=log(max(dot(texture2D(tSrc,uv).rgb,vec3(.2126,.7152,.0722)),.004))*w;wsum+=w;}
          float lum=exp(sum/wsum),prev=texture2D(tPrev,vec2(.5)).r;
          gl_FragColor=vec4(mix(prev,lum,uRate),0.,0.,1.);}`);
      this.final=pass({tScene:{value:this.work.texture},tBloom:{value:this.up[0].texture},tBlur:{value:this.down[1].texture},tDepth:{value:this.world.depthTexture},tAdapt:{value:null},tDirt:{value:this.dirt},
        uSun:{value:new T.Vector2()},uSunOn:{value:0},uAspect:{value:1},uTime:{value:0},uHigh:{value:1},uHurt:{value:0},uLow:{value:0},uAim:{value:0},uMotion:{value:1},uExposure:{value:1},uFade:{value:0},uFlash:{value:0},uShake:{value:0},uLetter:{value:0}},`
        uniform sampler2D tScene,tBloom,tBlur,tDepth,tAdapt,tDirt;uniform vec2 uSun;
        uniform float uSunOn,uAspect,uTime,uHigh,uHurt,uLow,uAim,uMotion,uExposure,uFade,uFlash,uShake,uLetter;
        float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
        vec3 rrt(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
        vec3 filmic(vec3 c){
          const mat3 inM=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));
          const mat3 outM=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
          return clamp(outM*rrt(inM*c),0.,1.);}
        float skyAt(vec2 uv){return step(.99996,texture2D(tDepth,clamp(uv,vec2(.002),vec2(.998))).r);}
        vec3 flare(vec2 uv,float vis){
          vec2 asp=vec2(uAspect,1.),p=(uv-.5)*asp,s=(uSun-.5)*asp,dv=p-s;float r=length(dv);vec3 sunCol=vec3(1.,.74,.42),c=vec3(0.);
          c+=sunCol*(.016/(r*r*8.+.012)+.07*exp(-r*3.4));
          c+=sunCol*exp(-abs(dv.y)*90.)*exp(-abs(dv.x)*2.6)*.16;           // anamorphic streak
          float k0=length(p+s*.42);c+=vec3(.35,.7,.55)*smoothstep(.075,.05,k0)*.028;
          float k1=length(p+s*.9);c+=vec3(.9,.5,.28)*smoothstep(.04,.026,k1)*.04;
          float k2=length(p+s*1.5);c+=vec3(.4,.5,.9)*smoothstep(.16,.11,k2)*(.35+.65*smoothstep(.05,.15,k2))*.02;
          return c*vis;}
        void main(){
          vec2 cc=vUv-.5;float r2=dot(cc*vec2(uAspect,1.),cc*vec2(uAspect,1.))/(.25*(uAspect*uAspect+1.));
          float depth=texture2D(tDepth,vUv).r;vec2 uv=vUv;
          // Heat shimmer rises off distant ground only; the weapon and sight stay sharp.
          float heat=smoothstep(.9975,.99995,depth)*(1.-smoothstep(.42,.68,vUv.y))*uHigh*uMotion*(1.-uAim*(1.-smoothstep(.12,.4,length(cc))));
          uv+=vec2(sin(vUv.y*210.+uTime*1.7)*sin(vUv.x*61.-uTime*.9),sin(vUv.x*170.+uTime*1.3)*.5)*.00042*heat;
          uv+=vec2(sin(uTime*71.),cos(uTime*57.))*uShake*.0012;
          vec2 off=cc*r2*(.0035+uHurt*.006)*uHigh;
          vec3 col=vec3(texture2D(tScene,uv+off).r,texture2D(tScene,uv).g,texture2D(tScene,uv-off).b);
          if(uHigh>.5){
            vec3 blur=texture2D(tBlur,uv).rgb;col=mix(col,blur,uAim*.7*smoothstep(.2,.8,r2));
            vec3 bloom=texture2D(tBloom,vUv).rgb,dirt=texture2D(tDirt,vUv).rgb;
            col=mix(col,bloom,.055);col+=bloom*dirt*.09;
            // Screen-space shafts: march toward the sun through the sky mask.
            float vis=(skyAt(uSun)+skyAt(uSun+vec2(.012,0.))+skyAt(uSun-vec2(.012,0.))+skyAt(uSun+vec2(0.,.02))+skyAt(uSun-vec2(0.,.02)))*.2*uSunOn;
            vec2 stepUV=(uSun-vUv)/22.;vec2 p=vUv+stepUV*hash(gl_FragCoord.xy+uTime);float shaft=0.,decay=1.;
            for(int i=0;i<22;i++){shaft+=skyAt(p)*decay;decay*=.95;p+=stepUV;}
            float sunDist=length((vUv-uSun)*vec2(uAspect,1.));
            col+=vec3(1.,.7,.38)*shaft*.012*uSunOn*exp(-sunDist*1.6);
            if(vis>.01){vec3 fl=flare(vUv,vis);col+=fl*(1.+dirt*2.)*1.6;}
          }
          float adapt=texture2D(tAdapt,vec2(.5)).r;
          col*=uExposure*mix(1.,clamp(.2/max(adapt,.02),.62,1.7),.6);
          col+=vec3(1.,.9,.72)*uFlash;
          col=filmic(col*1.05);
          // Grade: cool mineral shadows, warm spice highlights, slight desaturation.
          float l=luma(col);col*=mix(vec3(.90,.99,1.10),vec3(1.06,1.0,.90),smoothstep(.03,.6,l));
          col=mix(col,col*col*(3.-2.*col),.2);col=col*.985+vec3(.008,.0085,.009);
          l=luma(col);col=mix(vec3(l),col,.93*(1.-.55*uLow)*(1.-.35*uHurt));
          float vr=smoothstep(.12-uAim*.06,1.08,r2);col*=1.-(.34+uLow*.4+uAim*.2)*vr*vr*(3.-2.*vr);
          float edge=smoothstep(.2,1.,r2);
          col=mix(col,vec3(.5,.035,.012)*(.35+l),clamp(uHurt*edge*.8+uLow*edge*edge*.3*(.75+.25*sin(uTime*5.)),0.,1.));
          col*=1.-uFade;
          // Cinematic bars for the opening and the lift-off.
          col*=1.-step(1.-uLetter*.115,abs(cc.y)*2.);
          col=mix(col*12.92,1.055*pow(max(col,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),col));
          col+=(hash(gl_FragCoord.xy+fract(uTime)*91.)-.5)*(.018*uHigh+.004);
          gl_FragColor=vec4(col,1.);
        }`);
      this.makeEnvironment();
    }
    makeDirt(){
      const c=document.createElement('canvas');c.width=512;c.height=288;const g=c.getContext('2d'),r=S.rng(555);g.fillStyle='#000';g.fillRect(0,0,512,288);g.globalCompositeOperation='lighter';
      for(let i=0;i<110;i++){const x=r()*512,y=r()*288,rad=4+r()*r()*46,a=.05+r()*.16,gr=g.createRadialGradient(x,y,rad*.55,x,y,rad);gr.addColorStop(0,`rgba(255,236,205,${a})`);gr.addColorStop(.8,`rgba(255,236,205,${a*.8})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}
      for(let i=0;i<500;i++){g.fillStyle=`rgba(255,240,215,${r()*.12})`;g.fillRect(r()*512,r()*288,1+r()*1.5,1+r()*1.5);}
      const t=new T.CanvasTexture(c);t.colorSpace=T.NoColorSpace;return t;
    }
    makeEnvironment(){
      // The view model borrows the world sky so metal reflects the same light the level does.
      const env=this.game.sky.env.texture;this.game.viewScene.environment=env;this.game.viewScene.environmentIntensity=1.05;
    }
    resize(w,h,high=true,samples=high?4:0){
      this.width=w;this.height=h;
      for(const rt of [this.world,this.work]){if(rt.samples!==samples){rt.samples=samples;rt.dispose();}rt.setSize(w,h);}
      this.ao.setSize(Math.max(1,w>>1),Math.max(1,h>>1));
      for(let i=0;i<LEVELS;i++){const s=2<<i,x=Math.max(2,Math.round(w/s)),y=Math.max(2,Math.round(h/s));this.down[i].setSize(x,y);this.up[i].setSize(x,y);}
      this.aoCompute.uniforms.uPixel.value.set(1/w,1/h);this.composite.uniforms.uPixel.value.set(1/w,1/h);
      this.composite.uniforms.uHigh.value=this.final.uniforms.uHigh.value=high?1:0;this.final.uniforms.uAspect.value=w/h;
    }
    draw(material,target){this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);}
    frame(){
      const g=this.game,r=this.renderer,high=g.quality!=='low';
      r.setRenderTarget(this.world);r.clear();r.render(g.scene,g.camera);
      this.worldStats={calls:r.info.render.calls,triangles:r.info.render.triangles};
      this.composite.uniforms.uNearFar.value.set(g.camera.near,g.camera.far);
      if(high){this.aoCompute.uniforms.uInverseProjection.value.copy(g.camera.projectionMatrixInverse);this.draw(this.aoCompute,this.ao);}
      this.draw(this.composite,this.work);
      if(g.showViewModel()){r.setRenderTarget(this.work);r.clearDepth();r.render(g.viewScene,g.viewCamera);}
      // Bloom pyramid.
      let src=this.work;
      for(let i=0;i<LEVELS;i++){const u=this.downPass.uniforms;u.tSrc.value=src.texture;u.uTexel.value.set(1/src.width,1/src.height);u.uFirst.value=i===0?1:0;this.draw(this.downPass,this.down[i]);src=this.down[i];if(!high&&i>=3)break;}
      const top=high?LEVELS-1:3;let low=this.down[top];
      for(let i=top-1;i>=0;i--){const u=this.upPass.uniforms;u.tLow.value=low.texture;u.tHigh.value=this.down[i].texture;u.uTexel.value.set(1/low.width,1/low.height);u.uMix.value=.62;this.draw(this.upPass,this.up[i]);low=this.up[i];}
      // Eye adaptation, about one stop per second.
      const prev=this.adapt[this.adaptIndex],next=this.adapt[1-this.adaptIndex],a=this.adaptPass.uniforms;
      a.tSrc.value=this.down[Math.min(4,top)].texture;a.tPrev.value=prev.texture;a.uRate.value=this.primed?1-Math.exp(-(g.lastDt||.016)*1.6):1;this.primed=true;this.draw(this.adaptPass,next);this.adaptIndex=1-this.adaptIndex;
      const sun=S.SUN_DIR,p=g.camera.position.clone().addScaledVector(sun,500).project(g.camera),forward=S.v(0,0,-1).applyQuaternion(g.camera.quaternion),u=this.final.uniforms;
      u.tAdapt.value=next.texture;u.uSun.value.set(p.x*.5+.5,p.y*.5+.5);u.uSunOn.value=forward.dot(sun)>.05?S.clamp(1.6-Math.max(Math.abs(p.x),Math.abs(p.y)),0,1):0;
      u.uTime.value=g.time;u.uAim.value=g.player.aim;u.uHurt.value=S.clamp(g.hurt,0,1);u.uLow.value=g.state==='playing'?S.clamp(1-g.player.health/38,0,1):0;u.uMotion.value=g.motionReduced?0:1;
      u.uExposure.value=this.exposure;u.uFade.value=this.fade;u.uFlash.value=this.flash;u.uShake.value=g.motionReduced?0:(g.shake||0);u.uLetter.value=g.letterbox||0;
      this.draw(this.final,null);
    }
  };
})(window.Spice,window.THREE);
