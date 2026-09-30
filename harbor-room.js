import {createCameraJourney} from './camera-journey.js';
import * as T from './assets/vendor/three.module.min.js';
import {createGLTFLoader,webAsset} from './web-assets.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';
import {createGalleryArtifact} from './gallery-artifacts.js';
import {createHarborFacade} from './harbor-facade.js?v=polish-1';
import {createHarborPaper} from './harbor-paper.js';
import {prewarmRoom} from './room-prewarm.js';

export const harborExhibits=[
 {title:'一段連續的遠征',subject:'01 / 網站實作',lead:'從一束光，到可以探索的世界。',detail:'你正在瀏覽的行銷遠征，是影片、3D 空間與內容導覽的整合實作。沿著作品閱讀它的問題、設計取捨與仍在調整的地方。',discoveries:['影片與立體場景如何銜接','鏡頭、角色比例與載入的取捨','從沉浸開場走向清楚的內容入口'],href:'works.html#site-case',action:'閱讀網站作品',label:'網站作品'},
 {title:'把問題攤在桌上',subject:'02 / 內容提案・教學示範',lead:'先看清楚問題，再決定寫什麼。',detail:'這份虛構情境提案，示範如何幫第一次購買手作商品的人理解客製流程。從讀者的困擾出發，整理主軸、交付內容與待確認的事實。',discoveries:['誰會閱讀，卡在哪一步','一個問題如何成為內容主軸','哪些交期與費用仍需品牌確認'],href:'works.html#report-content',action:'翻閱內容提案',label:'提案手稿'},
 {title:'找到下一步的入口',subject:'03 / 網站診斷・教學示範',lead:'讓第一次來的人，知道可以往哪裡走。',detail:'以虛構的手作品牌首頁為例，示範怎麼區分發現、建議與核對方法。這是教學示範，並非真實客戶的分析或成效。',discoveries:['首屏是否說清楚提供什麼','入口與品牌故事如何排序','用實際訪客的理解核對改動'],href:'works.html#report-diagnosis',action:'打開診斷示範',label:'診斷筆記'}
];

