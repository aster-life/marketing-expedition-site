import * as T from './assets/vendor/three.module.min.js';
import {createGLTFLoader,webAsset} from './web-assets.js';
import {createGalleryArtifact} from './gallery-artifacts.js';
import {createRegionEntrance} from './region-entrance.js';
import {createCampfire} from './room-fire.js?v=light-1';
import {applyRoomEnvironment,addHalos,createContactShadows} from './room-light.js?v=light-1';
import {createBookCollector,makeBook} from './room-books.js?v=paper-7';

export async function buildRegionScene(index,scene,owned,renderer){
 const root=new T.Group();scene.add(root);const jobs=[];
 const halos=[],books=createBookCollector(owned),contact=createContactShadows(owned);
 const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const loader=new T.TextureLoader();
 function texture(path,repeat=1,color=true){let done,fail;const p=new Promise((r,j)=>{done=r;fail=j;});jobs.push(p);const t=loader.load(webAsset(path),done,undefined,()=>fail(new Error('素材載入失敗：'+path)));if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;owned.add(t);return t;}
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
  const light=new T.PointLight('#ffba69',2.2,4,2);light.position.set(x,y+.06,z);scene.add(light);halos.push([x,y,z]);
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
 const gltfLoader=createGLTFLoader();const gltfs=new Map();
 function asset(id,x,z,height,rotation=0,shadow=1.25,y=0,onLoad=null){let source=gltfs.get(id);if(!source){source=gltfLoader.loadAsync(webAsset(`3d/hall-assets/${id}/${id}_1k.gltf`));gltfs.set(id,source);}jobs.push(source.then(gltf=>{const model=gltf.scene.clone(true),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());model.position.set(-center.x,-bounds.min.y,-center.z);const wrap=new T.Group();wrap.add(model);wrap.scale.setScalar(height/size.y);wrap.position.set(x,y,z);wrap.rotation.y=rotation;root.add(wrap);onLoad?.(wrap,model);
  // 接觸陰影：依模型實際底面大小鋪一圈柔和暗影
  if(shadow){const k=height/size.y;contact(root,x,z,size.x*k*shadow,size.z*k*shadow,{rotation,y:y>0?y+.004:index===3?.006:.016});}}));}
 function shelves(x,z,rotation=0){asset('wooden_bookshelf_worn',x,z,3.65,rotation,1.05);const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rotation;g.updateMatrix();const gm=g.matrix;
  // 書：圓弧書脊、封板與內縮書頁（room-books.js）；寬高厚不一，每排留空隙，偶爾斜靠或橫疊。
  let seed=Math.round(Math.abs(x*97+z*31))+7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  // 層板頂面高度（以射線量自 wooden_bookshelf_worn，高 3.65 時）；書高不超過上一層板的淨空。
  const boards=[.19,.693,1.188,1.699,2.258,2.942];
  for(let row=0;row<5;row++){let xx=-.82;const yy=boards[row]+.002,room=boards[row+1]-boards[row]-.07;const lean=rnd()<.6?Math.floor(rnd()*6):-1;
   while(xx<.8){const w=.06+rnd()*.07,h=Math.min(room,.28+rnd()*.17),d=.26+rnd()*.12;
    if(rnd()<.1){xx+=.05+rnd()*.08;continue;}
    if(row===(Math.floor(seed%5))&&xx>.45&&rnd()<.5){for(let k=0;k<3;k++){const hw=.3+rnd()*.06,th=.05;books.addBook(gm,xx+hw/2,yy+th/2+.005+k*(th+.004),.28,th,hw,.25,{rotZ:Math.PI/2});}break;}
    if(lean===0&&xx>.3){books.addBook(gm,xx+w/2+.05+h/2*Math.sin(.22),yy+h/2*Math.cos(.22)+w/2*Math.sin(.22),.3,w,h,d,{rotZ:-.22});xx+=w+.08;break;}
    books.addBook(gm,xx+w/2,yy+h/2,.3,w,h,d);
    xx+=w+.004;}}
 }
 // 桌上的油燈（Poly Haven vintage_oil_lamp）：燈芯位置點亮暖光並加光暈；取代原本圓柱拼的桌燈。
 function oilLamp(x,y,z,h=.72){
  const light=new T.PointLight('#ffba69',2.2,4,2);scene.add(light);
  asset('vintage_oil_lamp',x,z,h,0,.55,y,(wrap,model)=>{
   model.traverse(o=>{if(o.isMesh&&/flame/.test(o.material.name)){o.material=o.material.clone();o.material.emissive=new T.Color('#ffd28a');o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=2.2;o.castShadow=false;}
    if(o.isMesh&&/glass/.test(o.material.name))o.castShadow=false;});
   const f=new T.Vector3(x,y+h*.62,z);light.position.copy(f);halos.push(f.toArray());});
 }
 // 平放的書（和書架上的書同一個造型），直接放在桌面上；舊版用方塊拼、還浮在桌面上方 2–9 公分。
 function flatBook(x,y,z,{w=.1,h=.48,d=.36,rot=0,design=0}={}){const b=makeBook({w,h,d,design,owned});b.rotation.set(0,rot,Math.PI/2);b.position.set(x,y+w/2,z);root.add(b);return b;}
 function desk(x,z){asset('wooden_table_02',x,z,1.35);oilLamp(x-.78,1.35,z-.38);cyl(x+.9,1.46,z-.3,.085,.2,dark);const pen=cyl(x+.7,1.4,z+.3,.012,.55);pen.rotation.z=1.5;}
 if(index===3){
  // 帳篷帆布：織紋、縫線與下緣的水漬，取代單色布面。
  const c=document.createElement('canvas');c.width=c.height=512;const a=c.getContext('2d');a.fillStyle='#8f7752';a.fillRect(0,0,512,512);
  let s=41;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let y=0;y<512;y+=3){a.fillStyle=`rgba(255,240,210,${.03+r()*.05})`;a.fillRect(0,y,512,1);}
  for(let x=0;x<512;x+=3){a.fillStyle=`rgba(40,28,14,${.04+r()*.06})`;a.fillRect(x,0,1,512);}
  for(let i=0;i<26;i++){const x=r()*512,y=r()*512,rr=20+r()*70,g=a.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,`rgba(60,40,20,${.08+r()*.1})`);g.addColorStop(1,'rgba(60,40,20,0)');a.fillStyle=g;a.fillRect(x-rr,y-rr,rr*2,rr*2);}
  const stain=a.createLinearGradient(0,380,0,512);stain.addColorStop(0,'rgba(50,34,18,0)');stain.addColorStop(1,'rgba(50,34,18,.35)');a.fillStyle=stain;a.fillRect(0,380,512,132);
  for(const x of [0,256]){a.fillStyle='rgba(45,30,15,.45)';a.fillRect(x,0,5,512);a.fillStyle='rgba(255,235,200,.12)';a.fillRect(x+6,0,1,512);a.setLineDash([5,5]);a.strokeStyle='rgba(230,210,170,.35)';a.lineWidth=1;a.beginPath();a.moveTo(x+10,0);a.lineTo(x+10,512);a.stroke();a.setLineDash([]);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1.5,2);t.anisotropy=4;owned.add(t);cloth.map=t;cloth.color.set('#e4d6bb');cloth.bumpScale=.012;
 }
 const entrance=createRegionEntrance(index,{stone,wood,metal,roof,glow,cloth},{detail:true});entrance.position.z=index===3?-3:15;root.add(entrance);
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
 let views,anchors,overview,entry,propAt=null,propTex=null,campfire=null;const lanterns=[];
 if(index===0){
  contact(root,0,.6,4.6,4.6);cyl(0,.65,.6,.9,1.25,wood);cyl(0,1.3,.6,2,.16,wood);cyl(0,1.4,.6,1.92,.045,metal);cyl(0,1.435,.6,1.86,.025,dark);
  for(const r of [.55,1.15,1.65])ring(0,1.458,.6,r,.015).rotation.x=-Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,o=box(Math.sin(a)*1.75,1.46,.6+Math.cos(a)*1.75,.022,.015,.1,metal);o.rotation.y=a;}
  const globe=createGalleryArtifact(2,metal);globe.position.set(0,1.45,.6);globe.scale.setScalar(.53);root.add(globe);
  for(const x of [-2.8,2.8])asset('WoodenChair_01',x,.9,1.75,x<0?Math.PI/2:-Math.PI/2); // 寫實木椅，面向圓桌
  // 名冊架與可翻面的告示板改由 room-props.js 建立（需要個別動畫，不能併入靜態批次）。
  propTex={review:panel('交付前核對',[['目標','是否回答原本的問題'],['依據','來源與待確認事項'],['決定','由你核定下一步']])};
  shelves(-5,-2.3,Math.PI/2);oilLamp(1.25,1.448,.75);propAt={brief:[-1.2,1.462,1.35],roster:[-2.85,0,-3.3],review:[3.15,2.65,-3.65]};
  views=[{position:[2.6,4.2,4.6],target:[0,1.6,.6]},{position:[-2.8,2.8,.8],target:[-3.1,2.65,-3.65]},{position:[2.85,2.8,.8],target:[3.15,2.65,-3.65]}];
  anchors=[[0,1.2,2.1],[-3.1,1.1,-3.4],[3.15,1.1,-3.4]];overview={position:[2.7,3.8,9.6],target:[0,2,-.5]};entry=[[5.5,8,32],[0,2.7,18],[0,2.7,13]];
 }else if(index===2){
  for(const x of [-3.9,0,3.9])shelves(x,-3.5);
  desk(-2,.7); // 桌上的交辦卷軸由 room-props-2.js 建立
  asset('binder_notebook',-1.95,.21,.03,0,.9,1.35); // 皮面活頁筆記本＋闔上的筆記本（Poly Haven）
  asset('wooden_candlestick',-2.82,.95,.36,0,.6,1.35);
  desk(2.4,.6); // 桌上的會議便條卡由 room-props-2.js 建立
  [0,4,6].forEach((k,i)=>flatBook(3.16,1.35+i*.104,.28,{w:.1,h:.46,d:.32,rot:Math.PI/2+(i-1)*.12,design:k}));
  board(0,4.4,-3.7,2.35,1.28,'方法的索引',[['協作 · 創作 · 工作流程','從眼前的問題開始']]);
  // 有階梯厚度與金屬端點的閱讀梯，靠在右側書架上。原本立在中間書架右前方，會擋住「方法書架」第 5–6 本的掛牌。
  const lx=3.9;for(const x of [lx-.255,lx+.255]){const rail=box(x,1.6,-2.3,.07,3.2,.09,wood);rail.rotation.x=-.16;}for(let i=0;i<8;i++)box(lx,.22+i*.37,-2.08-i*.06,.54,.055,.15,wood);
  propAt={scroll:[-2,1.355,.72],shelf:[0,0,-3.5],cards:[2.35,1.355,.62]};
  views=[{position:[-1.3,3.7,3.5],target:[-2,1.4,.7]},{position:[.5,3.3,2],target:[0,2,-3.5]},{position:[2.8,3.7,3.4],target:[2.3,1.4,.6]}];
  anchors=[[-2,1.2,1.9],[0,1,-2.8],[2.4,1.2,1.8]];overview={position:[2.6,3.8,9.5],target:[0,2,-.5]};entry=[[5.5,8,32],[0,2.7,18],[0,2.7,13]];
 }else{
  // 營地保留夜景與天然不規則輪廓，細節集中在可走近的器物。
  // 營地外圍：長青苔的石堆（寫實模型），取代低面數多面體
  for(const [a,r,hh] of [[.7,8.6,1.5],[2.2,9.2,1.9],[3.6,8.4,1.4],[5.1,9,1.7]])asset('rock_moss_set_02',Math.sin(a)*r,Math.cos(a)*r,hh,a);
  // 石砌火坑與乾柴（寫實模型），火焰改成會動的火舌與火星
  asset('stone_fire_pit',0,1.2,.42);asset('dry_branches_medium_01',0,1.2,.38,.6);
  const firelight=new T.PointLight('#ff9c43',12,9,2);firelight.position.set(0,1.4,1.2);scene.add(firelight);
  campfire=createCampfire({at:[0,.18,1.2],scale:.85,light:firelight});scene.add(campfire.group);
  // 火邊的座位：兩張露營折凳（寫實模型）；原本的樹樁貼圖滿是落葉碎石，縮小後看起來像石頭。
  asset('folding_wooden_stool',-2,2.4,.5,.5);asset('folding_wooden_stool',2,2.4,.5,-.7);
  // 閱讀物件移到帳篷前緣，近景視線不再穿過布頂。
  desk(-2.8,-.6);flatBook(-2.6,1.35,-.55,{w:.1,h:.46,d:.34,rot:.2,design:1});asset('wooden_candlestick',-2.25,-1.0,.36,0,.6,1.35); // 燭台放右後方，避開筆和墨水瓶 // 桌後的照片繩由 room-props-2.js 建立
  asset('wooden_bucket_01',-2.75,2.95,.4,.5,1.1,-.03); // 營地的木水桶（Poly Haven）
  asset('treasure_chest',3,-.2,.86);contact(root,0,1.2,2.6,2.6,{y:.006}); // 火坑周圍燒黑的地面 // 寶箱上的邀請信由 room-props-2.js 建立
  // 營地兩側的木提燈（寫實模型）掛在木樁的橫臂上，燈芯另外點亮。
  for(const x of [-4.2,4.2]){cyl(x,1.05,3.8,.05,2.1,wood);const arm=box(x-Math.sign(x)*.17,2.08,3.8,.4,.05,.05,wood);
   const lx=x-Math.sign(x)*.32;cyl(lx,2,3.8,.006,.12,metal);asset('wooden_lantern_01',lx,3.8,.42,0,0,1.52);lanterns.push([lx,1.71,3.8]);
   const glowLight=new T.PointLight('#ffb35c',2.4,4.5,2);glowLight.position.set(lx,1.71,3.8);scene.add(glowLight);mesh(new T.SphereGeometry(.035,10,8),glow,lx,1.7,3.8,scene).castShadow=false;}
  const rug=box(0,-.015,-3.1,7,.03,4.6,dark);for(const x of [-3.3,3.3])box(x,.005,-3.1,.025,.012,4.25,metal);
  propAt={plaques:[0,0,1.2],photos:[-2.8,1.355,-.6],letter:[3,.86,-.2]};
  views=[{position:[2.9,2.8,5.1],target:[0,.7,1.2]},{position:[-2.25,3.05,2.5],target:[-2.8,1.4,-.6]},{position:[3.2,2.5,3.5],target:[3,1.7,-.6]}];
  anchors=[[0,.45,2.5],[-2.8,1,.5],[3,.5,.8]];overview={position:[3.8,3.8,10.5],target:[0,1.4,-.5]};entry=[[5,7,24],[0,2.6,12],[0,2.4,7.5]];
 }
 scene.add(new T.HemisphereLight('#b8ccdb','#4c392c',index===3?1.3:1.65));
 // 不投影的冷側光補出書脊和木作輪廓，保留暖燈與暗部的對比。
 const fill=new T.DirectionalLight('#a8bed1',index===3?.45:.68);fill.position.set(5,4,4);fill.target.position.set(-2,1,-2);scene.add(fill,fill.target);
 const key=new T.DirectionalLight('#e7d5b8',index===3?1.7:2.5);key.position.set(-3,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});key.shadow.normalBias=.025;key.shadow.bias=-.0003;scene.add(key);
 const moon=new T.PointLight('#86bce9',13,15,2);moon.position.set(2,4,-3);scene.add(moon);
 const results=await Promise.allSettled(jobs),failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 // 光線與環境：反光環境、燈火光暈、書本實例化。營地是夜景，環境較暗、火光暈較大。
 const environment=renderer?applyRoomEnvironment(renderer,scene,index===3?{night:true,intensity:.45}:{intensity:.6}):null;
 addHalos(scene,halos,{size:2.4,opacity:.85});
 if(lanterns.length)addHalos(scene,lanterns,{size:2.2,opacity:.9});
 if(campfire)addHalos(scene,[[0,.75,1.2]],{color:'#ff9a45',size:6,opacity:.5,push:1});
 books.build(scene);
 return {root,views,anchors:anchors.map(a=>new T.Vector3(...a)),overview,entry,propAt,propTex,tick:campfire?campfire.tick:null,dispose(){environment?.dispose();}};
}
