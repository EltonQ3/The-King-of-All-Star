'use strict';
/* Bounded effect lifetimes. Shared geometry is never disposed by one particle. */
(function(S,T){
  S.Effects=class{
    constructor(scene){this.scene=scene;this.items=[];this.decals=[];this.maxItems=240;this.shard=new T.IcosahedronGeometry(.022,0);this.caseGeo=new T.CylinderGeometry(.006,.007,.028,8);this.spriteMap=S.softTexture();this.decalGeo=new T.PlaneGeometry(1,1);}
    add(mesh,life,vel=null,options={}){this.scene.add(mesh);this.items.push({mesh,life,max:life,vel,...options});while(this.items.length>this.maxItems)this.dispose(this.items.shift());}
    tracer(a,b,color='#eed2a2'){
      const m=new T.LineBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,toneMapped:false});const g=new T.BufferGeometry().setFromPoints([a,b]);this.add(new T.Line(g,m),.065,null,{ownedGeometry:true});
    }
    dust(pos,size=.6,amount=1,color='#b89b72'){
      for(let i=0;i<amount;i++){
        const mat=new T.SpriteMaterial({map:this.spriteMap,color,transparent:true,opacity:.22,depthWrite:false});const sp=new T.Sprite(mat);sp.position.copy(pos).add(S.v(S.range(-.08,.08),0,S.range(-.08,.08)));sp.scale.setScalar(size*.4);
        this.add(sp,.5+S.rand()*.5,S.v(S.range(-.2,.4),S.range(.1,.5),S.range(-.2,.2)),{smoke:true,size,alpha:.24});
      }
    }
    impact(pos,color='#d4b27e',count=7,normal=null,metal=false){
      for(let i=0;i<count;i++){
        const mat=new T.MeshBasicMaterial({color:metal?'#ffd598':color,toneMapped:!metal,transparent:true});const mesh=new T.Mesh(this.shard,mat);mesh.position.copy(pos);
        const velocity=S.v(S.range(-1.2,1.2),S.range(.3,2),S.range(-1.2,1.2));if(normal)velocity.addScaledVector(normal,1);
        this.add(mesh,.16+S.rand()*.25,velocity,{gravity:5});
      }
      this.dust(pos,.55,2);
      if(normal){
        const mat=new T.MeshBasicMaterial({map:this.spriteMap,color:'#29221a',transparent:true,opacity:.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
        const d=new T.Mesh(this.decalGeo,mat);d.position.copy(pos).addScaledVector(normal,.007);d.quaternion.setFromUnitVectors(S.v(0,0,1),normal);d.rotateZ(S.range(0,6.28));d.scale.setScalar(S.range(.07,.13));this.scene.add(d);this.decals.push(d);
        if(this.decals.length>56){const old=this.decals.shift();this.scene.remove(old);old.material.dispose();}
      }
    }
    casing(position,quaternion,ground=0){
      const mat=new T.MeshStandardMaterial({color:'#a38a5c',metalness:.72,roughness:.34});const m=new T.Mesh(this.caseGeo,mat);m.position.copy(position);m.quaternion.copy(quaternion);
      const v=S.v(S.range(1.2,2.4),S.range(.6,1.4),S.range(.3,1.0)).applyQuaternion(quaternion);this.add(m,1.8,v,{gravity:8,spin:S.v(8,14,3),ground,bounced:false});
    }
    dispose(i){this.scene.remove(i.mesh);if(i.ownedGeometry)i.mesh.geometry?.dispose();i.mesh.material?.dispose();}
    update(dt){
      for(let i=this.items.length-1;i>=0;i--){const f=this.items[i];f.life-=dt;if(f.life<=0){this.dispose(f);this.items.splice(i,1);continue;}
        if(f.vel){f.vel.y-=(f.gravity||0)*dt;f.mesh.position.addScaledVector(f.vel,dt);}
        if(f.spin)f.mesh.rotation.set(f.mesh.rotation.x+f.spin.x*dt,f.mesh.rotation.y+f.spin.y*dt,f.mesh.rotation.z+f.spin.z*dt);
        if(f.ground!==undefined&&f.mesh.position.y<f.ground+.014){f.mesh.position.y=f.ground+.014;f.vel.y=Math.abs(f.vel.y)*.23;f.vel.x*=.55;f.vel.z*=.55;if(f.spin)f.spin.multiplyScalar(.4);}
        const fade=f.life/f.max;
        if(f.smoke){f.mesh.material.opacity=(f.alpha||.2)*Math.sin(fade*Math.PI);f.mesh.scale.setScalar(f.size*(1.6-fade));}
        else if(f.mesh.material.transparent)f.mesh.material.opacity=Math.min(1,fade*3);
      }
    }
    clear(){this.items.forEach(i=>this.dispose(i));this.items=[];for(const d of this.decals){this.scene.remove(d);d.material.dispose();}this.decals=[];}
  };
})(window.Spice,window.THREE);
