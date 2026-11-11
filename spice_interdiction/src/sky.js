'use strict';
/* Sky, sun, aerial haze and shadows.
 * - Analytic sky dome with a dust belt, forward scattering, thin cirrus and two moons.
 * - The same sky is convolved into the image-based ambient light, so shade is filled
 *   by blue sky from above and warm sand bounce from below.
 * - Three's fog chunks are replaced by height-attenuated haze that warms toward the sun.
 * - One 4096 sun shadow map follows the player on a texel-snapped grid and fades at its rim. */
(function(S,T){
  const sun=S.SUN_DIR, f3=v=>`vec3(${v.map(n=>n.toFixed(4)).join(',')})`;
  S.ATMOS={fog:[.86,.70,.52],fogSun:[1.75,1.22,.72],ground:[.27,.215,.165],density:.00135,falloff:.016};
  const GLSL_SUN=f3(sun.toArray());

  T.ShaderChunk.fog_pars_vertex=`#ifdef USE_FOG\n varying float vFogDepth; varying float vFogSun; varying float vFogY;\n#endif`;
  T.ShaderChunk.fog_vertex=`#ifdef USE_FOG
    vFogDepth=-mvPosition.z;
    vFogSun=dot(normalize(mvPosition.xyz),(viewMatrix*vec4(${GLSL_SUN},0.)).xyz);
    vFogY=dot(viewMatrix[1].xyz,mvPosition.xyz)+cameraPosition.y;
  #endif`;
  T.ShaderChunk.fog_pars_fragment=`#ifdef USE_FOG
    uniform vec3 fogColor; varying float vFogDepth; varying float vFogSun; varying float vFogY;
    #ifdef FOG_EXP2
      uniform float fogDensity;
    #else
      uniform float fogNear; uniform float fogFar;
    #endif
  #endif`;
  T.ShaderChunk.fog_fragment=`#ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogLayer=exp(-max(.5*(vFogY+cameraPosition.y),0.)*${S.ATMOS.falloff.toFixed(4)});
      float fogFactor=1.-exp(-vFogDepth*fogDensity*(.22+.78*fogLayer));
    #else
      float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
    #endif
    vec3 fogTint=mix(fogColor,${f3(S.ATMOS.fogSun)},pow(max(vFogSun,0.),5.)*.9);
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogTint,fogFactor);
  #endif`;
  { // Fade the sun shadow toward the rim of its box instead of ending on a hard line.
    const key='return mix( 1.0, shadow, shadowIntensity );',c=T.ShaderChunk.shadowmap_pars_fragment,i=c.indexOf(key);
    if(i>0)T.ShaderChunk.shadowmap_pars_fragment=c.slice(0,i)+'vec2 sEdge=abs(shadowCoord.xy-.5)*2.;float sFade=smoothstep(.84,.99,max(sEdge.x,sEdge.y));return mix(1.0,shadow,shadowIntensity*(1.-sFade));'+c.slice(i+key.length);
  }

  const SKY_FRAG=`
    varying vec3 vDir; uniform vec3 uSun; uniform float uEnv,uTime; uniform sampler2D uNoise;
    vec3 skyBase(vec3 d){
      float h=max(d.y,0.), mu=max(dot(d,uSun),0.);
      vec3 zen=vec3(.155,.235,.39), hor=vec3(.98,.82,.62);
      vec3 c=mix(zen,hor,pow(1.-h,4.2));
      c=mix(c,${f3(S.ATMOS.fog)}*1.12,exp(-h*11.));
      c+=vec3(1.5,1.0,.52)*(pow(mu,5.)*.34+pow(mu,36.)*.9+pow(mu,300.)*3.2);
      return c;
    }
    void main(){
      vec3 d=normalize(vDir); vec3 c=skyBase(d); float mu=max(dot(d,uSun),0.);
      if(d.y>.015){
        // High dust cirrus, sheared along the wind.
        vec2 uv=d.xz/(d.y+.16);
        float n=texture2D(uNoise,uv*vec2(.022,.05)+vec2(uTime*.0007,.2)).r*.65+texture2D(uNoise,uv*vec2(.07,.19)+.37).r*.35;
        float cl=smoothstep(.5,.86,n)*smoothstep(.015,.22,d.y)*(1.-smoothstep(.55,.95,d.y));
        c=mix(c,c*1.1+vec3(.42,.33,.22)*(.45+pow(mu,3.)*2.4),cl*.5);
      }
      // First and second moon, pale in the daylight.
      vec3 m1=normalize(vec3(.62,.52,-.35)), m2=normalize(vec3(.18,.74,.52));
      float d1=dot(d,m1), d2=dot(d,m2);
      float a1=smoothstep(.99962,.99972,d1)*(1.-smoothstep(.99955,.9999,dot(d,normalize(m1+vec3(.012,.004,0.))))*.85);
      float a2=smoothstep(.99988,.99993,d2)*(1.-smoothstep(.9998,.99996,dot(d,normalize(m2+vec3(-.006,.003,0.))))*.8);
      c+=vec3(.5,.5,.52)*(a1*.55+a2*.5)*(1.-uEnv);
      float disk=smoothstep(.99962,.99978,dot(d,uSun));
      c+=vec3(90.,70.,42.)*disk*mix(1.,.12,uEnv);
      if(d.y<0.)c=mix(c,mix(${f3(S.ATMOS.fog)},${f3(S.ATMOS.ground)},uEnv),smoothstep(0.,-.045,d.y));
      gl_FragColor=vec4(c,1.);
    }`;

  S.Sky=class{
    constructor(scene,renderer){
      this.scene=scene;this.renderer=renderer;
      const mat=this.material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,fog:false,uniforms:{uSun:{value:sun.clone()},uEnv:{value:0},uTime:S.shared.uTime,uNoise:S.shared.uNoise},
        vertexShader:'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*vec4(mat3(modelViewMatrix)*position,1.);gl_Position=p.xyww;}',fragmentShader:SKY_FRAG});
      this.dome=new T.Mesh(new T.SphereGeometry(10,40,20),mat);this.dome.frustumCulled=false;this.dome.renderOrder=-10;scene.add(this.dome);
      scene.fog=new T.FogExp2(new T.Color().setRGB(...S.ATMOS.fog),S.ATMOS.density);
      const light=this.sun=new T.DirectionalLight(new T.Color().setRGB(1,.86,.67),7.2);light.castShadow=true;light.shadow.mapSize.set(4096,4096);
      light.shadow.bias=-.00018;light.shadow.normalBias=.045;this.half=62;Object.assign(light.shadow.camera,{left:-this.half,right:this.half,top:this.half,bottom:-this.half,near:1,far:460});light.shadow.camera.updateProjectionMatrix();
      scene.add(light,light.target);
      // Faint cool fill so surfaces facing away from both sun and sky keep their form.
      this.fill=new T.DirectionalLight(new T.Color().setRGB(.6,.72,1),.62);this.fill.position.set(-sun.x,.6,-sun.z);scene.add(this.fill);
      this.right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),sun).normalize();this.up=new T.Vector3().crossVectors(sun,this.right).normalize();
      this.makeEnvironment();this.follow(new T.Vector3(0,0,20),new T.Vector3(0,0,-1));
    }
    makeEnvironment(){
      const pm=new T.PMREMGenerator(this.renderer),envScene=new T.Scene(),mat=this.material.clone();mat.uniforms.uEnv.value=1;mat.uniforms.uNoise=S.shared.uNoise;mat.uniforms.uTime={value:0};
      mat.vertexShader='varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';mat.depthTest=false;
      envScene.add(new T.Mesh(new T.SphereGeometry(20,32,16),mat));
      this.env=pm.fromScene(envScene,0,.1,100);pm.dispose();mat.dispose();
      this.scene.environment=this.env.texture;this.scene.environmentIntensity=1.0;
    }
    setShadowQuality(size,half){
      const s=this.sun.shadow;this.half=half;s.mapSize.set(size,size);Object.assign(s.camera,{left:-half,right:half,top:half,bottom:-half});s.camera.updateProjectionMatrix();
      if(s.map){s.map.dispose();s.map=null;}
    }
    // Centre the shadow box ahead of the viewer, snapped to whole shadow texels.
    follow(pos,forward){
      const c=new T.Vector3(pos.x+forward.x*this.half*.42,0,pos.z+forward.z*this.half*.42),texel=2*this.half/this.sun.shadow.mapSize.x;
      const lx=Math.round(c.dot(this.right)/texel)*texel,ly=Math.round(c.dot(this.up)/texel)*texel,ld=c.dot(sun);
      c.set(0,0,0).addScaledVector(this.right,lx).addScaledVector(this.up,ly).addScaledVector(sun,ld);
      this.sun.target.position.copy(c);this.sun.position.copy(c).addScaledVector(sun,220);this.sun.target.updateMatrixWorld();this.sun.updateMatrixWorld();
    }
  };
})(window.Spice,window.THREE);