// 只在星港打開時建立；靜止時停止繪圖，重複幾何依材質合併。
export async function createHarborRoom(host,{onSelect,onOverview,quiet=()=>false}={}){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));
 renderer.setClearColor('#0b1720');renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const canvas=renderer.domElement;canvas.className='harbor-room-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const scene=new T.Scene();scene.background=new T.Color('#0b1720');scene.fog=new T.Fog('#10202a',32,65);
 const camera=new T.PerspectiveCamera(49,1,.1,85);const look=new T.Vector3();
 let active=false,busy=false,raf=0,finishMotion=null,selection=-1,orbitOffset=0,disposed=false;
 const jobs=[],ownedTextures=new Set();const architecture=new T.Group();scene.add(architecture);
 const status=document.createElement('p');status.className='harbor-room-status';status.setAttribute('role','status');status.textContent='正在點亮星港展廳…';host.append(status);
 const heading=document.createElement('div');heading.className='harbor-room-heading';heading.innerHTML='<small>02 / THE HARBOR GALLERY</small>想法靠岸，留下作品。';host.append(heading);
 const toolbar=document.createElement('div');toolbar.className='harbor-room-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','星港展廳視角');
 toolbar.innerHTML='<button type="button" data-room-view="left" aria-label="向左環看展廳">↶</button><button type="button" data-room-view="overview">展廳全景</button><button type="button" data-room-view="right" aria-label="向右環看展廳">↷</button><button type="button" data-room-exhibit="0" aria-label="查看網站作品">作品</button><button type="button" data-room-exhibit="1" aria-label="查看提案手稿">手稿</button><button type="button" data-room-exhibit="2" aria-label="查看診斷筆記">筆記</button>';host.append(toolbar);
 const controls=[...toolbar.querySelectorAll('button')];
 const texLoader=new T.TextureLoader();
 // 使用 loader 自身回呼等待圖片解碼，不依賴 Image 是否已同步綁定。
 function loadTexture(path,repeat=1,color=false){
  let resolve,reject;const pending=new Promise((a,b)=>{resolve=a;reject=b;});jobs.push(pending);
  const map=texLoader.load(webAsset(path),()=>resolve(),undefined,()=>reject(new Error('材質無法載入：'+path)));
  map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(color)map.colorSpace=T.SRGBColorSpace;ownedTextures.add(map);return map;
 }
 const material=(color,roughness=.6,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const brass=material('#b39360',.46,.48),darkBrass=material('#493e2d',.57,.42),wood=material('#362b25',.85),trim=material('#172930',.74),stone=material('#75818a',.9),paper=material('#c1ad88',.95);
 // 微小的金屬加工紋與粗糙度使用同一張低成本資料材質。
 const patinaData=new Uint8Array(128*128*4);let patinaSeed=173;
 for(let i=0;i<128*128;i++){patinaSeed=(Math.imul(patinaSeed,1664525)+1013904223)>>>0;const v=150+patinaSeed%73;patinaData.set([v,v,v,255],i*4);}
 const patina=new T.DataTexture(patinaData,128,128);patina.wrapS=patina.wrapT=T.RepeatWrapping;patina.magFilter=T.LinearFilter;patina.minFilter=T.LinearMipmapLinearFilter;patina.generateMipmaps=true;patina.needsUpdate=true;ownedTextures.add(patina);
 for(const metal of [brass,darkBrass]){metal.bumpMap=patina;metal.bumpScale=.007;metal.roughnessMap=patina;}
 const floorMat=new T.MeshStandardMaterial({color:'#897b67',map:loadTexture('3d/hall-materials/wood_planks/wood_planks_diff_1k.jpg',6,true),normalMap:loadTexture('3d/hall-materials/wood_planks/wood_planks_nor_gl_1k.jpg',6),roughnessMap:loadTexture('3d/hall-materials/wood_planks/wood_planks_rough_1k.jpg',6),roughness:.86,normalScale:new T.Vector2(.45,.45)});
 wood.map=floorMat.map;wood.normalMap=floorMat.normalMap;wood.normalScale=new T.Vector2(.18,.18);
 const wallMat=new T.MeshStandardMaterial({color:'#627780',map:loadTexture('3d/interior-candidates/rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg',.32,true),normalMap:loadTexture('3d/interior-candidates/rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg',.32),roughness:.93,normalScale:new T.Vector2(.3,.3)});
 function mesh(geometry,mat,x=0,y=0,z=0,parent=architecture){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(x,y,z,w,h,d,mat,parent)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
 const cyl=(x,y,z,r,h,mat,parent)=>mesh(new T.CylinderGeometry(r,r,h,24),mat,x,y,z,parent);
 const torus=(x,y,z,r,t,mat,parent)=>mesh(new T.TorusGeometry(r,t,8,64),mat,x,y,z,parent);
 const floor=mesh(new T.PlaneGeometry(12,12),floorMat,0,-.025,1);floor.rotation.x=-Math.PI/2;
 // 由碼頭走入同一間展廳：入口位於觀看位置後方，門框不跟著鏡頭移動。
 const entryGlow=new T.MeshBasicMaterial({color:'#e9b66c',toneMapped:false});
 const facade=createHarborFacade({stone:wallMat,wood,brass,roof:trim,glow:entryGlow});facade.position.z=15.5;architecture.add(facade);
 const approachFloor=mesh(new T.PlaneGeometry(12,11),floorMat,0,-.025,12.5);approachFloor.rotation.x=-Math.PI/2;
 box(0,-.25,17.4,12,.4,4.8,wood);
 const water=mesh(new T.PlaneGeometry(160,160),material('#123340',.48,.32),0,-.65,24);water.rotation.x=-Math.PI/2;water.castShadow=false;
 for(const x of [-5.5,5.5]){
  for(const z of [16,18,19.5]){cyl(x,.5,z,.095,1.15,wood);cyl(x,1.09,z,.11,.055,brass);}
  box(x,.87,17.75,.06,.055,3.5,brass);
 }
 for(const x of [-6,6])box(x,2.9,10.7,.3,5.8,9.4,wallMat);
 for(const x of [-5.8,5.8])for(const y of [.35,1.3,5.5])box(x,y,10.7,.12,.06,9.4,brass);
 box(0,5.86,10.7,12,.15,9.4,trim);
 for(const z of [7,11,14.8]){box(0,5.55,z,12,.3,.23,wood);box(0,5.38,z,12,.02,.26,darkBrass);}
 // 背牆有真正的圓窗洞口，窗框與窗外遠景分處不同深度。
 const wallShape=new T.Shape();wallShape.moveTo(-6,0);wallShape.lineTo(6,0);wallShape.lineTo(6,5.8);wallShape.lineTo(-6,5.8);wallShape.closePath();
 const hole=new T.Path();hole.absarc(2.9,3.6,1.34,0,Math.PI*2,true);wallShape.holes.push(hole);
 mesh(new T.ExtrudeGeometry(wallShape,{depth:.3,bevelEnabled:false,curveSegments:64}),wallMat,0,0,-4.25);
 box(-6,2.9,1,.3,5.8,10,wallMat);box(6,2.9,1,.3,5.8,10,wallMat);
 const skyMat=new T.MeshBasicMaterial({map:loadTexture('assets/world/harbor.png',1,true),color:'#778ca9'});
 mesh(new T.PlaneGeometry(4.8,3.2),skyMat,2.9,3.6,-4.7).castShadow=false;
 for(const [r,t] of [[1.38,.095],[1.5,.035],[1.23,.022]])torus(2.9,3.6,-3.9,r,t,brass);
 box(2.9,3.6,-3.87,.055,2.67,.07,darkBrass);box(2.9,3.6,-3.87,2.67,.045,.07,darkBrass);torus(2.9,3.6,-3.83,.36,.018,brass);
 box(2.9,2.13,-3.65,3.08,.16,.62,stone);
 for(const y of [.12,1.18,1.32,5.45,5.57]){
  box(0,y,-3.82,12,.08,.12,y<2?wood:brass);
  for(const x of [-5.82,5.82])box(x,y,1,.13,.08,10,y<2?wood:brass);
 }
 for(let i=0;i<12;i++){
  const x=-5.5+i;box(x,.64,-3.87,.92,.98,.16,trim);box(x,.65,-3.765,.77,.77,.025,wood);
  for(const dx of [-.38,.38])box(x+dx,.65,-3.74,.016,.78,.02,brass);
 }
 for(const x of [-5.55,-.15,5.5]){
  box(x,2.9,-3.66,.21,5.8,.35,wood);
  for(const dx of [-.17,.17])box(x+dx,2.9,-3.52,.025,5.45,.035,brass);
  box(x,.2,-3.57,.52,.4,.5,trim);box(x,5.35,-3.57,.55,.18,.52,brass);
 }
 // 天花木樑、地毯、金屬嵌線使室內有可辨識的前後尺度。
 box(0,5.86,1,12,.15,10,trim);
 for(const z of [-3.4,-.7,2,4.7]){box(0,5.55,z,12,.3,.23,wood);box(0,5.38,z,12,.02,.26,darkBrass);}
 box(-.4,.006,.6,5.4,.018,4.1,material('#263d40',.98));
 for(const x of [-3.02,2.22])box(x,.021,.6,.025,.008,3.96,brass);
 for(const z of [-1.37,2.57])box(-.4,.021,z,5.24,.008,.025,brass);
 for(let i=0;i<14;i++){const mark=box(-2.76+i*.36,.024,2.34,.06,.008,.06,brass);mark.rotation.y=Math.PI/4;}
 const sceneLight=new T.HemisphereLight('#b4d1ec','#69503b',1.55);scene.add(sceneLight);
 const fill=new T.DirectionalLight('#a8bed1',.58);fill.position.set(5,4,4);fill.target.position.set(-2,1,-2);scene.add(fill,fill.target);
 const key=new T.DirectionalLight('#f1d5ad',2.8);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:25});key.shadow.bias=-.0004;key.shadow.normalBias=.025;scene.add(key);
 const moon=new T.PointLight('#86bce9',35,14,2);moon.position.set(3,3.6,-2.8);scene.add(moon);
 function lamp(x,y,z,intensity=4.5){
  cyl(x,y-.3,z,.1,.6,brass);cyl(x,y-.62,z,.23,.07,brass);
  cyl(x,y,z,.16,.38,entryGlow);for(const dy of [-.23,.23])cyl(x,y+dy,z,.24,.035,darkBrass);
  mesh(new T.CylinderGeometry(.10,.29,.17,32),brass,x,y+.34,z);torus(x,y+.49,z,.085,.015,brass);
  for(const dx of [-.2,.2])for(const dz of [-.14,.14])box(x+dx,y,z+dz,.016,.43,.016,brass);
  const light=new T.PointLight('#ffc583',intensity,4.5,2);light.position.set(x,y,z+.2);scene.add(light);
 }
 lamp(-4.75,3,-3.2);lamp(.3,3,-3.2);lamp(5.15,2.2,1.05);
 for(const x of [-4.75,.3]){box(x,2.39,-3.56,.055,.055,.76,brass);box(x,2.62,-3.9,.19,.56,.055,darkBrass);}
 cyl(5.15,.81,1.05,.036,1.55,brass);cyl(5.15,.05,1.05,.28,.1,darkBrass);
 const poster=loadTexture('assets/film/duo-opening/start-soft-proportion.png',1,true);
 // 展品不是替代文字的裝飾：主畫作使用網站本身已核定的素材。
 function frame(parent,w,h,map){
  box(0,0,-.09,w+.26,h+.26,.18,wood,parent);
  mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,color:'#d6cfc0'}),0,0,.022,parent);
  for(const [offset,thickness,depth,mat] of [[.04,.065,.07,brass],[.14,.045,.035,darkBrass],[.2,.038,.055,brass]]){
   for(const x of [-1,1])box(x*(w/2+offset),0,depth,thickness,h+offset*2,thickness,mat,parent);
   for(const y of [-1,1])box(0,y*(h/2+offset),depth,w+offset*2,thickness,thickness,mat,parent);
  }
  for(let i=0;i<24;i++)for(const y of [-1,1]){
   const bead=mesh(new T.SphereGeometry(.024,8,6),brass,-w/2+i*w/23,y*(h/2+.105),.06,parent);bead.scale.y=1.5;
  }
  for(const x of [-1,1])for(const y of [-1,1]){torus(x*(w/2+.12),y*(h/2+.12),.10,.047,.009,brass,parent);}
 }
 function labelTexture(lines,width=1024,height=512){
  const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#15272e';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#a78955';ctx.lineWidth=3;ctx.strokeRect(22,22,width-44,height-44);
  lines.forEach((text,i)=>{ctx.font=i===0?'24px Georgia':'34px "Microsoft JhengHei",sans-serif';ctx.fillStyle=i===0?'#b99b68':'#ddd2bc';ctx.fillText(text,52,78+i*75);});
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;ownedTextures.add(tex);return tex;
 }
 const mainFrame=new T.Group();mainFrame.position.set(-2.65,3.04,-3.6);architecture.add(mainFrame);frame(mainFrame,3.65,2.12,poster);
 mesh(new T.PlaneGeometry(1.85,.34),new T.MeshBasicMaterial({map:labelTexture(['01  /  IN THE MAKING','行銷遠征 · 網站實作'],1024,230)}),-2.65,1.64,-3.57);
 const report=new T.Group();report.position.set(4.55,2.1,-.65);report.rotation.y=-.42;architecture.add(report);
 for(const x of [-.59,.59]){const leg=box(x,-1.37,-.07,.09,1.47,.1,wood,report);leg.rotation.z=-x*.09;}
 function paperTexture(...args){const map=createHarborPaper(...args);ownedTextures.add(map);return map;}
 frame(report,1.7,2.2,paperTexture('report'));
 const loader=createGLTFLoader();
 async function asset(id,x,z,height,rotation=0){
  const gltf=await loader.loadAsync(webAsset(`3d/hall-assets/${id}/${id}_1k.gltf`));const model=gltf.scene;
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());const ratio=height/size.y;
  model.position.set(-center.x,-bounds.min.y,-center.z);const wrap=new T.Group();wrap.add(model);wrap.scale.setScalar(ratio);wrap.position.set(x,0,z);wrap.rotation.y=rotation;architecture.add(wrap);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return wrap;
 }
 jobs.push(asset('wooden_table_02',-.2,.2,1.32).then(table=>{table.scale.x*=1.55;table.scale.z*=1.4;}));jobs.push(asset('wooden_bookshelf_worn',-5.1,-1.9,3.15,Math.PI/2));
 const book=createGalleryArtifact(1,brass);book.scale.setScalar(.62);book.position.set(-.72,1.34,.22);book.rotation.y=-.19;architecture.add(book);
 // 近看能閱讀的紙面；保留曲面與頁緣，移除原展示道具的粗線占位。
 const leaves=book.children.filter(o=>o.geometry?.type==='PlaneGeometry');
 for(const child of [...book.children])if(child.geometry?.type==='BoxGeometry'&&child.material.color?.getHexString()==='65513b'){book.remove(child);child.geometry.dispose();}
 for(const [i,title,lines] of [[11,'從問題出發',['誰正在閱讀？','第一次購買','手作商品的人。','他們擔心什麼？','客製前該準備什麼？']],[23,'讓下一步清楚',['內容主軸','從想法，到確認稿。','','先核對，再交付','交期與費用待確認。']]])if(leaves[i]){leaves[i].material=new T.MeshStandardMaterial({color:'#ffffff',map:paperTexture('book',title,lines),roughness:1,side:T.DoubleSide});}
 const scroll=createGalleryArtifact(0,brass);scroll.scale.setScalar(.52);scroll.position.set(.55,1.34,.12);scroll.rotation.y=.15;architecture.add(scroll);
 for(const child of [...scroll.children]){
  if(child.geometry?.type==='BoxGeometry'&&child.material.color?.getHexString()==='65513b'){scroll.remove(child);child.geometry.dispose();}
  else if(child.geometry?.type==='PlaneGeometry')child.material=new T.MeshStandardMaterial({map:paperTexture('route'),roughness:1,side:T.DoubleSide});
 }

 cyl(1.05,1.44,-.28,.11,.21,material('#151d26',.26));cyl(1.05,1.56,-.28,.084,.028,brass);
 const pen=cyl(.78,1.4,.58,.012,.54,brass);pen.rotation.z=1.48;pen.rotation.y=.35;
 lamp(-1.32,2,.1,1.2);
 const pages=[material('#4a302b'),material('#34434a'),material('#62513b')];
 // 少量有書脊與壓金的書冊，不以高面數重複模型填滿房間。
 for(let row=0;row<3;row++)for(let i=0;i<8;i++){
  const h=.32+(i%3)*.06,z=-2.62+i*.18,y=.7+row*.81;
  box(-4.81,y+h/2,z,.42,h,.12,pages[(i+row)%3]);
  for(const dy of [.07,h-.055])box(-4.59,y+dy,z,.012,.014,.118,brass);
 }
 // 堆疊書頁與封皮可以在低角度下看見厚度。
 for(let i=0;i<3;i++){box(-2.1,.13+i*.16,-2.8,.7,.11,.48,paper);for(const dy of [-.067,.067])box(-2.1,.13+i*.16+dy,-2.8,.74,.022,.51,pages[i]);}
 const views=[
  {position:[-1.5,3.15,1.3],target:[-2.65,2.97,-3.55]},
  {position:[.7,3.65,2.45],target:[-.12,1.4,.15]},
  {position:[3.1,2.55,4.1],target:[4.55,2.15,-.65]}
 ];
 const anchors=[new T.Vector3(-2.65,1.98,-3.28),new T.Vector3(.3,1.54,1.03),new T.Vector3(4.55,.7,-.3)];
 const buttons=harborExhibits.map((exhibit,i)=>{const b=document.createElement('button');b.type='button';b.className='harbor-hotspot';b.setAttribute('aria-label','走近'+exhibit.label);b.setAttribute('aria-pressed','false');b.innerHTML=`<b>0${i+1}</b><span>${exhibit.label}</span>`;b.addEventListener('click',()=>select(i));host.append(b);return b;});
 function project(){
  const w=host.clientWidth,h=host.clientHeight;
  anchors.forEach((p,i)=>{const v=p.clone().project(camera);const visible=v.z>-1&&v.z<1&&Math.abs(v.x)<.84&&Math.abs(v.y)<.8&&(!busy||selection===i);buttons[i].hidden=!visible;buttons[i].style.left=`${(v.x*.5+.5)*w}px`;buttons[i].style.top=`${(-v.y*.5+.5)*h}px`;});
 }
 function draw(){if(!active||disposed||document.hidden)return;const started=performance.now();renderer.render(scene,camera);const elapsed=performance.now()-started;host.dataset.renderMs=elapsed.toFixed(1);host.dataset.maxRenderMs=Math.max(Number(host.dataset.maxRenderMs||0),elapsed).toFixed(1);project();host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);}
 function cancelMotion(){cancelAnimationFrame(raf);raf=0;finishMotion?.();finishMotion=null;busy=false;}
 function move(position,target,duration=1050,via=[]){
  cancelMotion();busy=true;controls.forEach(b=>b.disabled=true);buttons.forEach(b=>b.disabled=true);
  const from=camera.position.clone(),fromLook=look.clone(),to=new T.Vector3(...position),toLook=new T.Vector3(...target);const started=performance.now();
  const journey=via.length?createCameraJourney([{at:0,position:from.toArray(),target:fromLook.toArray()},...via,{at:1,position,target}]):null;
  return new Promise(resolve=>{
   finishMotion=resolve;
   const frame=now=>{
    const t=quiet()?1:Math.min(1,(now-started)/duration),e=t*t*t*(t*(t*6-15)+10);
    if(journey){
     const pose=journey(t);camera.position.fromArray(pose.position);look.fromArray(pose.target);host.dataset.entryPhase=pose.phase;
    }else{camera.position.lerpVectors(from,to,e);look.lerpVectors(fromLook,toLook,e);}
    camera.lookAt(look);draw();
    if(t<1&&active)raf=requestAnimationFrame(frame);else{busy=false;raf=0;finishMotion=null;controls.forEach(b=>b.disabled=false);buttons.forEach(b=>b.disabled=false);draw();resolve();}
   };raf=requestAnimationFrame(frame);
  });
 }
 function overviewView(){const narrow=host.clientWidth/host.clientHeight<1;return {position:[2.2+Math.sin(orbitOffset)*5,narrow?4.2:3.6,narrow?14:10.4],target:[.25,2,-.65]};}
 async function overview(){if(!active||busy)return;selection=-1;buttons.forEach(b=>b.setAttribute('aria-pressed','false'));onOverview?.();const v=overviewView();await move(v.position,v.target);}
 async function select(index){
  if(!active||busy)return;selection=index;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));onSelect?.(harborExhibits[index]);
  const v=views[index],target=new T.Vector3(...v.target),distance=new T.Vector3(...v.position).sub(target);
  // 手機窄畫幅拉回一點，保留畫框與桌緣，不把作品兩側裁掉。
  if(index!==2)distance.multiplyScalar(T.MathUtils.clamp(1.12/(host.clientWidth/host.clientHeight),1,1.45));
  await move(target.add(distance).toArray(),v.target);
 }
 toolbar.addEventListener('click',event=>{const exhibit=event.target.closest('[data-room-exhibit]')?.dataset.roomExhibit;if(exhibit!==undefined){select(Number(exhibit));return;}const view=event.target.closest('[data-room-view]')?.dataset.roomView;if(!view||busy)return;if(view==='left'||view==='right')orbitOffset=T.MathUtils.clamp(orbitOffset+(view==='left'?-.2:.2),-.65,.35);else orbitOffset=0;overview();});
 const raycaster=new T.Raycaster();const hitTargets=[];
 for(const [i,config] of [[0,[-2.65,3.04,-3.5,3.9,2.4,.25]],[1,[-.2,1.45,.2,2.4,.45,1.4]],[2,[4.55,2.1,-.65,1.8,2.5,.4]]]){const [x,y,z,w,h,d]=config;const proxy=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({visible:false}));proxy.position.set(x,y,z);proxy.userData.exhibit=i;scene.add(proxy);hitTargets.push(proxy);}
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
  const loaded=await Promise.allSettled(jobs);
  const failed=loaded.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  // 合併靜態材質批次；近景仍保留實際幾何、法線與紙頁層次。
  architecture.updateMatrixWorld(true);const groups=new Map(),old=new Set();
  architecture.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const list=groups.get(o.material)||[];list.push(g);groups.set(o.material,list);old.add(o.geometry);});
  scene.remove(architecture);
  for(const [mat,geometries] of groups){const combined=mergeGeometries(geometries);if(!combined)throw new Error('展廳幾何無法合併');const item=new T.Mesh(combined,mat);item.castShadow=!mat.isMeshBasicMaterial;item.receiveShadow=true;scene.add(item);geometries.forEach(g=>g.dispose());}old.forEach(g=>g.dispose());
  camera.position.set(7.6,10,40);camera.lookAt(0,3,15.5);
  await prewarmRoom(renderer,scene,camera,host);
  renderer.shadowMap.needsUpdate=true;status.hidden=true;host.dataset.ready='true';
 }catch(error){dispose();throw error;}
 return {
  async enter(){
   active=true;selection=-1;orbitOffset=0;buttons.forEach(b=>b.setAttribute('aria-pressed','false'));
   host.dataset.entryPhase='exterior';
   const narrow=host.clientWidth/host.clientHeight<1;
   camera.position.set(7.6,10,narrow?49:40);look.set(0,3,15.5);camera.lookAt(look);resize();
   // 單一連續運鏡穿過外觀與門檻；互動鎖定保持到抵達室內。
   const v=overviewView();await move(v.position,v.target,1820,[
    {at:750/1820,position:[0,2.65,Math.max(18.6,v.position[2]+7)],target:[0,2.65,11]},
    {at:1270/1820,position:[0,2.65,Math.max(14,v.position[2]+3)],target:[0,2.4,-1]}
   ]);
   if(active)host.dataset.entryPhase='ready';
  },
  suspend(){active=false;pointer=null;cancelMotion();host.dataset.entryPhase='idle';},
  dispose
 };
}
