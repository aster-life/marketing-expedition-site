import * as T from './assets/vendor/three.module.min.js';
import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
import {createGalleryArtifact} from './gallery-artifacts.js';
import {createRegionEntrance} from './region-entrance.js';

export async function buildRegionScene(index,scene,owned){
 const root=new T.Group();scene.add(root);const jobs=[];
 const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const loader=new T.TextureLoader();
 function texture(path,repeat=1,color=true){let done,fail;const p=new Promise((r,j)=>{done=r;fail=j;});jobs.push(p);const t=loader.load(path,done,undefined,()=>fail(new Error('素材載入失敗：'+path)));if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;owned.add(t);return t;}
 const stone=mat('#6b7880'),wood=mat('#69503a'),metal=mat('#af8f56',.49,.5),dark=mat('#172d33'),roof=mat('#153036'),cloth=mat('#8e7754');cloth.side=T.DoubleSide;
 const glow=new T.MeshBasicMaterial({color:'#edbd75',toneMapped:false});
 stone.map=texture('3d/interior-candidates/rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg',.6);
 wood.map=texture('3d/hall-materials/wood_planks/wood_planks_diff_1k.jpg',2);
 // 沿用本機法線材質，以側光呈現凹凸，不增加近景模型面數。
 stone.normalMap=texture('3d/interior-candidates/rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg',.6,false);stone.normalScale=new T.Vector2(.24,.24);
 wood.normalMap=texture('3d/hall-materials/wood_planks/wood_planks_nor_gl_1k.jpg',2,false);wood.normalScale=new T.Vector2(.22,.22);
 const grainData=new Uint8Array(128*128*4);let seed=701;
 for(let i=0;i<128*128;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=160+seed%65;grainData.set([v,v,v,255],i*4);}
 const grain=new T.DataTexture(grainData,128,128);grain.needsUpdate=true;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;owned.add(grain);
 for(const m of [metal,cloth]){m.bumpMap=grain;m.bumpScale=.008;m.roughnessMap=grain;}
 const mesh=(geo,m,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x,y,z,w,h,d,m=wood,parent)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(x,y,z,r,h,m=metal,parent)=>mesh(new T.CylinderGeometry(r,r,h,24),m,x,y,z,parent);
 const ring=(x,y,z,r,t=.025,m=metal,parent)=>mesh(new T.TorusGeometry(r,t,8,64),m,x,y,z,parent);
 function lamp(x,y,z){
  cyl(x,y-.36,z,.05,.55);cyl(x,y-.65,z,.21,.08);cyl(x,y,z,.14,.36,glow);
  for(const dy of [-.22,.22])cyl(x,y+dy,z,.23,.045,metal);
  mesh(new T.CylinderGeometry(.06,.27,.18,20),metal,x,y+.32,z);ring(x,y+.46,z,.07,.012);
  for(const dx of [-.18,.18])for(const dz of [-.12,.12])box(x+dx,y,z+dz,.017,.43,.017,metal);
  const light=new T.PointLight('#ffba69',2.2,4,2);light.position.set(x,y+.06,z);scene.add(light);
 }
 function panel(title,rows,light=false){
  const c=document.createElement('canvas');c.width=900;c.height=1120;const a=c.getContext('2d');
  a.fillStyle=light?'#d4c4a1':'#14282d';a.fillRect(0,0,900,1120);
  a.strokeStyle=light?'#a18b60':'#816c46';a.strokeRect(34,34,832,1052);a.strokeRect(44,44,812,1032);
  a.fillStyle=light?'#70522d':'#bb9c63';a.font='26px Georgia';a.fillText('EXPEDITION  /  FIELD NOTES',75,113);
  a.fillStyle=light?'#1b2928':'#e9dec7';a.font='600 64px "Microsoft JhengHei",serif';a.fillText(title,72,231);
  rows.forEach(([h,d],i)=>{const y=352+i*200;a.fillStyle=light?'#79592c':'#b69a65';a.font='30px Georgia';a.fillText('0'+(i+1),76,y);a.font='600 45px "Microsoft JhengHei",serif';a.fillStyle=light?'#202c2c':'#e3d5bd';a.fillText(h,150,y);a.font='30px "Microsoft JhengHei",sans-serif';a.fillText(d,150,y+65);a.strokeStyle=light?'#ad997044':'#af996144';a.beginPath();a.moveTo(75,y+105);a.lineTo(824,y+105);a.stroke();});
  a.fillStyle=light?'#806842':'#a79980';a.font='25px sans-serif';a.fillText('把下一步，留在你手上。',75,1030);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;owned.add(t);return t;
 }
 function board(x,y,z,w,h,title,rows,rotation=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;root.add(g);
  box(0,0,-.08,w+.22,h+.22,.14,wood,g);mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:panel(title,rows)}),0,0,.015,g);
  for(const dx of [-1,1]){box(dx*(w/2+.08),0,.04,.07,h+.22,.07,metal,g);box(dx*(w/2+.16),0,0,.03,h+.36,.04,metal,g);}
  for(const dy of [-1,1]){box(0,dy*(h/2+.08),.04,w+.22,.07,.07,metal,g);for(let i=0;i<17;i++)mesh(new T.SphereGeometry(.022,8,6),metal,-w/2+i*w/16,dy*(h/2+.08),.088,g);}
  return g;
 }
 function book(x,y,z,rotation,title,rows){const g=createGalleryArtifact(1,metal);g.position.set(x,y,z);g.scale.setScalar(.7);g.rotation.y=rotation;root.add(g);
  for(const c of [...g.children])if(c.geometry?.type==='BoxGeometry'&&c.material.color?.getHexString()==='65513b'){g.remove(c);c.geometry.dispose();}
  const leaves=g.children.filter(c=>c.geometry?.type==='PlaneGeometry');
  for(const i of [11,23])leaves[i].material=new T.MeshStandardMaterial({map:panel(i===11?title:'下一步',rows,true),roughness:1,side:T.DoubleSide});return g;
 }
 function closedBook(x,y,z,width=.65,height=.13,color=dark){box(x,y,z,width,height,.62,color);box(x,y,z+.015,width-.07,height*.65,.62,mat('#ab9978'));for(const dy of [-1,1])box(x,y+dy*height*.48,z,width,.025,.66,color);}
 const gltfLoader=new GLTFLoader();const gltfs=new Map();
 function asset(id,x,z,height,rotation=0){let source=gltfs.get(id);if(!source){source=gltfLoader.loadAsync(`3d/hall-assets/${id}/${id}_1k.gltf`);gltfs.set(id,source);}jobs.push(source.then(gltf=>{const model=gltf.scene.clone(true),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());model.position.set(-center.x,-bounds.min.y,-center.z);const wrap=new T.Group();wrap.add(model);wrap.scale.setScalar(height/size.y);wrap.position.set(x,0,z);wrap.rotation.y=rotation;root.add(wrap);}));}
 function shelves(x,z,rotation=0){asset('wooden_bookshelf_worn',x,z,3.65,rotation);const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);const covers=[mat('#3e4245'),mat('#70443b'),mat('#5c604b')];
  for(let row=0;row<4;row++)for(let i=0;i<10;i++){const h=.38+(i%3)*.055,xx=-.78+i*.17,yy=.63+row*.78;box(xx,yy+h/2,.28,.125,h,.36,covers[(i+row)%3],g);for(const dy of [.075,h-.055])box(xx,yy+dy,.467,.12,.018,.012,metal,g);}
 }
 function desk(x,z){asset('wooden_table_02',x,z,1.35);lamp(x-1,1.96,z-.32);cyl(x+.9,1.46,z-.3,.085,.2,dark);const pen=cyl(x+.7,1.4,z+.3,.012,.55);pen.rotation.z=1.5;}
 const entrance=createRegionEntrance(index,{stone,wood,metal,roof,glow,cloth});entrance.position.z=index===3?-3:15;root.add(entrance);
 const floor=box(0,-.13,index===3?0:3,14,.2,index===3?18:24,index===3?stone:wood);
 const backdrop=new T.MeshBasicMaterial({map:texture(`assets/world/${index===0?'guild':index===2?'archive':'room'}.png`),color:index===3?'#637b98':'#7b8d99'});mesh(new T.PlaneGeometry(40,23),backdrop,0,9,-12);
 if(index!==3){
  // 柱廊、護牆與窗洞有不同深度，近看仍保持空間尺度。
  for(const x of [-6,6])box(x,3,5.4,.28,6,19.4,stone);
  for(const x of [-4.5,4.5])box(x,3,-4.3,3,6,.32,stone);
  box(0,.85,-4.3,6,1.7,.32,stone);box(0,5.45,-4.3,6,1.1,.32,stone);
  for(const x of [-3,-1.5,0,1.5,3]){box(x,3.2,-4.12,.065,3.15,.08,metal);box(x,4.92,-4.1,.10,.1,.12,metal);}
  for(const y of [1.6,3.1,4.8])box(0,y,-4.1,6,.05,.08,metal);
  for(const x of [-5.7,5.7])for(const z of [-3,1,5,9,13]){box(x,3,z,.25,6,.3,wood);for(const y of [.22,5.55])box(x,y,z,.48,.14,.5,metal);lamp(x*.92,2.7,z);}
  box(0,6.12,5.4,12,.16,19.4,dark);
  for(const z of [-3,1,5,9,13]){box(0,5.8,z,12,.3,.25,wood);box(0,5.62,z,12,.028,.28,metal);}
  for(const y of [.12,1.08])box(0,y,-4.04,12,.07,.1,wood);
  box(0,.001,0,7,.012,6,dark);for(const x of [-3.35,3.35])box(x,.013,0,.026,.008,5.7,metal);for(const z of [-2.85,2.85])box(0,.013,z,6.7,.008,.026,metal);
 }
 let views,anchors,overview,entry;
 if(index===0){
  cyl(0,.65,.6,.9,1.25,wood);cyl(0,1.3,.6,2,.16,wood);cyl(0,1.4,.6,1.92,.045,metal);cyl(0,1.435,.6,1.86,.025,dark);
  for(const r of [.55,1.15,1.65])ring(0,1.458,.6,r,.015).rotation.x=-Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,o=box(Math.sin(a)*1.75,1.46,.6+Math.cos(a)*1.75,.022,.015,.1,metal);o.rotation.y=a;}
  const globe=createGalleryArtifact(2,metal);globe.position.set(0,1.45,.6);globe.scale.setScalar(.53);root.add(globe);
  for(const x of [-2.8,2.8]){box(x,.75,.9,.85,.13,.85,wood);for(const dx of [-.33,.33])for(const dz of [-.33,.33])box(x+dx,.36,.9+dz,.06,.7,.06,wood);box(x,1.3,.54,.83,1.1,.09,wood);box(x,1.3,.60,.6,.7,.035,dark);}
  board(-3.1,2.65,-3.65,2.35,2.9,'專長的接力',[['秘書與研究','釐清方向，整理依據'],['內容與投放','把價值說清楚'],['分析與核對','讓判斷可以回查']]);
  board(3.15,2.65,-3.65,2.35,2.9,'交付前核對',[['目標','是否回答原本的問題'],['依據','來源與待確認事項'],['決定','由你核定下一步']]);
  shelves(-5,-2.3,Math.PI/2);closedBook(-1.3,1.58,.9,.55,.12);lamp(1.25,2.08,.75);
  views=[{position:[2.6,4.2,4.6],target:[0,1.6,.6]},{position:[-2.8,2.8,.8],target:[-3.1,2.65,-3.65]},{position:[2.85,2.8,.8],target:[3.15,2.65,-3.65]}];
  anchors=[[0,1.2,2.1],[-3.1,1.1,-3.4],[3.15,1.1,-3.4]];overview={position:[2.7,3.8,9.6],target:[0,2,-.5]};entry=[[5.5,8,32],[0,2.7,18],[0,2.7,13]];
 }else if(index===2){
  for(const x of [-3.9,0,3.9])shelves(x,-3.5);
  desk(-2,.7);book(-2,1.37,.7,-.15,'清楚交辦',[['目標','你想完成什麼'],['背景','誰會使用這份成果'],['交付','限制與核對方式']]);
  closedBook(-1.25,1.52,.05,.55,.2);
  desk(2.4,.6);book(2.3,1.37,.6,.12,'會後行動',[['決定','這次確認了什麼'],['待辦','由誰接手'],['核對','哪些事情還不確定']]);
  for(let i=0;i<3;i++)closedBook(3.2,1.5+i*.14,0,.55,.13);
  board(0,4.4,-3.7,2.35,1.28,'方法的索引',[['協作 · 創作 · 工作流程','從眼前的問題開始']]);
  // 有階梯厚度與金屬端點的閱讀梯。
  for(const x of [.85,1.36]){const rail=box(x,1.6,-2.3,.07,3.2,.09,wood);rail.rotation.x=-.16;}for(let i=0;i<8;i++)box(1.105,.22+i*.37,-2.08-i*.06,.54,.055,.15,wood);
  views=[{position:[-1.3,3.7,3.5],target:[-2,1.4,.7]},{position:[.5,3.3,2],target:[0,2,-3.5]},{position:[2.8,3.7,3.4],target:[2.3,1.4,.6]}];
  anchors=[[-2,1.2,1.9],[0,1,-2.8],[2.4,1.2,1.8]];overview={position:[2.6,3.8,9.5],target:[0,2,-.5]};entry=[[5.5,8,32],[0,2.7,18],[0,2.7,13]];
 }else{
  // 營地保留夜景與天然不規則輪廓，細節集中在可走近的器物。
  for(let i=0;i<22;i++){const a=i*2.399,r=8+(i%4)*.9,o=mesh(new T.DodecahedronGeometry(.65+(i%3)*.23,1),stone,Math.sin(a)*r,.2,Math.cos(a)*r);o.scale.set(1.5,.7,1.2);o.rotation.y=a;}
  for(let i=0;i<11;i++){const a=i*Math.PI*2/11,o=mesh(new T.DodecahedronGeometry(.26,1),stone,Math.sin(a)*1.03,.15,Math.cos(a)*1.03+1.2);o.scale.y=.6;}
  for(let i=0;i<5;i++){const a=i*Math.PI/5,log=cyl(Math.sin(a)*.2,.25,1.2+Math.cos(a)*.2,.13,1.3,wood);log.rotation.set(Math.PI/2,0,a);}
  const amber=new T.MeshBasicMaterial({color:'#e29c46'}),core=new T.MeshBasicMaterial({color:'#ffe0a1'});
  for(let i=0;i<5;i++){const profile=[[.23,0],[.3,.2],[.18,.48],[.13,.7],[0,1.05]].map(([r,y])=>new T.Vector2(r,y)),f=mesh(new T.LatheGeometry(profile,16),i===2?core:amber,(i-2)*.15,.32,1.2+(i%2)*.2);f.scale.setScalar(.7+(i%3)*.13);f.rotation.z=(i-2)*.14;}
  const firelight=new T.PointLight('#ff9c43',12,9,2);firelight.position.set(0,1.4,1.2);scene.add(firelight);
  for(const x of [-2,2]){const seat=cyl(x,.5,2.4,.24,1.6,wood);seat.rotation.z=Math.PI/2;for(const dx of [-.5,.5])cyl(x+dx,.21,2.4,.15,.42,wood);}
  // 閱讀物件移到帳篷前緣，近景視線不再穿過布頂。
  desk(-2.8,-.6);book(-2.8,1.37,-.6,-.12,'探索留下來',[['觀察','先看見真實的問題'],['嘗試','留下選擇與修正'],['分享','讓下一步更清楚']]);
  asset('treasure_chest',3,-.2,.86);board(3,1.95,-.6,1.62,1.9,'開始同行',[['你的目標','說明想完成什麼'],['目前卡點','提供可用的背景'],['下一步','一起整理合作方向']],-.2);
  for(const x of [-4.2,4.2]){cyl(x,.9,3.8,.045,1.8,wood);lamp(x,2,3.8);}
  const rug=box(0,-.015,-3.1,7,.03,4.6,dark);for(const x of [-3.3,3.3])box(x,.005,-3.1,.025,.012,4.25,metal);
  views=[{position:[2.9,2.8,5.1],target:[0,.7,1.2]},{position:[-2.25,3.05,2.5],target:[-2.8,1.4,-.6]},{position:[3.2,2.5,3.5],target:[3,1.7,-.6]}];
  anchors=[[0,.45,2.5],[-2.8,1,.5],[3,.5,.8]];overview={position:[3.8,3.8,10.5],target:[0,1.4,-.5]};entry=[[5,7,24],[0,2.6,12],[0,2.4,7.5]];
 }
 scene.add(new T.HemisphereLight('#b8ccdb','#4c392c',index===3?1.3:1.65));
 // 不投影的冷側光補出書脊和木作輪廓，保留暖燈與暗部的對比。
 const fill=new T.DirectionalLight('#a8bed1',index===3?.45:.68);fill.position.set(5,4,4);fill.target.position.set(-2,1,-2);scene.add(fill,fill.target);
 const key=new T.DirectionalLight('#e7d5b8',index===3?1.7:2.5);key.position.set(-3,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});key.shadow.normalBias=.025;key.shadow.bias=-.0003;scene.add(key);
 const moon=new T.PointLight('#86bce9',13,15,2);moon.position.set(2,4,-3);scene.add(moon);
 const results=await Promise.allSettled(jobs),failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 return {root,views,anchors:anchors.map(a=>new T.Vector3(...a)),overview,entry};
}
