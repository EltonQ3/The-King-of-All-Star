'use strict';
/* Pooled effects with fixed budgets; nothing is allocated per shot.
 *  - two instanced billboard pools (alpha dust lit by the sun, additive sparks)
 *  - travelling tracer streaks, bullet marks, tumbling casings
 *  - ambient wind-borne sand that follows the viewer */
(function(S,T){
  function puffTexture(){
    const n=128,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),im=g.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n-.5,v=y/n-.5,r=Math.hypot(u,v)*2,f=S.fbm2(x*.045+3,y*.045+7,4),a=S.clamp((1-r*r)*1.25-f*.75+.12,0,1)*S.clamp((1-r)*4,0,1),i=(y*n+x)*4;
      im.data[i]=im.data[i+1]=im.data[i+2]=205+50*f;im.data[i+3]=255*a*a*(3-2*a);}
    g.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.NoColorSpace;return t;
  }
  class Pool{
    constructor(scene,capacity,additive,map){
      this.cap=capacity;this.items=[];const quad=new T.PlaneGeometry(1,1),g=this.geo=new T.InstancedBufferGeometry();g.index=quad.index;g.setAttribute('position',quad.attributes.position);g.setAttribute('uv',quad.attributes.uv);
      this.aPos=new T.InstancedBufferAttribute(new Float32Array(capacity*4),4);this.aCol=new T.InstancedBufferAttribute(new Float32Array(capacity*4),4);this.aMisc=new T.InstancedBufferAttribute(new Float32Array(capacity*4),4);
      for(const a of [this.aPos,this.aCol,this.aMisc])a.setUsage(T.DynamicDrawUsage);g.setAttribute('iPos',this.aPos);g.setAttribute('iCol',this.aCol);g.setAttribute('iMisc',this.aMisc);g.instanceCount=0;
      const A=S.ATMOS,f3=v=>`vec3(${v.map(n=>n.toFixed(3)).join(',')})`;
      this.mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending,uniforms:{uMap:{value:map},uSunView:{value:new T.Vector3()}},
        vertexShader:`attribute vec4 iPos,iCol,iMisc;varying vec2 vUv;varying vec4 vCol;varying float vDepth,vSun;uniform vec3 uSunView;
          void main(){vec4 mv=viewMatrix*vec4(iPos.xyz,1.);float c=cos(iMisc.x),s=sin(iMisc.x);vec2 q=position.xy*vec2(iPos.w*iMisc.y,iPos.w);
            vec2 vel=iMisc.zw;float vl=length(vel);if(vl>.001){vec2 d=vel/vl;q=d*q.x*(1.+vl)+vec2(-d.y,d.x)*q.y;}else q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
            mv.xy+=q;vUv=uv;vCol=iCol;vDepth=-mv.z;vSun=dot(normalize(mv.xyz),uSunView);gl_Position=projectionMatrix*mv;}`,
        fragmentShader:`uniform sampler2D uMap;varying vec2 vUv;varying vec4 vCol;varying float vDepth,vSun;
          void main(){vec4 t=texture2D(uMap,vUv);float a=t.a*vCol.a*smoothstep(.15,1.1,vDepth);if(a<.003)discard;
            ${additive?`gl_FragColor=vec4(vCol.rgb*t.rgb*a,a);`:`vec3 c=vCol.rgb*t.rgb*(1.+pow(max(vSun,0.),4.)*1.9);
            float fog=1.-exp(-vDepth*${A.density.toFixed(5)}*.9);c=mix(c,mix(${f3(A.fog)},${f3(A.fogSun)},pow(max(vSun,0.),5.)*.9),fog);gl_FragColor=vec4(c,a);`}}`});
      this.mesh=new T.Mesh(g,this.mat);this.mesh.frustumCulled=false;this.mesh.renderOrder=additive?8:6;scene.add(this.mesh);
    }
    add(p){if(this.items.length>=this.cap)this.items.shift();this.items.push(p);return p;}
    update(dt,camera){
      const P=this.aPos.array,Cc=this.aCol.array,Mi=this.aMisc.array;let n=0;
      for(let i=this.items.length-1;i>=0;i--){const p=this.items[i];p.life-=dt;if(p.life<=0){this.items.splice(i,1);continue;}
        p.vy-=(p.gravity||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.drag){const k=Math.exp(-p.drag*dt);p.vx*=k;p.vy*=k;p.vz*=k;}
        if(p.floor!==undefined&&p.y<p.floor){p.y=p.floor;p.vy=Math.abs(p.vy)*.3;p.vx*=.5;p.vz*=.5;}}
      this.sunView=this.mat.uniforms.uSunView.value.copy(S.SUN_DIR).transformDirection(camera.matrixWorldInverse);
      for(const p of this.items){const f=1-p.life/p.max,o=n*4,fade=p.fadeIn?Math.min(1,f/p.fadeIn)*Math.min(1,(1-f)/(p.fadeOut||.6)):Math.min(1,(1-f)*(p.fadeOut?1/p.fadeOut:1.6));
        P[o]=p.x;P[o+1]=p.y;P[o+2]=p.z;P[o+3]=p.size*(1+(p.grow||0)*f);Cc[o]=p.r;Cc[o+1]=p.g;Cc[o+2]=p.b;Cc[o+3]=p.a*fade;
        Mi[o]=p.rot+(p.spin||0)*f;Mi[o+1]=p.aspect||1;
        if(p.streak){const v=new T.Vector3(p.vx,p.vy,p.vz).transformDirection(camera.matrixWorldInverse),l=Math.hypot(p.vx,p.vy,p.vz)*p.streak;Mi[o+2]=v.x*l;Mi[o+3]=v.y*l;}else{Mi[o+2]=0;Mi[o+3]=0;}
        n++;}
      this.geo.instanceCount=n;this.aPos.needsUpdate=this.aCol.needsUpdate=this.aMisc.needsUpdate=true;
    }
    clear(){this.items.length=0;this.geo.instanceCount=0;}
  }

  S.Effects=class{
    constructor(game){
      this.game=game;const scene=this.scene=game.scene,puff=puffTexture();this.dustPool=new Pool(scene,560,false,puff);this.sparkPool=new Pool(scene,220,true,S.softTexture());
      // Tracers.
      const tc=document.createElement('canvas');tc.width=64;tc.height=8;const tg=tc.getContext('2d'),gr=tg.createLinearGradient(0,0,64,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.8,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,1)');tg.fillStyle=gr;tg.fillRect(0,2,64,4);
      const tt=new T.CanvasTexture(tc);this.tracers=[];this.tracerMats=[new T.MeshBasicMaterial({map:tt,color:new T.Color(3,2.5,1.7),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}),new T.MeshBasicMaterial({map:tt,color:new T.Color(3.2,1.3,.5),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false})];
      const tgeo=new T.PlaneGeometry(1,1);tgeo.translate(-.5,0,0);for(let i=0;i<28;i++){const m=new T.Mesh(tgeo,this.tracerMats[0]);m.visible=false;m.frustumCulled=false;m.matrixAutoUpdate=false;scene.add(m);this.tracers.push({mesh:m,active:false});}
      // Bullet marks.
      const dc=document.createElement('canvas');dc.width=dc.height=64;const dg=dc.getContext('2d'),r=S.rng(9);const rg=dg.createRadialGradient(32,32,2,32,32,30);rg.addColorStop(0,'rgba(12,9,7,1)');rg.addColorStop(.22,'rgba(22,17,12,.95)');rg.addColorStop(.4,'rgba(60,48,36,.5)');rg.addColorStop(1,'rgba(60,48,36,0)');dg.fillStyle=rg;dg.fillRect(0,0,64,64);
      dg.strokeStyle='rgba(15,11,8,.7)';for(let i=0;i<7;i++){const a=r()*6.28;dg.lineWidth=.6+r();dg.beginPath();dg.moveTo(32+Math.cos(a)*6,32+Math.sin(a)*6);dg.lineTo(32+Math.cos(a+.2)*(14+r()*12),32+Math.sin(a+.2)*(14+r()*12));dg.stroke();}
      this.decalMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(dc),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});this.decalMat.map.colorSpace=T.SRGBColorSpace;
      this.decals=[];this.decalNext=0;const dgeo=new T.PlaneGeometry(1,1);for(let i=0;i<64;i++){const m=new T.Mesh(dgeo,this.decalMat);m.visible=false;scene.add(m);this.decals.push(m);}
      // Casings.
      this.caseMat=new T.MeshStandardMaterial({color:'#b08c4a',metalness:.9,roughness:.32});this.cases=[];const cg=new T.CylinderGeometry(.0055,.0062,.03,8);
      for(let i=0;i<16;i++){const m=new T.Mesh(cg,this.caseMat);m.visible=false;m.castShadow=true;scene.add(m);this.cases.push({mesh:m,life:0,v:S.v(),spin:S.v()});}this.caseNext=0;
      // Airborne motes around the viewer.
      const mp=[];for(let i=0;i<420;i++)mp.push(S.range(-28,28),S.range(.1,11),S.range(-28,28));const mg=new T.BufferGeometry();mg.setAttribute('position',new T.Float32BufferAttribute(mp,3));
      this.motes=new T.Points(mg,new T.PointsMaterial({color:new T.Color(1.5,1.2,.8),size:.035,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true}));this.motes.frustumCulled=false;scene.add(this.motes);
      this.flashLight=new T.PointLight('#ffc27a',0,14,1.6);scene.add(this.flashLight);this.ambientClock=0;this.rnd=S.rng(1234);
    }
    dustColor(k=1){return [.78*k,.62*k,.44*k];}
    puff(pos,size=.6,count=1,opts={}){
      const c=opts.color||this.dustColor(opts.tone||1),R=this.rnd;
      for(let i=0;i<count;i++)this.dustPool.add({x:pos.x+(R()-.5)*size*.5,y:pos.y+R()*size*.2,z:pos.z+(R()-.5)*size*.5,vx:(opts.vx||0)+(R()-.5)*(opts.spread??.6)+.35,vy:(opts.vy??.25)+R()*.3,vz:(opts.vz||0)+(R()-.5)*(opts.spread??.6),
        size:size*(.7+R()*.6),grow:opts.grow??1.6,r:c[0],g:c[1],b:c[2],a:opts.alpha??.34,life:(opts.life??1.1)*(.7+R()*.6),max:0,rot:R()*6.28,spin:(R()-.5)*1.2,drag:opts.drag??1.2,fadeIn:.12,fadeOut:.7}).max=this.dustPool.items[this.dustPool.items.length-1].life;
    }
    sparks(pos,normal,count=6,color=[3,2.1,1.1],speed=5){
      const R=this.rnd;for(let i=0;i<count;i++){const p=this.sparkPool.add({x:pos.x,y:pos.y,z:pos.z,vx:(normal?normal.x:0)*speed*.6+(R()-.5)*speed,vy:(normal?normal.y:0)*speed*.6+R()*speed*.6,vz:(normal?normal.z:0)*speed*.6+(R()-.5)*speed,size:.035+R()*.03,aspect:.35,r:color[0],g:color[1],b:color[2],a:1,life:.18+R()*.3,max:0,rot:0,gravity:11,streak:.045,fadeOut:.5});p.max=p.life;}
    }
    // Surface hit: chips, a dust kick, a flash of sparks on metal and a mark.
    impact(pos,normal,metal=false,scale=1,mark=true){
      const n=normal||S.v(0,1,0);this.puff(S.v(pos.x+n.x*.08,pos.y+n.y*.08,pos.z+n.z*.08),.42*scale,3,{vx:n.x*1.6,vy:n.y*1.6+.5,vz:n.z*1.6,life:.9,alpha:.4,spread:1.1});
      if(metal)this.sparks(pos,n,7);else this.sparks(pos,n,3,[1.5,1.15,.75],3.2);
      if(mark&&normal){const d=this.decals[this.decalNext++%this.decals.length];d.visible=true;d.position.copy(pos).addScaledVector(n,.012);d.quaternion.setFromUnitVectors(S.v(0,0,1),n);d.rotateZ(this.rnd()*6.28);d.scale.setScalar((.11+this.rnd()*.07)*scale);}
    }
    // Armour hit: sparks and a puff of fabric dust, no mark.
    hitBody(pos,dir){this.sparks(pos,S.v(-dir.x,.3,-dir.z),6,[3,1.9,.9],4);this.puff(pos,.3,2,{color:[.3,.27,.24],alpha:.5,life:.5,vy:.4});}
    tracer(a,b,enemy=false){
      const t=this.tracers.find(x=>!x.active)||this.tracers[0],len=a.distanceTo(b);if(len<.5)return;
      t.active=true;t.a=a.clone();t.dir=b.clone().sub(a).multiplyScalar(1/len);t.len=len;t.head=Math.min(len,enemy?2:1.2);t.speed=enemy?150:330;t.streak=enemy?5.5:9;t.width=enemy?.05:.035;t.mesh.material=this.tracerMats[enemy?1:0];t.mesh.visible=true;
    }
    casing(position,quaternion,ground){
      const c=this.cases[this.caseNext++%this.cases.length];c.mesh.visible=true;c.mesh.position.copy(position);c.mesh.quaternion.copy(quaternion);c.life=2.4;c.ground=ground;
      c.v.set(S.range(1.3,2.3),S.range(.9,1.7),S.range(-.2,.6)).applyQuaternion(quaternion);c.spin.set(S.range(8,20),S.range(4,14),S.range(2,9));
    }
    muzzle(pos){this.flashLight.position.copy(pos);this.flashLight.intensity=38;}
    // Large ground-hugging plume: rotor wash, worm sign, the breach.
    plume(pos,radius,count,opts={}){
      const R=this.rnd;for(let i=0;i<count;i++){const a=R()*6.283,r=radius*(.3+R()*.7),sp=opts.speed??3;this.puff(S.v(pos.x+Math.cos(a)*r,pos.y+R()*(opts.height??.6),pos.z+Math.sin(a)*r),opts.size??3.2,1,{vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:opts.vy??.9,life:opts.life??2.6,alpha:opts.alpha??.3,grow:2.2,drag:.9,spread:.4,tone:opts.tone||1});}
    }
    update(dt,camera){
      const g=this.game,cam=camera.position;
      // Wind-borne sand sheets drifting past at ankle to chest height.
      this.ambientClock-=dt;if(this.ambientClock<=0&&g.state!=='paused'){this.ambientClock=.11;const R=this.rnd,x=cam.x-22+R()*16,z=cam.z+(R()-.5)*60,y=S.groundHeight(x,z);
        this.dustPool.add({x,y:y+.25+R()*1.4,z,vx:4.2+R()*3,vy:.05,vz:1.5+R(),size:2.4+R()*3.6,aspect:2.2,grow:.5,r:.84,g:.68,b:.48,a:.085+R()*.06,life:6+R()*3,max:9,rot:.15,fadeIn:.3,fadeOut:.4}).max=9;}
      this.dustPool.update(dt,camera);this.sparkPool.update(dt,camera);
      for(const t of this.tracers){if(!t.active)continue;t.head+=t.speed*dt;const tail=Math.max(0,t.head-t.streak),head=Math.min(t.head,t.len);if(tail>=t.len){t.active=false;t.mesh.visible=false;continue;}
        const hp=t.a.clone().addScaledVector(t.dir,head),side=new T.Vector3().crossVectors(t.dir,hp.clone().sub(cam)).normalize(),up=new T.Vector3().crossVectors(side,t.dir),l=head-tail,w=t.width*(1+hp.distanceTo(cam)*.035);
        t.mesh.matrix.makeBasis(t.dir.clone().multiplyScalar(l),side.multiplyScalar(w),up).setPosition(hp);t.mesh.matrixWorldNeedsUpdate=true;}
      for(const c of this.cases){if(c.life<=0)continue;c.life-=dt;if(c.life<=0){c.mesh.visible=false;continue;}c.v.y-=9.8*dt;c.mesh.position.addScaledVector(c.v,dt);c.mesh.rotation.x+=c.spin.x*dt;c.mesh.rotation.y+=c.spin.y*dt;c.mesh.rotation.z+=c.spin.z*dt;
        if(c.mesh.position.y<c.ground+.012){c.mesh.position.y=c.ground+.012;if(Math.abs(c.v.y)>1.2)g.audio.casing();c.v.y=Math.abs(c.v.y)*.28;c.v.x*=.5;c.v.z*=.5;c.spin.multiplyScalar(.35);}}
      this.flashLight.intensity=Math.max(0,this.flashLight.intensity-dt*520);
      this.motes.position.set(Math.floor(cam.x/8)*8+((g.time*1.4)%8),0,Math.floor(cam.z/8)*8+((g.time*.5)%8));
    }
    clear(){this.dustPool.clear();this.sparkPool.clear();for(const t of this.tracers){t.active=false;t.mesh.visible=false;}for(const d of this.decals)d.visible=false;for(const c of this.cases){c.life=0;c.mesh.visible=false;}this.flashLight.intensity=0;}
    get counts(){return {dust:this.dustPool.items.length,sparks:this.sparkPool.items.length,decals:this.decals.filter(d=>d.visible).length};}
  };
})(window.Spice,window.THREE);
