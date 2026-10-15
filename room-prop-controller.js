import * as T from './assets/vendor/three.module.min.js';
import {artifactText} from './room-artifact.js?v=props-2';

// 近景物件的共用控制：點選展品時鏡頭靠近、物件本身打開；可再「放大細看」到某一區塊，← → 切換，「看全部」退回。
// 一般房間（region-room）與星港展廳（harbor-room）共用，房間只需提供鏡頭移動與重繪。
export function createPropController({host,camera,props,exhibits,move,draw,quiet,state}){
 let zoom=-1,tween=0,sr=null;
 const nav=document.createElement('div');nav.className='room-prop-nav';nav.hidden=true;nav.setAttribute('role','group');nav.setAttribute('aria-label','近看');host.append(nav);
 nav.innerHTML='<button type="button" data-prop="prev" aria-label="上一個區塊">←</button><button type="button" data-prop="zoom"></button><button type="button" data-prop="next" aria-label="下一個區塊">→</button>';
 const [prev,toggle,next]=nav.querySelectorAll('button');
 const narrow=()=>host.clientWidth/host.clientHeight<1;
 function view(f,k){
  const aspect=host.clientWidth/host.clientHeight,tan=Math.tan(T.MathUtils.degToRad(camera.fov/2))*2,d=Math.max(f.w/(tan*aspect),f.h/tan)*k;
  const p=f.c.clone().addScaledVector(f.n,d);if(f.x)p.x+=f.x;return {position:p.toArray(),target:f.c.toArray()};
 }
 function setNav(){
  const prop=props[state.selection];if(!prop){nav.hidden=true;return;}nav.hidden=false;const n=prop.frames.length;
  prev.hidden=next.hidden=zoom<0;prev.disabled=zoom<=0;next.disabled=zoom>=n-1;
  toggle.textContent=zoom<0?'放大細看':`${prop.frames[zoom].label}　${zoom+1} / ${n}　· 看全部`;
 }
 function animate(prop,to,duration){
  cancelAnimationFrame(tween);const from=prop.open,started=performance.now();
  return new Promise(resolve=>{const frame=now=>{const t=quiet()?1:Math.min(1,(now-started)/duration);prop.open=from+(to-from)*t;prop.setOpen(prop.open);draw();if(t<1&&state.active)tween=requestAnimationFrame(frame);else{prop.open=to;prop.setOpen(to);draw();resolve();}};tween=requestAnimationFrame(frame);});
 }
 async function focus(){
  const prop=props[state.selection];if(!prop)return;setNav();
  const f=zoom<0?prop.whole:prop.frames[zoom],v=view(f,zoom<0?(f.k||1.1):(f.k||1.08));
  await move(v.position,v.target,850);
  if(props[state.selection]===prop&&prop.open<1)await animate(prop,1,prop.openDuration||1000);
 }
 function close(except){
  cancelAnimationFrame(tween);if(sr){sr.remove();sr=null;}
  Object.entries(props).forEach(([i,p])=>{if(Number(i)!==except&&p.open>0){p.open=0;p.setOpen(0);}});zoom=-1;nav.hidden=true;draw();
 }
 async function open(index){close(index);zoom=narrow()?0:-1;sr=artifactText(exhibits[index].artifact);if(sr)host.append(sr);await focus();}
 // 點到物件本身：放大到被點的那一區；回傳 true 代表已處理。
 function click(raycaster){
  const prop=props[state.selection];if(!prop)return false;const h=raycaster.intersectObject(prop.group,true)[0];if(!h)return false;
  let best=0,bd=Infinity;prop.frames.forEach((f,i)=>{const d=f.c.distanceTo(h.point);if(d<bd){bd=d;best=i;}});if(zoom!==best){zoom=best;focus();}return true;
 }
 nav.addEventListener('click',event=>{const b=event.target.closest('[data-prop]');if(!b||state.busy||!props[state.selection])return;const n=props[state.selection].frames.length;
  if(b.dataset.prop==='zoom')zoom=zoom<0?0:-1;else zoom=T.MathUtils.clamp(zoom+(b.dataset.prop==='next'?1:-1),0,n-1);focus();});
 Object.values(props).forEach(p=>{p.open=0;p.setOpen(0);});
 return {open,close,click,has:i=>!!props[i]};
}
