'use strict';
/* A small explicit HDR pipeline, separate from gameplay.
 * World HDR+depth -> depth-based ambient occlusion -> view model -> bloom ->
 * filmic exposure / depth-occluded sun shafts / subtle heat / display output.
 * All render targets are retained and resized, never allocated each frame. */
(function(S,T){
  const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  S.CinematicRenderer=class{
    constructor(game){
      this.game=game;this.renderer=game.renderer;this.width=1;this.height=1;
      this.scene=new T.Scene();this.camera=new T.Camera();this.quad=new T.Mesh(new T.PlaneGeometry(2,2),null);this.quad.frustumCulled=false;this.scene.add(this.quad);
      const target=(depth=false)=>new T.WebGLRenderTarget(8,8,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:depth,stencilBuffer:false});
      this.world=target(true);this.world.depthTexture=new T.DepthTexture(8,8,T.UnsignedIntType);
      this.work=target(true);this.ao=target();this.bloomA=target();this.bloomB=target();this.world.samples=4;this.work.samples=4;
      this.aoCompute=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,uniforms:{
        tColor:{value:this.world.texture},tDepth:{value:this.world.depthTexture},uPixel:{value:new T.Vector2()},uInverseProjection:{value:new T.Matrix4()},uHigh:{value:1}},fragmentShader:`
        varying vec2 vUv;uniform sampler2D tColor,tDepth;uniform vec2 uPixel;uniform mat4 uInverseProjection;uniform float uHigh;
        vec3 positionAt(vec2 uv,float d){vec4 p=uInverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
        void main(){
          vec3 col=vec3(1.);float depth=texture2D(tDepth,vUv).r;
          if(depth<.99996 && uHigh>.5){
            vec3 p=positionAt(vUv,depth);vec3 normal=normalize(cross(dFdx(p),dFdy(p)));if(normal.z<0.)normal=-normal;
            float radius=1.05;float px=clamp(440./max(-p.z,1.),2.,42.);float occ=0.;
            float turn=fract(sin(dot(floor(vUv/uPixel),vec2(12.9898,78.233)))*43758.5453)*6.283;
            for(int i=0;i<12;i++){
              float fi=float(i),angle=fi*2.399963+turn;
              vec2 offset=vec2(cos(angle),sin(angle))*px*(.22+.78*sqrt((fi+.5)/12.))*uPixel;
              vec2 uv=clamp(vUv+offset,vec2(.001),vec2(.999));float d=texture2D(tDepth,uv).r;
              vec3 delta=positionAt(uv,d)-p;float len=length(delta);
              occ+=max(dot(normal,delta/max(len,.001))-.13,0.)*(1.-smoothstep(.12,radius,len))*step(.015,len);
            }
            float ao=clamp(1.-occ*.25,.65,1.);col=vec3(mix(ao,1.,smoothstep(50.,150.,-p.z)));
          }
          gl_FragColor=vec4(col,1.);
        }`});
      // Depth-aware blur suppresses speckle without smearing across silhouettes.
      this.occlusion=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,uniforms:{
        tColor:{value:this.world.texture},tAO:{value:this.ao.texture},tDepth:{value:this.world.depthTexture},uPixel:{value:new T.Vector2()},uHigh:{value:1},uNearFar:{value:new T.Vector2(.07,950)}},fragmentShader:`
        varying vec2 vUv;uniform sampler2D tColor,tAO,tDepth;uniform vec2 uPixel,uNearFar;uniform float uHigh;
        float linearDepth(float d){return uNearFar.x*uNearFar.y/(uNearFar.y+(uNearFar.x-uNearFar.y)*d);}
        void main(){vec3 col=texture2D(tColor,vUv).rgb;float ao=1.;if(uHigh>.5){
          float centre=linearDepth(texture2D(tDepth,vUv).r),sum=0.,weight=0.;
          for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
            vec2 uv=vUv+vec2(float(x),float(y))*uPixel*2.;float d=linearDepth(texture2D(tDepth,uv).r);
            float w=exp(-abs(d-centre)/(max(.08,centre*.012)))*((x==0&&y==0)?2.:1.);
            sum+=texture2D(tAO,uv).r*w;weight+=w;
          }ao=sum/max(weight,.001);
        }gl_FragColor=vec4(col*ao,1.);}`});
      this.bright=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,uniforms:{tSrc:{value:this.work.texture}},fragmentShader:`varying vec2 vUv;uniform sampler2D tSrc;void main(){vec3 c=texture2D(tSrc,vUv).rgb;float v=max(c.r,max(c.g,c.b));float soft=smoothstep(.7,2.4,v);gl_FragColor=vec4(c*soft*.48,1.);}`});
      this.blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,uniforms:{tSrc:{value:null},uStep:{value:new T.Vector2()}},fragmentShader:`varying vec2 vUv;uniform sampler2D tSrc;uniform vec2 uStep;void main(){vec3 c=texture2D(tSrc,vUv).rgb*.227027;c+=(texture2D(tSrc,vUv+uStep*1.384615).rgb+texture2D(tSrc,vUv-uStep*1.384615).rgb)*.316216;c+=(texture2D(tSrc,vUv+uStep*3.230769).rgb+texture2D(tSrc,vUv-uStep*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`});
      this.final=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:true,vertexShader:vertex,uniforms:{
        tColor:{value:this.work.texture},tBloom:{value:this.bloomA.texture},tDepth:{value:this.world.depthTexture},uPixel:{value:new T.Vector2()},uSun:{value:new T.Vector2()},uSunVisible:{value:0},uTime:{value:0},uHigh:{value:1},uHurt:{value:0},uAim:{value:0},uMotion:{value:1},uWorm:{value:0}},fragmentShader:`
        varying vec2 vUv;uniform sampler2D tColor,tBloom,tDepth;uniform vec2 uPixel,uSun;
        uniform float uSunVisible,uTime,uHigh,uHurt,uAim,uMotion,uWorm;
        float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
          float d=texture2D(tDepth,vUv).r;
          vec2 uv=vUv;
          // Distant heat shimmer only; never displace the close weapon/sight.
          float heat=smoothstep(.997,.99995,d)*(1.-smoothstep(.45,.7,vUv.y))*uHigh*uMotion;
          heat*=1.-smoothstep(.15,.42,length(vUv-vec2(.5,.45)))*uAim;
          uv.x+=sin(vUv.y*180.+uTime*1.3)*sin(vUv.x*59.-uTime*.7)*.00028*heat;
          vec3 c=texture2D(tColor,uv).rgb;
          if(uHigh>.5){
            c+=texture2D(tBloom,vUv).rgb*.22;
            vec2 stepUV=(uSun-vUv)/16.;vec2 p=vUv;float shaft=0.,decay=1.;
            for(int i=0;i<16;i++){p+=stepUV;float sky=step(.99996,texture2D(tDepth,clamp(p,vec2(.001),vec2(.999))).r);shaft+=sky*decay;decay*=.94;}
            float source=step(.99996,texture2D(tDepth,clamp(uSun,vec2(.001),vec2(.999))).r)*uSunVisible;
            c+=vec3(1.,.67,.31)*shaft*.0075*source;
            float glow=exp(-length((vUv-uSun)*vec2(1.6,1.))*3.4)*source;
            c+=vec3(1.,.65,.28)*glow*.055;
          }
          // Restrained warm highlights and cool mineral shadows, not a sepia overlay.
          float lum=dot(c,vec3(.2126,.7152,.0722));
          c*=mix(vec3(.94,.985,1.045),vec3(1.03,1.,.94),smoothstep(.05,.7,lum));
          c=mix(vec3(lum),c,1.045);
          vec2 q=vUv*2.-1.;float edge=smoothstep(.25,1.45,dot(q,q));c*=1.-edge*.13;
          c=mix(c,vec3(.37,.034,.012),edge*uHurt*.35);
          gl_FragColor=vec4(max(c,vec3(0.)),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          float grain=(random(gl_FragCoord.xy+fract(uTime)*113.)-.5)*.005;
          gl_FragColor.rgb+=grain*uHigh;
        }`});
      this.makeEnvironment();
    }
    makeEnvironment(){
      const w=256,h=128,data=new Float32Array(w*h*4),sun=S.v(-.42,.30,-.855).normalize();
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const theta=(y+.5)/h*Math.PI,phi=(x+.5)/w*Math.PI*2;
        const dir=S.v(-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta));
        const t=Math.max(0,dir.y),d=Math.max(0,dir.dot(sun));const highlight=Math.pow(d,160)*2.2;
        const i=(y*w+x)*4;
        data[i]=S.lerp(.48,.25,Math.sqrt(t))+highlight;data[i+1]=S.lerp(.34,.31,Math.sqrt(t))+highlight*.73;data[i+2]=S.lerp(.20,.37,Math.sqrt(t))+highlight*.42;data[i+3]=1;
        if(dir.y<0){data[i]*=.42;data[i+1]*=.43;data[i+2]*=.43;}
      }
      const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;
      const pmrem=new T.PMREMGenerator(this.renderer);const env=pmrem.fromEquirectangular(tex);this.env=env;
      this.game.scene.environment=env.texture;this.game.scene.environmentIntensity=.42;
      this.game.viewScene.environment=env.texture;this.game.viewScene.environmentIntensity=.72;
      tex.dispose();pmrem.dispose();
    }
    resize(w,h,high=true){
      this.width=w;this.height=h;const samples=high?4:0;
      for(const rt of [this.world,this.work]){if(rt.samples!==samples){rt.samples=samples;rt.dispose();}rt.setSize(w,h);}
      this.ao.setSize(Math.max(1,w>>1),Math.max(1,h>>1));
      this.bloomA.setSize(Math.max(1,w>>2),Math.max(1,h>>2));this.bloomB.setSize(Math.max(1,w>>2),Math.max(1,h>>2));
      this.aoCompute.uniforms.uPixel.value.set(1/w,1/h);this.occlusion.uniforms.uPixel.value.set(1/w,1/h);this.final.uniforms.uPixel.value.set(1/w,1/h);
      this.aoCompute.uniforms.uHigh.value=this.occlusion.uniforms.uHigh.value=this.final.uniforms.uHigh.value=high?1:0;
    }
    draw(material,target){this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.clear();this.renderer.render(this.scene,this.camera);}
    frame(){
      const g=this.game,r=this.renderer;
      r.setRenderTarget(this.world);r.clear();r.render(g.scene,g.camera);
      this.worldStats={calls:r.info.render.calls,triangles:r.info.render.triangles};
      this.aoCompute.uniforms.uInverseProjection.value.copy(g.camera.projectionMatrixInverse);if(g.quality!=='low')this.draw(this.aoCompute,this.ao);
      this.draw(this.occlusion,this.work);
      if(g.state!=='title'){r.setRenderTarget(this.work);r.clearDepth();r.render(g.viewScene,g.viewCamera);}
      if(g.quality!=='low'){
        this.draw(this.bright,this.bloomA);
        this.blur.uniforms.tSrc.value=this.bloomA.texture;this.blur.uniforms.uStep.value.set(1/this.bloomA.width,0);this.draw(this.blur,this.bloomB);
        this.blur.uniforms.tSrc.value=this.bloomB.texture;this.blur.uniforms.uStep.value.set(0,1/this.bloomB.height);this.draw(this.blur,this.bloomA);
      }
      const sun=S.v(-.42,.30,-.855).normalize(),p=g.camera.position.clone().addScaledVector(sun,500).project(g.camera);
      const forward=S.v(0,0,-1).applyQuaternion(g.camera.quaternion);const u=this.final.uniforms;
      u.uSun.value.set(p.x*.5+.5,p.y*.5+.5);u.uSunVisible.value=(forward.dot(sun)>.1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.1)?1:0;
      u.uTime.value=g.time;u.uAim.value=g.player.aim;u.uHurt.value=g.hurt;u.uMotion.value=g.motionReduced?0:1;u.uWorm.value=g.worm?.intensity||0;
      this.draw(this.final,null);
    }
  };
})(window.Spice,window.THREE);
