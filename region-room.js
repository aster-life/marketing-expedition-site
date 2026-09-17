import * as T from './assets/vendor/three.module.min.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';
import {buildRegionScene} from './region-scenes.js?v=room-light-1';
import {regionContent} from './region-content.js';

export async function createRegionRoom(host,{index,onSelect,onOverview,quiet=()=>false}={}){
 const content=regionContent[index],exhibits=content.exhibits;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const canvas=renderer.domElement;canvas.className='harbor-room-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const scene=new T.Scene();scene.background=new T.Color('#0b1720');scene.fog=new T.Fog('#10202a',32,65);
 const camera=new T.PerspectiveCamera(49,1,.1,90),look=new T.Vector3();
 const ownedTextures=new Set();let active=false,busy=false,raf=0,finishMotion=null,selection=-1,orbitOffset=0,disposed=false;
 const status=document.createElement('p');status.className='harbor-room-status';status.setAttribute('role','status');status.textContent='正在準備'+content.name+'…';host.append(status);
 const heading=document.createElement('div');heading.className='harbor-room-heading';heading.innerHTML=`<small>0${index+1} / ${content.english}</small>${content.heading}`;host.append(heading);
 const toolbar=document.createElement('div');toolbar.className='harbor-room-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label',content.name+'視角');
 toolbar.innerHTML='<button type="button" data-room-view="left" aria-label="向左環看空間">↶</button><button type="button" data-room-view="overview">空間全景</button><button type="button" data-room-view="right" aria-label="向右環看空間">↷</button>'+exhibits.map((e,i)=>`<button type="button" data-room-exhibit="${i}" aria-label="查看${e.label}">${e.label}</button>`).join('');host.append(toolbar);
 const controls=[...toolbar.querySelectorAll('button')];
 let built;
 try{built=await buildRegionScene(index,scene,ownedTextures);}catch(error){scene.traverse(o=>{o.geometry?.dispose();const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];mats.forEach(m=>{Object.values(m).forEach(t=>{if(t?.isTexture&&!t.isDataTexture)ownedTextures.add(t);});m.dispose();});});ownedTextures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();host.replaceChildren();throw error;}
 const {root:architecture,views,anchors,overview:overviewBase,entry}=built;
 const buttons=exhibits.map((exhibit,i)=>{const b=document.createElement('button');b.type='button';b.className='harbor-hotspot';b.setAttribute('aria-label','走近'+exhibit.label);b.setAttribute('aria-pressed','false');b.innerHTML=`<b>0${i+1}</b><span>${exhibit.label}</span>`;b.addEventListener('click',()=>select(i));host.append(b);return b;});
 function project(){
  const w=host.clientWidth,h=host.clientHeight;
  anchors.forEach((p,i)=>{const v=p.clone().project(camera);const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<.84&&Math.abs(v.y)<.8&&(!busy||selection===i);buttons[i].hidden=!visible;buttons[i].style.left=`${(v.x*.5+.5)*w}px`;buttons[i].style.top=`${(-v.y*.5+.5)*h}px`;});
 }
 function draw(){if(!active||disposed||document.hidden)return;renderer.render(scene,camera);project();host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);}
 function cancelMotion(){cancelAnimationFrame(raf);raf=0;finishMotion?.();finishMotion=null;busy=false;}
 function move(position,target,duration=1050){
  cancelMotion();busy=true;controls.forEach(b=>b.disabled=true);buttons.forEach(b=>b.disabled=true);
  const from=camera.position.clone(),fromLook=look.clone(),to=new T.Vector3(...position),toLook=new T.Vector3(...target);const started=performance.now();
  return new Promise(resolve=>{
   finishMotion=resolve;
   const frame=now=>{const t=quiet()?1:Math.min(1,(now-started)/duration),e=t*t*t*(t*(t*6-15)+10);camera.position.lerpVectors(from,to,e);look.lerpVectors(fromLook,toLook,e);camera.lookAt(look);draw();
    if(t<1&&active)raf=requestAnimationFrame(frame);else{busy=false;raf=0;finishMotion=null;controls.forEach(b=>b.disabled=false);buttons.forEach(b=>b.disabled=false);draw();resolve();}
   };raf=requestAnimationFrame(frame);
  });
 }
 function overviewView(){const narrow=host.clientWidth/host.clientHeight<1,p=overviewBase.position;return {position:[p[0]+Math.sin(orbitOffset)*5,p[1]+(narrow?.6:0),p[2]+(narrow?4:0)],target:overviewBase.target};}
 async function overview(){if(!active||busy)return;selection=-1;buttons.forEach(b=>b.setAttribute('aria-pressed','false'));onOverview?.();const v=overviewView();await move(v.position,v.target);}
 async function select(index){
  if(!active||busy)return;selection=index;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));onSelect?.(exhibits[index]);
  const v=views[index],target=new T.Vector3(...v.target),distance=new T.Vector3(...v.position).sub(target);
  // 手機窄畫幅拉回一點，保留畫框與桌緣，不把作品兩側裁掉。
  distance.multiplyScalar(T.MathUtils.clamp(1.12/(host.clientWidth/host.clientHeight),1,1.45));
  await move(target.add(distance).toArray(),v.target);
 }
 toolbar.addEventListener('click',event=>{const exhibit=event.target.closest('[data-room-exhibit]')?.dataset.roomExhibit;if(exhibit!==undefined){select(Number(exhibit));return;}const view=event.target.closest('[data-room-view]')?.dataset.roomView;if(!view||busy)return;if(view==='left'||view==='right')orbitOffset=T.MathUtils.clamp(orbitOffset+(view==='left'?-.2:.2),-.65,.35);else orbitOffset=0;overview();});
 const raycaster=new T.Raycaster();const hitTargets=[];
 anchors.forEach((p,i)=>{const proxy=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({visible:false}));proxy.position.copy(p).add(new T.Vector3(0,.5,-.3));proxy.userData.exhibit=i;scene.add(proxy);hitTargets.push(proxy);});
 let pointer;
 canvas.addEventListener('pointerdown',event=>{if(!active||busy)return;pointer={x:event.clientX,y:event.clientY};});
 canvas.addEventListener('pointerup',event=>{if(!pointer||busy)return;const start=pointer;pointer=null;const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.hypot(dx,dy)>12){orbitOffset=T.MathUtils.clamp(orbitOffset-dx/host.clientWidth*.7,-.65,.35);overview();return;}
  const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects(hitTargets)[0];if(hit)select(hit.object.userData.exhibit);
 });canvas.addEventListener('pointercancel',()=>pointer=null);
 function resize(){if(!active)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 const visible=()=>{if(!document.hidden)draw();};document.addEventListener('visibilitychange',visible);
 function dispose(){disposed=true;active=false;cancelMotion();observer.disconnect();document.removeEventListener('visibilitychange',visible);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture&&!v.isDataTexture)ownedTextures.add(v);});m.dispose();});ownedTextures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}
 try{

  // 合併靜態材質批次；近景仍保留實際幾何、法線與紙頁層次。
  architecture.updateMatrixWorld(true);const groups=new Map(),old=new Set();
  architecture.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const list=groups.get(o.material)||[];list.push(g);groups.set(o.material,list);old.add(o.geometry);});
  scene.remove(architecture);
  for(const [mat,geometries] of groups){const combined=mergeGeometries(geometries);if(!combined)throw new Error('展廳幾何無法合併');const item=new T.Mesh(combined,mat);item.castShadow=!mat.isMeshBasicMaterial;item.receiveShadow=true;scene.add(item);geometries.forEach(g=>g.dispose());}old.forEach(g=>g.dispose());
  renderer.shadowMap.needsUpdate=true;status.hidden=true;host.dataset.ready='true';
 }catch(error){dispose();throw error;}
 return {
  async enter(){
   active=true;selection=-1;orbitOffset=0;buttons.forEach(b=>b.setAttribute('aria-pressed','false'));host.dataset.entryPhase='exterior';
   const narrow=host.clientWidth/host.clientHeight<1;
   camera.position.set(entry[0][0],entry[0][1],entry[0][2]+(narrow?8:0));look.set(0,2.6,index===3?0:15);camera.lookAt(look);resize();
   if(!quiet()){
    await move(entry[1],[0,2.5,index===3?0:12],750);if(!active)return;
    host.dataset.entryPhase='threshold';await move(entry[2],[0,2,-1],520);if(!active)return;
   }
   host.dataset.entryPhase='interior';const v=overviewView();await move(v.position,v.target,550);if(active)host.dataset.entryPhase='ready';
  },
  suspend(){active=false;pointer=null;cancelMotion();host.dataset.entryPhase='idle';},
  dispose
 };
}
