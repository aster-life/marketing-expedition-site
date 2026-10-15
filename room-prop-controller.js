import * as T from './assets/vendor/three.module.min.js';
import {artifactText} from './room-artifact.js?v=props-2';

// 近景物件的共用控制：點選展品時鏡頭靠近、物件本身打開；可再「放大細看」到某一區塊，← → 切換，「看全部」退回。
// 一般房間（region-room）與星港展廳（harbor-room）共用，房間只需提供鏡頭移動與重繪。
export function createPropController({host,scene,camera,props,exhibits,move,draw,quiet,state,refreshShadows=()=>{}}){
 let zoom=-1,tween=0,sr=null;
 // 閱讀燈：物件打開時從左上前方打一盞會投影的暖光，紙面才有明暗、物件會在背後落影（取代紙張自發光）。
 // 房間建立時就加進場景（強度 0），預熱時一併編譯，打開時不會卡頓。
 const reading=new T.SpotLight('#ffe7c6',0,10,.6,1,1.1);reading.castShadow=true;reading.shadow.mapSize.set(1024,1024);reading.shadow.bias=-.0004;reading.shadow.normalBias=.02;reading.shadow.camera.near=.3;
 scene?.add(reading,reading.target);const READ=11;
 function aimReading(prop){
  const {c,n,w,h}=prop.whole,up=new T.Vector3(0,1,0).addScaledVector(n,-n.y).normalize(),side=new T.Vector3().crossVectors(up,n).normalize(),dist=2.4+Math.max(w,h)*.35;
  // 從觀看者左前方、略高處斜打：太高會被帳篷頂、天花樑擋住，正對又會在紙上留下亮斑。
  reading.position.copy(c).addScaledVector(n,dist*.85).addScaledVector(up,dist*.32).addScaledVector(side,-dist*.45);reading.target.position.copy(c);reading.target.updateMatrixWorld();
  reading.angle=Math.min(1.1,Math.atan(Math.max(w,h)*.75/dist)+.15);reading.distance=dist*3;
 }
 const nav=document.createElement('div');nav.className='room-prop-nav';nav.hidden=true;nav.setAttribute('role','group');nav.setAttribute('aria-label','近看');host.append(nav);
 nav.innerHTML='<button type="button" data-prop="prev" aria-label="上一個區塊">←</button><button type="button" data-prop="zoom"></button><button type="button" data-prop="next" aria-label="下一個區塊">→</button>';
 const [prev,toggle,next]=nav.querySelectorAll('button');
 const narrow=()=>host.clientWidth/host.clientHeight<1;
 // 畫面上方有房間標題、下方有近看控制列與工具列：內容放在兩者之間的可見區正中，不被文字或按鈕蓋住。
 // 比例（佔畫面高度）：手機上 10%、下 25%；桌機的標題與按鈕較小，只留上 3%、下 7%（留太多會讓高的物件縮小、字變小）。
 function view(f,k){
  const aspect=host.clientWidth/host.clientHeight,tan=Math.tan(T.MathUtils.degToRad(camera.fov/2))*2,[top,bottom]=narrow()?[.1,.25]:[.03,.07],usable=1-top-bottom;
  const d=Math.max(f.w/(tan*aspect),f.h/(tan*usable))*k;
  const up=new T.Vector3(0,1,0).addScaledVector(f.n,-f.n.y).normalize(),target=f.c.clone().addScaledVector(up,-(bottom-top)/2*tan*d);
  const p=target.clone().addScaledVector(f.n,d);if(f.x)p.x+=f.x;return {position:p.toArray(),target:target.toArray()};
 }
 function setNav(){
  const prop=props[state.selection];if(!prop){nav.hidden=true;return;}nav.hidden=false;const n=prop.frames.length;
  prev.hidden=next.hidden=zoom<0;prev.disabled=zoom<=0;next.disabled=zoom>=n-1;
  toggle.textContent=zoom<0?'放大細看':`${prop.frames[zoom].label}　${zoom+1} / ${n}　· 看全部`;
 }
 function animate(prop,to,duration){
  cancelAnimationFrame(tween);const from=prop.open,started=performance.now();
  return new Promise(resolve=>{const frame=now=>{const t=quiet()?1:Math.min(1,(now-started)/duration);prop.open=from+(to-from)*t;prop.setOpen(prop.open);reading.intensity=READ*prop.open;refreshShadows();draw();if(t<1&&state.active)tween=requestAnimationFrame(frame);else{prop.open=to;prop.setOpen(to);reading.intensity=READ*to;refreshShadows();draw();resolve();}};tween=requestAnimationFrame(frame);});
 }
 async function focus(){
  const prop=props[state.selection];if(!prop)return;setNav();
  const f=zoom<0?prop.whole:prop.frames[zoom],v=view(f,zoom<0?(f.k||1.1):(f.k||1.08));
  await move(v.position,v.target,850);
  if(props[state.selection]===prop&&prop.open<1)await animate(prop,1,prop.openDuration||1000);
 }
 function close(except){
  cancelAnimationFrame(tween);if(sr){sr.remove();sr=null;}
  Object.entries(props).forEach(([i,p])=>{if(Number(i)!==except&&p.open>0){p.open=0;p.setOpen(0);}});if(except===undefined||!props[except]?.open)reading.intensity=0;zoom=-1;nav.hidden=true;refreshShadows();draw();
 }
 async function open(index){close(index);aimReading(props[index]);zoom=narrow()?0:-1;sr=artifactText(exhibits[index].artifact);if(sr)host.append(sr);await focus();}
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
