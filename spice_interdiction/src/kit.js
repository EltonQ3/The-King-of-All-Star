'use strict';
/* Construction kit: reusable outpost pieces written into a Batch. Every function
 * takes world coordinates (y is the base unless noted) and adds only geometry;
 * collision and gameplay meaning are assigned by world.js. */
(function(S,T){
  const K=S.Kit={};
  const C=K.C={dark:'#383c3d',black:'#17191b',steel:'#8a8f90',gun:'#565b5c',rust:'#7a4526',ochre:'#a8742c',sandPaint:'#9a8f78',olive:'#5f5d47',hazard:'#c9892a',brass:'#9a7a44',
    concrete:'#c4b094',concreteDark:'#9e8b72',concretePale:'#d6c5a8',cloth:'#74694f',rubber:'#1e2022',amber:'#ffb04a',red:'#ff5236',cyan:'#8fd8ff',white:'#fff1d6'};
  const kit=()=>S.mats.kit,con=()=>S.mats.concrete,M=S.SURF;

  // Decal placed in the batch's current local frame.
  K.decal=function(b,entry,x,y,z,nx,ny,nz,width,roll=0){
    const p=new T.Vector3(x,y,z).applyMatrix4(b.m),n=new T.Vector3(nx,ny,nz).transformDirection(b.m);S.insignia.place(entry,p.x,p.y,p.z,n.x,n.y,n.z,width,roll);
  };

  // Spice container: framed, ribbed, latched. w along local x.
  K.crate=function(b,x,y,z,w=1.6,h=1.1,d=1.1,ry=0,color=C.ochre,mark=0){
    const m=kit();b.push(x,y,z,0,ry,0);
    b.tint(color).cbox(m,0,h/2,0,w,h,d,.03);
    b.tint(C.dark);
    for(const sx of [-1,1])for(const sz of [-1,1])b.cbox(m,sx*(w/2-.035),h/2,sz*(d/2-.035),.1,h+.03,.1,.018);
    for(const sy of [.05,h-.05]){for(const sz of [-1,1])b.cbox(m,0,sy,sz*(d/2-.03),w-.1,.09,.09,.015);for(const sx of [-1,1])b.cbox(m,sx*(w/2-.03),sy,0,.09,.09,d-.1,.015);}
    b.tint(color);const n=Math.max(2,Math.round(w/.42));
    for(let i=0;i<n;i++)for(const sz of [-1,1])b.cbox(m,-w/2+(i+.5)*w/n,h/2,sz*(d/2+.008),.07,h-.26,.035,.012);
    b.tint(C.steel,M.metal).cbox(m,w*.22,h*.56,d/2+.03,.17,.11,.05,.012).cbox(m,-w*.22,h*.56,d/2+.03,.17,.11,.05,.012);
    b.tint(C.black,M.polymer).cbox(m,0,h+.012,0,w*.5,.03,d*.4,.01);
    if(mark)K.decal(b,S.insignia.glyphs(mark,3,'#2a2118'),0,h*.5,d/2+.03,0,0,1,Math.min(.7,w*.42));
    b.tint('#ffffff',0).pop();
  };
  K.barrel=function(b,x,y,z,color=C.dark,tilt=0){
    const m=kit();b.push(x,y,z,tilt,0,0);
    b.tint(color).add(m,S.geo.lathe([[0,0],[.3,0],[.33,.03],[.33,.3],[.345,.32],[.345,.36],[.33,.38],[.33,.62],[.345,.64],[.345,.68],[.33,.7],[.33,.97],[.3,1],[.1,1],[.1,.98],[0,.98]],18,'barrel'));
    b.tint(C.brass,M.metal).cyl(m,.16,1.01,.08,.045,.04,10);b.tint('#ffffff',0).pop();
  };
  // Low angular barrier used as cover. Length along local x.
  K.barrier=function(b,x,y,z,len=3.6,ry=0,h=1.15){
    b.push(x,y,z,0,ry,0);b.tint(C.concreteDark);
    b.add(con(),S.geo.prism([[-.52,0],[.52,0],[.5,.2],[.22,.5],[.2,h],[-.2,h],[-.22,.5],[-.5,.2]],len,'barrier'+len+h),0,0,0,0,Math.PI/2,0);
    b.tint(C.dark).cbox(kit(),0,h+.03,0,len*.94,.07,.34,.02);
    for(const s of [-1,1]){b.tint(C.gun,M.metal).cbox(kit(),s*(len/2-.25),h*.55,0,.07,h*.7,.46,.015);}
    b.tint('#ffffff',0).pop();
  };
  // Vertical spice silo with ribs, bands, cap, ladder and outlet.
  K.silo=function(b,x,y,z,r=2.6,h=9,color=C.sandPaint,seed=1){
    const m=kit();b.push(x,y,z,0,seed*1.9,0);
    b.tint(C.concreteDark).add(con(),S.geo.cyl(r+.45,.6,28,r+.3),0,.3,0);
    b.tint(color).cyl(m,0,.6+h/2,0,r,h,32);
    b.tint(C.dark);for(const t of [.02,.34,.66,.985])b.cyl(m,0,.6+h*t,0,r+.07,.16,32);
    b.tint(color);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;b.push(Math.cos(a)*(r+.03),.6+h/2,Math.sin(a)*(r+.03),0,-a,0).cbox(m,0,0,0,.09,h*.96,.14,.02).pop();}
    b.tint(C.dark).add(m,S.geo.lathe([[r+.05,0],[r*.82,.5],[r*.4,1.15],[.55,1.35],[.55,1.75],[.7,1.8],[.7,1.95],[0,1.95]],28,'silocap'+r),0,.6+h,0);
    b.tint(C.brass,M.metal).cyl(m,0,.6+h+2.05,0,.5,.12,12);
    // Caged ladder.
    const lx=r+.2;b.tint(C.steel,M.metal);
    for(const s of [-1,1])b.beam(m,[lx,.6,s*.22],[lx,.6+h,s*.22],.022,6);
    for(let yy=.9;yy<h+.5;yy+=.38)b.beam(m,[lx,yy,-.22],[lx,yy,.22],.016,5);
    for(let yy=3;yy<h+.4;yy+=1.1)b.add(m,S.geo.torus(.36,.016,5,14,Math.PI),lx+.02,.6+yy-.6,0,Math.PI/2,0,-Math.PI/2);
    // Outlet pipe and valve wheel.
    b.tint(C.gun,M.metal).beam(m,[-r*.6,.6+h*.2,r*.82],[-r*.6,.6+h*.2,r+.7],.2,12).beam(m,[-r*.6,.6+h*.2,r+.7],[-r*.6,.35,r+.7],.2,12);
    b.sphere(m,-r*.6,.6+h*.2,r+.7,.24);b.tint(C.red).add(m,S.geo.torus(.19,.022,6,16),-r*.6,.6+h*.2,r+1.0);
    b.tint(C.black,M.polymer).cbox(m,-r*.6,.2,r+.7,.6,.4,.6,.04);
    K.decal(b,S.insignia.glyphs(seed*7+2,4,'#30261b'),0,.6+h*.74,r+.012,0,0,1,r*1.05);
    K.decal(b,S.insignia.text(String(seed).padStart(2,'0'),'#30261b'),0,.6+h*.52,r+.012,0,0,1,r*.5);
    b.tint('#ffffff',0).pop();
  };
  // Horizontal pressure tank on saddles; long axis along local x.
  K.tank=function(b,x,y,z,r=1,len=4.2,ry=0,color=C.gun){
    const m=kit();b.push(x,y,z,0,ry,0);const cy=r+.45;
    b.tint(color).cyl(m,0,cy,0,r,len,22,'x');b.sphere(m,len/2,cy,0,r,.34,1,1,16,10);b.sphere(m,-len/2,cy,0,r,.34,1,1,16,10);
    b.tint(C.dark);for(const t of [-.34,0,.34])b.cyl(m,len*t,cy,0,r+.035,.1,22,'x');
    b.tint(C.concreteDark);for(const s of [-1,1])b.cbox(con(),s*len*.3,.3,0,.5,.6,r*1.7,.04);
    b.tint(C.steel,M.metal).cyl(m,len*.18,cy+r+.12,0,.2,.26,12).cyl(m,-len*.25,cy+r+.08,0,.09,.2,8);
    b.tint(C.red).add(m,S.geo.torus(.13,.018,6,14),len*.18,cy+r+.3,0,Math.PI/2);
    b.tint('#ffffff',0).pop();
  };
  // Pipe through points with flanges at joints and saddle supports.
  K.pipe=function(b,pts,r=.16,color=C.gun,support=true){
    const m=kit();b.tint(color,M.paint);
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i],c=pts[i+1];b.beam(m,a,c,r,12);b.sphere(m,c[0],c[1],c[2],r*1.04,1,1,1,10,8);
      const len=Math.hypot(c[0]-a[0],c[1]-a[1],c[2]-a[2]),n=Math.floor(len/3.2);
      for(let k=1;k<=n;k++){const t=k/(n+1),p=[S.lerp(a[0],c[0],t),S.lerp(a[1],c[1],t),S.lerp(a[2],c[2],t)],q=[S.lerp(a[0],c[0],t+.02),S.lerp(a[1],c[1],t+.02),S.lerp(a[2],c[2],t+.02)];
        b.tint(C.dark).beam(m,p,q,r*1.3,12).tint(color);
        if(support&&Math.abs(c[1]-a[1])<.01){const g=S.groundHeight(p[0],p[2]);if(p[1]-g>.3&&p[1]-g<4)b.tint(C.dark).cbox(m,p[0],(p[1]+g)/2-r*.5,p[2],.1,p[1]-g-r,.1,.02).tint(color);}
      }
    }
    b.sphere(m,pts[0][0],pts[0][1],pts[0][2],r*1.04,1,1,1,10,8);b.tint('#ffffff',0);
  };
  // Steel pipe rack: portal frames carrying parallel lines. Runs along local z.
  K.pipeRack=function(b,x,y,z,len=10,ry=0,h=3.4,lines=3){
    const m=kit();b.push(x,y,z,0,ry,0);b.tint(C.dark);
    const n=Math.max(2,Math.round(len/3.3)+1);
    for(let i=0;i<n;i++){const zz=-len/2+i*len/(n-1);
      for(const s of [-1,1])b.cbox(m,s*1.1,h/2,zz,.16,h,.16,.03);
      b.cbox(m,0,h,zz,2.5,.16,.16,.03).cbox(m,0,h*.62,zz,2.4,.12,.12,.02);
      b.beam(m,[-1.1,.4,zz],[1.1,h*.62,zz],.035,6);
    }
    const cols=[C.gun,C.rust,C.sandPaint,C.gun];
    for(let k=0;k<lines;k++){const px=-.75+k*1.5/Math.max(1,lines-1),rr=k%2?.13:.19;b.tint(cols[k%4]).cyl(m,px,h+.08+rr,0,rr,len+.6,12,'z');
      b.tint(C.dark);for(let i=1;i<n;i++)b.cyl(m,px,h+.08+rr,-len/2+(i-.5)*len/(n-1),rr*1.28,.07,12,'z');}
    b.tint(C.gun).cyl(m,-.5,h*.62+.19,0,.11,len+.3,10,'z').tint(C.black,M.polymer).cyl(m,.45,h*.62+.14,0,.06,len+.3,8,'z').cyl(m,.62,h*.62+.14,0,.045,len+.3,8,'z');
    b.tint('#ffffff',0).pop();
  };
  // Generator / compressor skid.
  K.generator=function(b,x,y,z,ry=0,color=C.olive){
    const m=kit();b.push(x,y,z,0,ry,0);
    b.tint(C.dark).cbox(m,0,.12,0,2.9,.24,1.5,.03);
    b.tint(color).cbox(m,-.35,.95,0,2.0,1.42,1.3,.06);
    b.tint(C.black,M.polymer);for(let i=0;i<9;i++)b.cbox(m,-1.05+i*.175,.95,.66,.09,.95,.03,.01);
    b.tint(C.gun).cbox(m,1.05,.7,0,.72,.92,1.1,.05).tint(C.steel,M.metal).cyl(m,1.05,1.5,.2,.1,.75,10).cyl(m,1.05,1.9,.2,.14,.09,10);
    b.tint(C.black,M.polymer).cbox(m,1.05,.95,-.57,.5,.4,.04,.01).tint(C.amber,0,.9).cbox(m,.92,1.02,-.6,.09,.05,.02,.005).tint(C.cyan,0,.7).cbox(m,1.08,1.02,-.6,.09,.05,.02,.005);
    b.tint(C.steel,M.metal);for(const s of [-1,1])b.cyl(m,-.35,1.69,s*.4,.11,.06,10);
    b.tint(C.dark);for(const sx of [-1.3,1.3])for(const sz of [-.6,.6])b.cbox(m,sx,.3,sz,.1,.6,.1,.02);
    K.decal(b,S.insignia.hazard(),-.35,.45,.662,0,0,1,1.3);K.decal(b,S.insignia.glyphs(5,3,'#d8c9a8'),-.35,1.45,-.662,0,0,-1,.9);
    b.tint('#ffffff',0).pop();
  };
  // Marker lamp on a pole; the head glows. Returns the head position.
  K.lamp=function(b,x,y,z,h=3.6,color=C.amber,arm=0){
    const m=kit();b.tint(C.dark).cyl(m,x,y+h/2,z,.055,h,8,'y',.075).cbox(m,x,y+.09,z,.3,.18,.3,.04);
    if(arm){b.beam(m,[x,y+h,z],[x+arm,y+h+.12,z],.04,6);}
    b.cbox(m,x+arm,y+h+.08,z,.34,.14,.26,.03).tint(color,0,1).cbox(m,x+arm,y+h-.005,z,.26,.03,.18,.008).tint('#ffffff',0);
    return new T.Vector3(x+arm,y+h,z);
  };
  // Lattice mast with dishes and whip aerials.
  K.mast=function(b,x,y,z,h=14,seed=1){
    const m=kit(),w=.55,r=S.rng(seed*31+7);b.push(x,y,z,0,seed,0);b.tint(C.concreteDark).cbox(con(),0,.25,0,1.6,.5,1.6,.05);b.tint(C.dark);
    const leg=[[-1,-1],[1,-1],[1,1],[-1,1]];
    for(const [sx,sz] of leg)b.beam(m,[sx*w,.5,sz*w],[sx*w*.3,h,sz*w*.3],.035,6);
    for(let yy=.5,i=0;yy<h-.5;yy+=1.25,i++){const s0=w*(1-.7*(yy-.5)/h),s1=w*(1-.7*(yy+.75)/h);
      for(let k=0;k<4;k++){const a=leg[k],c=leg[(k+1)%4];b.beam(m,[a[0]*s0,yy,a[1]*s0],[c[0]*s0,yy,c[1]*s0],.018,5);b.beam(m,[a[0]*s0,yy,a[1]*s0],[c[0]*s1,yy+1.25,c[1]*s1],.014,5);}}
    b.tint(C.gun).cyl(m,0,h+.9,0,.03,1.8,6).tint(C.red,0,1).sphere(m,0,h+1.82,0,.06);
    b.tint(C.sandPaint);for(let i=0;i<3;i++){const yy=h*(.55+.14*i),a=r()*6.28;b.push(0,yy,0,0,a,0).add(m,S.geo.lathe([[0,0],[.25,.04],[.46,.14],[.55,.26],[.54,.27],[.44,.16],[.24,.07],[0,.04]],16,'dish'),.42,0,0,0,0,-Math.PI/2).tint(C.dark).beam(m,[.42,0,0],[.12,0,0],.03,6).tint(C.sandPaint).pop();}
    b.tint(C.gun);for(let i=0;i<3;i++){b.cbox(m,(r()-.5)*.5,h*(.3+.12*i),w*.75,.34,.5,.16,.02);}
    b.tint('#ffffff',0).pop();
  };
  // Open steel stairs + landing rail. Rises along local +x from y to y+h.
  K.ladder=function(b,x,y0,y1,z,nx=1,nz=0){
    const m=kit(),px=-nz,pz=nx;b.tint(C.steel,M.metal);
    for(const s of [-1,1])b.beam(m,[x+px*.22*s,y0,z+pz*.22*s],[x+px*.22*s,y1,z+pz*.22*s],.022,6);
    for(let yy=y0+.3;yy<y1;yy+=.36)b.beam(m,[x-px*.22,yy,z-pz*.22],[x+px*.22,yy,z+pz*.22],.016,5);
    b.tint('#ffffff',0);
  };
  K.railing=function(b,ax,az,bx,bz,y,h=1.05){
    const m=kit(),len=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(len/1.5));b.tint(C.dark);
    for(let i=0;i<=n;i++){const t=i/n,x=S.lerp(ax,bx,t),z=S.lerp(az,bz,t);b.beam(m,[x,y,z],[x,y+h,z],.025,6);}
    b.beam(m,[ax,y+h,az],[bx,y+h,bz],.03,6).beam(m,[ax,y+h*.52,az],[bx,y+h*.52,bz],.02,6);b.tint('#ffffff',0);
  };
  // Sagging cable between two points.
  K.cable=function(b,a,c,sag=.5,r=.018,color=C.black){
    const m=kit(),n=8;b.tint(color,M.polymer);let p=a;
    for(let i=1;i<=n;i++){const t=i/n,q=[S.lerp(a[0],c[0],t),S.lerp(a[1],c[1],t)-Math.sin(t*Math.PI)*sag,S.lerp(a[2],c[2],t)];b.beam(m,p,q,r,5);p=q;}
    b.tint('#ffffff',0);
  };
  // Windtrap: a tilted louvre bank that strips moisture from the air.
  K.windtrap=function(b,x,y,z,ry=0,w=7,h=6.5){
    const m=kit();b.push(x,y,z,0,ry,0);b.tint(C.concreteDark).cbox(con(),0,.35,0,w+1,.7,2.6,.08);
    b.tint(C.dark);for(const s of [-1,1]){b.cbox(m,s*w/2,.7+h/2,0,.3,h,1.5,.05).beam(m,[s*w/2,.7+h*.75,-.5],[s*w/2,.7,-2.2],.07,8);}
    b.cbox(m,0,.7+h+.1,0,w+.5,.3,1.7,.06);
    b.tint(C.sandPaint);for(let i=0;i<15;i++)b.cbox(m,0,1.1+i*(h-.5)/15,0,w-.25,.05,1.25,.015,.5,0,0);
    b.tint(C.gun).cyl(m,0,.9,.9,.16,w-.4,10,'x').beam(m,[w*.3,.9,.9],[w*.3,.3,1.5],.12,8);
    b.tint(C.black,M.polymer).cbox(m,-w*.3,.55,1.5,.9,.7,.7,.05);
    b.tint('#ffffff',0).pop();
  };
  // Small tracked utility crawler.
  K.crawler=function(b,x,y,z,ry=0,color=C.olive){
    const m=kit();b.push(x,y,z,0,ry,0);
    for(const s of [-1,1]){b.tint(C.rubber,M.polymer).cbox(m,s*.95,.42,0,.46,.84,4.1,.2);b.tint(C.gun,M.metal);for(let i=0;i<5;i++)b.cyl(m,s*1.2,.4,-1.5+i*.75,.27,.07,12,'x');
      b.tint(C.black,M.polymer);for(let i=0;i<17;i++)b.cbox(m,s*.95,.86,-1.92+i*.24,.5,.04,.12,.01);}
    b.tint(color).cbox(m,0,.95,.25,1.7,.75,3.4,.08).cbox(m,0,1.62,-.75,1.5,.72,1.3,.07);
    b.tint(C.black,M.polymer).cbox(m,0,1.68,-1.41,1.25,.42,.03,.01).cbox(m,.76,1.68,-.75,.03,.42,.95,.01).cbox(m,-.76,1.68,-.75,.03,.42,.95,.01);
    b.tint(C.gun).cbox(m,0,1.36,1.0,1.55,.1,1.7,.03);for(const s of [-1,1])b.cbox(m,s*.74,1.56,1.0,.06,.34,1.7,.02);
    b.tint(C.amber,0,.8).cbox(m,.55,1.1,-1.46,.22,.1,.03,.01).cbox(m,-.55,1.1,-1.46,.22,.1,.03,.01);
    b.tint(C.steel,M.metal).cyl(m,.6,2.3,-.3,.03,.9,6).beam(m,[-.5,1.36,1.5],[-.5,2.0,1.7],.05,8);
    K.decal(b,S.insignia.glyphs(9,2,'#d8c9a8'),.855,1.0,.5,1,0,0,.7);
    b.tint('#ffffff',0).pop();
  };
  // Stretched cloth canopy on poles (static sag; the cloth class carries a weave).
  K.awning=function(b,x,y,z,w=6,d=4,h=3.2,ry=0,color=C.cloth){
    const m=kit();b.push(x,y,z,0,ry,0);b.tint(C.dark);
    for(const sx of [-1,1])for(const sz of [-1,1])b.cyl(m,sx*w/2,h/2-(sz>0?.2:0),sz*d/2,.045,h-(sz>0?.4:0),8);
    b.tint(color,M.cloth);const nx=10,nz=6;
    b.add(m,S.geo.custom(`awn${w},${d}`,()=>{const g=new T.PlaneGeometry(w+.5,d+.5,nx,nz);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const u=p.getX(i)/(w/2),v=p.getZ(i)/(d/2);p.setY(i,-.28*(1-u*u)*(1-v*v)-.2*(v+1)/2+.02*Math.sin(u*9)*Math.cos(v*5));}g.computeVertexNormals();return g;}),0,h,0);
    b.tint(C.black,M.polymer);for(const sx of [-1,1])b.beam(m,[sx*w/2,h-.4,d/2],[sx*(w/2+.9),.05,d/2+1.4],.012,4);
    b.tint('#ffffff',0).pop();
  };
  // Interactive console body: pedestal, hooded screen recess, keys. Faces local +z.
  K.console=function(b,x,y,z,ry=0,color=C.gun){
    const m=kit();b.push(x,y,z,0,ry,0);
    b.tint(C.dark).cbox(m,0,.05,0,.9,.1,.6,.02);b.tint(color).cbox(m,0,.55,-.05,.62,.9,.36,.04);
    b.tint(color).cbox(m,0,1.22,-.02,.86,.52,.3,.04,-.32,0,0);
    b.tint(C.black,M.polymer).cbox(m,0,1.25,.115,.7,.36,.04,.01,-.32,0,0);
    b.tint(C.dark).cbox(m,0,.98,.2,.74,.05,.3,.015,.35,0,0);
    b.tint(C.black,M.polymer);for(let i=0;i<5;i++)for(let j=0;j<2;j++)b.cbox(m,-.26+i*.13,1.005+j*.028,.17+j*.075,.09,.02,.05,.006,.35,0,0);
    b.tint(C.amber,0,.8).cbox(m,.3,.78,.135,.05,.05,.02,.006);
    b.tint(C.black,M.polymer).beam(m,[.2,.1,-.2],[.2,.1,-.9],.03,6);
    b.tint('#ffffff',0).pop();
  };
  // Wall-mounted junction / relay cabinet. Faces local +z.
  K.cabinet=function(b,x,y,z,ry=0,w=1.1,h=1.7,color=C.rust){
    const m=kit();b.push(x,y,z,0,ry,0);
    b.tint(color).cbox(m,0,h/2,.16,w,h,.34,.035).tint(C.dark).cbox(m,0,h/2,.335,w*.84,h*.86,.03,.012);
    b.tint(C.steel,M.metal).cbox(m,w*.33,h*.5,.36,.05,.24,.04,.01);for(const sy of [.12,.88])b.cyl(m,-w*.4,h*sy,.34,.03,.05,8,'z');
    b.tint(C.gun);for(let i=0;i<3;i++)b.beam(m,[-w*.3+i*w*.3,h,.16],[-w*.3+i*w*.3,h+1.6,.1],.035,6);
    K.decal(b,S.insignia.hazard(),0,h*.2,.352,0,0,1,w*.7);
    b.tint('#ffffff',0).pop();
  };
  // Concrete wall run between two axis-aligned points with battered base, coping and pilasters.
  K.wall=function(b,x0,z0,x1,z1,h=3.4,t=1.4,y=0){
    const along=Math.abs(x1-x0)>Math.abs(z1-z0),len=along?Math.abs(x1-x0):Math.abs(z1-z0),cx=(x0+x1)/2,cz=(z0+z1)/2;
    b.push(cx,y,cz,0,along?0:Math.PI/2,0);b.tint(C.concrete);
    b.add(con(),S.geo.prism([[-t/2-.28,-.6],[t/2+.28,-.6],[t/2+.28,.25],[t/2,.9],[t/2,h],[-t/2,h],[-t/2,.9],[-t/2-.28,.25]],len,'wall'+h+t+len.toFixed(2)),0,0,0,0,Math.PI/2,0);
    b.tint(C.concreteDark).cbox(con(),0,h+.14,0,len,.28,t+.36,.06);
    const n=Math.max(1,Math.round(len/5));for(let i=0;i<=n;i++){const px=-len/2+i*len/n;if(i===0||i===n)continue;for(const s of [-1,1])b.cbox(con(),px,h*.52,s*(t/2+.11),.7,h*.96,.22,.05);}
    b.tint('#ffffff',0).pop();
  };
  // Monumental gate pylon pair + lintel across a gap. Opening along local x of width w.
  K.portal=function(b,x,y,z,w=6,h=5,ry=0,depth=2.2){
    b.push(x,y,z,0,ry,0);b.tint(C.concrete);
    for(const s of [-1,1]){b.add(con(),S.geo.prism([[-1.25,0],[1.25,0],[.95,h+1.6],[-.95,h+1.6]],depth,'pylon'+h+depth),s*(w/2+1.2),0,0);
      b.tint(C.concreteDark).cbox(con(),s*(w/2+1.2),h+1.75,0,2.3,.34,depth+.3,.07).tint(C.concrete);
      b.tint(C.amber,0,.9).cbox(kit(),s*(w/2+.2),h*.62,depth/2+.02,.1,.9,.05,.01).tint(C.concrete);}
    b.cbox(con(),0,h+.65,0,w+.5,1.3,depth*.82,.08).tint(C.concreteDark).cbox(con(),0,h+.02,0,w+.3,.16,depth*.9,.04);
    b.tint('#ffffff',0).pop();
  };
  // Scatter of crates as a stack; returns its footprint [w,d,h].
  K.stack=function(b,x,y,z,ry=0,seed=1){
    const r=S.rng(seed*53+3),cols=[C.ochre,C.sandPaint,C.olive,C.rust,C.gun];b.push(x,y,z,0,ry,0);
    K.crate(b,-.85,0,0,1.6,1.1,1.15,(r()-.5)*.08,cols[Math.floor(r()*5)],seed);K.crate(b,.85,0,.05,1.6,1.1,1.15,(r()-.5)*.08,cols[Math.floor(r()*5)],seed+1);
    if(r()>.25)K.crate(b,-.4,1.1,0,1.6,1.1,1.15,(r()-.5)*.2,cols[Math.floor(r()*5)],seed+2);
    if(r()>.5)K.crate(b,1.95,0,1.25,1.1,.8,1.1,r()*1.2,cols[Math.floor(r()*5)],0);
    if(r()>.4){K.barrel(b,-1.5,0,1.15,C.dark);K.barrel(b,-.75,0,1.25,C.rust);}
    b.pop();return [3.4,1.3,2.2];
  };
})(window.Spice,window.THREE);
