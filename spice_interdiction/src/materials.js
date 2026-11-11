'use strict';
/* v0.2 — locally generated material maps. No downloaded textures.
 * Three frequency bands provide variation at building, hand and grain scales.
 * World-space triplanar projection keeps texture size stable on large walls. */
(function(S,T){
  let detail;
  function detailTexture(){
    if(detail) return detail;
    const size=512, data=new Uint8Array(size*size*4);
    const hash=(x,y)=>{let a=Math.imul(x&255,374761393)^Math.imul(y&255,668265263);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967295;};
    function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return S.lerp(S.lerp(hash(a,b),hash(a+1,b),u),S.lerp(hash(a,b+1),hash(a+1,b+1),u),v);}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4;
      data[i]=S.clamp(.5+(noise(x/32,y/32)*.52+noise(x/16,y/16)*.25+noise(x/4,y/4)*.16+hash(x,y)*.07-.5)*1.65,0,1)*255;
      data[i+1]=S.clamp(.5+(noise(x/2,y/2)-.5)*1.3,0,1)*255;
      data[i+2]=S.clamp(.5+(noise(x/4,y/128)-.5)*1.8,0,1)*255;
      data[i+3]=255;
    }
    detail=new T.DataTexture(data,size,size,T.RGBAFormat);detail.wrapS=detail.wrapT=T.RepeatWrapping;
    detail.minFilter=T.LinearMipmapLinearFilter;detail.magFilter=T.LinearFilter;detail.generateMipmaps=true;detail.anisotropy=8;detail.needsUpdate=true;
    return detail;
  }
  S.weatherMaterial=function(mat,kind='stone',scale=1){
    const metallic=kind==='metal',fabric=kind==='cloth',rock=kind==='rock';
    mat.dithering=true;
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uWeather={value:detailTexture()};shader.uniforms.uWeatherScale={value:scale};
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying vec3 vWeatherPos; varying vec3 vWeatherN; varying vec3 vLocalPos;`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 weatherP=vec4(transformed,1.0);
        vec3 weatherN=objectNormal;
        #ifdef USE_INSTANCING
          weatherP=instanceMatrix*weatherP;
          weatherN=mat3(instanceMatrix)*weatherN;
        #endif
        vLocalPos=transformed;
        vWeatherPos=(modelMatrix*weatherP).xyz;
        vec3 scaleSq=vec3(dot(modelMatrix[0].xyz,modelMatrix[0].xyz),dot(modelMatrix[1].xyz,modelMatrix[1].xyz),dot(modelMatrix[2].xyz,modelMatrix[2].xyz));
        vWeatherN=normalize(mat3(modelMatrix)*(weatherN/max(scaleSq,vec3(.0001))));
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vWeatherPos; varying vec3 vWeatherN; varying vec3 vLocalPos;
        uniform sampler2D uWeather; uniform float uWeatherScale;
        vec3 weatherSample(vec3 p,vec3 w){return texture2D(uWeather,p.zy).rgb*w.x+texture2D(uWeather,p.xz).rgb*w.y+texture2D(uWeather,p.xy).rgb*w.z;}
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 wp=${scale>=3?'vLocalPos':'vWeatherPos'}*uWeatherScale;
        vec3 ww=pow(abs(normalize(vWeatherN)),vec3(6.));ww/=max(dot(ww,vec3(1.)),.001);
        float coarse=weatherSample(wp*.047,ww).r;
        vec3 wn=weatherSample(wp*.63,ww);
        float grain=weatherSample(wp*5.7,ww).g;
        float streak=weatherSample(wp*vec3(.23,.007,.23),ww).b;
        float sandLayer=smoothstep(.18,.82,vWeatherN.y)*smoothstep(.42,.67,coarse);
        ${metallic ? `
          float scratch=pow(1.-abs(wn.b*2.-1.),30.)*smoothstep(.6,.9,grain);
          float patina=smoothstep(.6,.88,coarse)*.15;
          diffuseColor.rgb*=.85+wn.r*.23+grain*.025;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.28,.24,.17),patina+sandLayer*.2);
          diffuseColor.rgb+=scratch*.065;
        `:fabric?`
          vec2 weaveUV=wp.xz*85.;
          float weave=sin(weaveUV.x)*sin(weaveUV.y);
          float antialias=1.-smoothstep(.15,1.5,length(fwidth(weaveUV)));
          diffuseColor.rgb*=.8+coarse*.2+grain*.07+weave*.04*antialias;
        `:`
          float strata=sin(wp.y*4.7+coarse*1.2)*.025;
          diffuseColor.rgb*=.68+coarse*.27+wn.r*.16+grain*.025+strata;
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.115,.088,.058),smoothstep(.68,.9,streak)*.14);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.39,.29,.175),sandLayer*.13);
          ${rock?'':`vec2 joint=abs(fract(vec2(wp.y/2.5,(wp.x+wp.z)/5.2))-.5);float mortar=smoothstep(.487,.5,max(joint.x,joint.y))*(1.-ww.y);diffuseColor.rgb*=1.-mortar*.065;`}
        `}
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+(wn.r-.5)*${metallic?'.25':'.12'}+sandLayer*.16,.24,1.);
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float heightDetail=weatherSample(wp*${fabric?'8.':'2.6'},ww).g*${metallic?'.00012':fabric?'.0015':rock?'.022':'.008'};
        vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);
        float det=dot(sx,r1);
        normal=normalize(max(abs(det),.0000001)*normal-sign(det)*(dFdx(heightDetail)*r1+dFdy(heightDetail)*r2));
      `);
    };
    mat.customProgramCacheKey=()=>`spice-v02-${kind}-${scale}`;mat.needsUpdate=true;return mat;
  };
  S.sandMaterial=function(){
    const m=new T.MeshStandardMaterial({color:'#c5a379',roughness:.96,dithering:true});
    m.onBeforeCompile=s=>{
      s.uniforms.uDetail={value:detailTexture()};
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSandPos;');
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSandPos=(modelMatrix*vec4(transformed,1.)).xyz;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vSandPos;uniform sampler2D uDetail;
        float sandHeight(vec2 p){float wind=p.y*17.+3.2*sin(p.x*.59+p.y*.12)+1.1*sin(p.x*1.84+p.y*.21)+texture2D(uDetail,p*.05).r*12.;float wave=sin(wind)*.5+.5;return wave*wave*.008+texture2D(uDetail,p*1.4).g*.0015;}
      `);
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 sandUV=vSandPos.xz;
        float variation=texture2D(uDetail,sandUV*.022).r;
        float grain=texture2D(uDetail,sandUV*1.4).g;
        float bands=sin(sandUV.y*17.+3.2*sin(sandUV.x*.59+sandUV.y*.12)+1.1*sin(sandUV.x*1.84+sandUV.y*.21)+texture2D(uDetail,sandUV*.05).r*12.);
        float rippleFade=1.-smoothstep(12.,55.,length(vViewPosition));
        diffuseColor.rgb*=.86+variation*.24+grain*.015+bands*.009*rippleFade;
        // Fine dark grains of spice are concentrated in irregular patches.
        float spice=smoothstep(.74,.93,grain)*smoothstep(.52,.73,variation);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.105,.045),spice*.22);
      `);
      s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float hs=sandHeight(sandUV)*rippleFade;
        vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float dd=dot(sx,r1);
        normal=normalize(max(abs(dd),.0000001)*normal-sign(dd)*(dFdx(hs)*r1+dFdy(hs)*r2));
      `);
    };m.customProgramCacheKey=()=> 'spice-sand-v02';return m;
  };
  S.softTexture=function(){
    if(S._softTex)return S._softTex;
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,.85)');r.addColorStop(.23,'rgba(255,255,255,.6)');r.addColorStop(.6,'rgba(255,255,255,.17)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
    S._softTex=new T.CanvasTexture(c);return S._softTex;
  };
})(window.Spice,window.THREE);
