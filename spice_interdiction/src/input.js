'use strict';
(function(S){
  S.Input=class{
    constructor(canvas){
      this.canvas=canvas;this.keys=new Set();this.actions=new Set();this.dx=0;this.dy=0;this.fire=false;this.ads=false;this.locked=false;this.dragging=false;this.sensitivity=1;this.touch=(navigator.maxTouchPoints>0)&&matchMedia('(pointer:coarse)').matches;this.stick={x:0,y:0};this.active=false;
      addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)&&this.active)e.preventDefault();if(!e.repeat)this.actions.add(e.code);this.keys.add(e.code);});
      addEventListener('keyup',e=>this.keys.delete(e.code));
      addEventListener('blur',()=>this.clear());
      document.addEventListener('pointerlockchange',()=>{const was=this.locked;this.locked=document.pointerLockElement===canvas;if(was&&!this.locked&&this.onUnlock)this.onUnlock();});
      document.addEventListener('mousemove',e=>{if(this.active&&(this.locked||this.dragging)){this.dx+=e.movementX;this.dy+=e.movementY;}});
      canvas.addEventListener('mousedown',e=>{if(!this.active)return;if(e.button===0){this.fire=true;if(!this.locked)this.dragging=true;}if(e.button===2)this.ads=true;});
      addEventListener('mouseup',e=>{if(e.button===0){this.fire=false;this.dragging=false;}if(e.button===2)this.ads=false;});
      canvas.addEventListener('contextmenu',e=>e.preventDefault());
      this.installTouch();
    }
    requestLock(){if(this.touch)return;try{const p=this.canvas.requestPointerLock?.();if(p&&p.catch)p.catch(()=>{});}catch{}}
    clear(){this.keys.clear();this.actions.clear();this.fire=false;this.ads=false;this.dragging=false;this.dx=this.dy=0;this.stick.x=this.stick.y=0;}
    consume(code){const yes=this.actions.has(code);this.actions.delete(code);return yes;}
    installTouch(){
      const controls=document.getElementById('touch');controls.hidden=!this.touch;
      const pad=document.getElementById('move-pad'),nub=document.getElementById('move-nub');let id=null,origin={x:0,y:0};
      pad.addEventListener('pointerdown',e=>{id=e.pointerId;pad.setPointerCapture(id);origin={x:e.clientX,y:e.clientY};});
      pad.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;let x=e.clientX-origin.x,y=e.clientY-origin.y,d=Math.max(1,Math.hypot(x,y)/45);x/=d;y/=d;this.stick.x=x/45;this.stick.y=-y/45;nub.style.transform=`translate(${x}px,${y}px)`;});
      const end=e=>{if(e.pointerId!==id)return;id=null;this.stick.x=this.stick.y=0;nub.style.transform='';};pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
      let look=null,last=null;
      this.canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&this.active){look=e.pointerId;last=[e.clientX,e.clientY];this.canvas.setPointerCapture(look);}});
      this.canvas.addEventListener('pointermove',e=>{if(e.pointerId===look&&last){this.dx+=(e.clientX-last[0])*1.6;this.dy+=(e.clientY-last[1])*1.6;last=[e.clientX,e.clientY];}});
      const endLook=e=>{if(e.pointerId===look){look=null;last=null;}};this.canvas.addEventListener('pointerup',endLook);this.canvas.addEventListener('pointercancel',endLook);
      for(const el of controls.querySelectorAll('button[data-action]')){
        const action=el.dataset.action;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);if(action==='fire')this.fire=true;else if(action==='ads')this.ads=!this.ads;else this.actions.add(action==='reload'?'KeyR':action==='pause'?'Escape':'Space');});
        const stop=()=>{if(action==='fire')this.fire=false;};el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);
      }
    }
  };
})(window.Spice);
