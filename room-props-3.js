import * as T from './assets/vendor/three.module.min.js';
import {webAsset} from './web-assets.js';
import {registerProp} from './room-props.js?v=paper-4';

// 星港展廳的近景物件：畫框裡依序滑入網站實際畫面、放大鏡移到提案手稿上、診斷板釘上卡片並拉起金線。
// 網站畫面是這個網站自己的截圖；提案與診斷沿用作品頁的教學示範，紙上標明「教學示範」。
const SANS='"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif',SERIF='"Noto Serif TC","PMingLiU",serif';
const v3=(x,y,z)=>new T.Vector3(x,y,z),ease=t=>t*t*(3-2*t),clamp01=t=>Math.min(1,Math.max(0,t));
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function tex(c,owned,anisotropy){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;owned?.add(t);return t;}
function wrap(a,text,x,y,maxW,lh){let line='';const out=[];for(const ch of String(text)){if(a.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}if(line)out.push(line);out.forEach((l,i)=>a.fillText(l,x,y+i*lh));return y+out.length*lh;}
function parchment(a,w,h,seed=233){const g=a.createLinearGradient(0,0,w,h);g.addColorStop(0,'#efe3c6');g.addColorStop(.7,'#e1cfa8');g.addColorStop(1,'#d2bd92');a.fillStyle=g;a.fillRect(0,0,w,h);let s=seed;for(let i=0;i<w*h/90;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=s%w;s=(Math.imul(s,1664525)+1013904223)>>>0;a.fillStyle=i%2?'#ffffff0e':'#6b52300c';a.fillRect(x,s%h,2,2);}}
const paperMat=(t,glow=.18)=>new T.MeshStandardMaterial({map:t,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:glow,roughness:.9,side:T.DoubleSide});
const brass=()=>new T.MeshStandardMaterial({color:'#b8914f',metalness:.8,roughness:.3});
function mesh(geo,mat,parent,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
// 物件在牆上或斜放時，用群組的旋轉把局部座標換成世界座標。
const world=(g,x,y,z)=>{g.updateMatrixWorld(true);return g.localToWorld(v3(x,y,z));};
const worldDir=(g,x,y,z)=>v3(x,y,z).applyQuaternion(g.getWorldQuaternion(new T.Quaternion())).normalize();

// ── 01 網站作品 ── 大畫框裡依序滑入三張網站畫面，像分鏡一樣說明這個網站怎麼做出來。
const SHOTS=[['assets/works/site-film.webp','01 開場影片','從一束光走進大廳，胖幼和美鈴帶路。'],['assets/works/site-map.webp','02 3D 地圖','四個地點連成一段路，點選就能前往。'],['assets/works/site-room.webp','03 近看物件','走進房間，物件本身會打開給你看。']];
function siteProp({at,rotation=0,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);g.rotation.y=rotation;const W=3.5,H=2.0,cw=1.08,ch=1.36,cards=[];
 const back=mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({color:'#0e1a22',roughness:.9,transparent:true,opacity:0}),g,0,0,.03);back.castShadow=false;back.visible=false;
 const loader=new T.TextureLoader();
 SHOTS.forEach(([img,h,t],i)=>{
  const [c,a]=canvas(720,906);a.fillStyle='#f2eadb';a.fillRect(0,0,720,906);a.fillStyle='#1a252c';a.fillRect(28,28,664,415);
  a.fillStyle='#7a5a2a';a.font=`600 40px ${SANS}`;a.fillText(h,40,520);a.fillStyle='#1f2a2e';a.font=`36px ${SANS}`;wrap(a,t,40,590,640,52);
  a.strokeStyle='#8c724766';a.lineWidth=2;a.beginPath();a.moveTo(40,800);a.lineTo(680,800);a.stroke();a.fillStyle='#7d725c';a.font=`28px ${SANS}`;a.fillText('你現在看的這個網站',40,852);
  const map=tex(c,owned,anisotropy);
  loader.load(webAsset(img),it=>{a.drawImage(it.image,28,28,664,415);map.needsUpdate=true;it.dispose();});
  const m=mesh(new T.PlaneGeometry(cw,ch),paperMat(map,.22),g,(i-1)*(cw+.08),0,.06);m.castShadow=false;m.userData.keepShape=true;cards.push(m); // 裱在畫框裡，不捲曲
 });
 function setOpen(v){back.material.opacity=ease(clamp01(v*3));back.visible=v>.001;cards.forEach((m,i)=>{const k=ease(clamp01(v*1.6-i*.25));m.position.y=-(1-k)*1.6;m.position.z=.06+(1-k)*.4;m.rotation.x=(1-k)*.5;m.visible=k>.01;});}
 const n=worldDir(g,0,.04,1);
 return {group:g,setOpen,openDuration:1700,whole:{c:world(g,0,0,0),w:W+.3,h:H+.3,n,k:1.04},
  frames:SHOTS.map(([,h],i)=>({c:world(g,(i-1)*(cw+.08),0,0),w:cw+.25,h:ch+.2,n,label:h.slice(3)}))};
}

// ── 02 提案手稿 ── 桌上一張內容提案，放大鏡從旁邊滑過來，停在紙上。
const PROPOSAL=[['讀者的困擾','不知道要準備什麼資料，也不確定要多早開始討論。'],['內容主軸','用「從想法到確認稿」的過程圖，逐步說明需要的資訊。'],['可交付內容','一篇流程說明、圖片需求清單與常見問題草稿。'],['下一步','由品牌確認工期與費用，再安排發布；不把未確認的交期寫成承諾。']];
function proposalProp({at,rotation=0,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);g.rotation.y=rotation;const W=1.12,D=.8,[c,a]=canvas(1400,1000);parchment(a,1400,1000);
 a.fillStyle='#7a5a2a';a.font=`30px ${SANS}`;a.fillText('內容提案 · 教學示範（虛構情境）',60,74);
 a.fillStyle='#1f2a2e';a.font=`600 52px ${SERIF}`;a.fillText('讓第一次買手作的人，看懂客製流程',60,150);
 PROPOSAL.forEach(([h,t],i)=>{const x=60+(i%2)*660,y=230+Math.floor(i/2)*360;a.strokeStyle='#8c724788';a.lineWidth=3;a.strokeRect(x,y,620,320);
  a.fillStyle='#6e4f22';a.font=`600 44px ${SANS}`;a.fillText(`0${i+1}  ${h}`,x+34,y+70);a.fillStyle='#2a2a24';a.font=`38px ${SANS}`;wrap(a,t,x+34,y+140,552,56);});
 const sheet=mesh(new T.PlaneGeometry(W,D),paperMat(tex(c,owned,anisotropy),.16),g,0,.006,0);sheet.rotation.x=-Math.PI/2;
 // 放大鏡：黃銅鏡框、微帶反光的鏡片與木柄
 const glass=new T.Group();g.add(glass);
 const ring=mesh(new T.TorusGeometry(.17,.016,12,48),brass(),glass,0,0,0);ring.rotation.x=Math.PI/2;
 const lens=mesh(new T.CircleGeometry(.165,40),new T.MeshPhysicalMaterial({color:'#ffffff',transmission:.9,transparent:true,opacity:.18,roughness:.05,metalness:0}),glass,0,0,0);lens.rotation.x=-Math.PI/2;lens.castShadow=false;
 const handle=mesh(new T.CylinderGeometry(.022,.026,.3,12),new T.MeshStandardMaterial({color:'#3e2a1e',roughness:.6}),glass,.31,0,.12);handle.rotation.z=Math.PI/2;handle.rotation.y=-.35;
 const from=v3(.95,.06,.42),to=v3(-.27,.09,-.12);
 function setOpen(v){const e=ease(clamp01(v));glass.position.lerpVectors(from,to,e);glass.position.y+=Math.sin(e*Math.PI)*.14;glass.rotation.y=(1-e)*.9;}
 const n=worldDir(g,0,.88,.48);
 return {group:g,setOpen,openDuration:1300,whole:{c:world(g,0,.01,0),w:W+.3,h:D+.18,n,k:1.12},
  frames:[{c:world(g,0,.01,-D/4),w:W+.08,h:D/2+.1,n,label:'困擾・主軸'},{c:world(g,0,.01,D/4),w:W+.08,h:D/2+.1,n,label:'交付・下一步'}]};
}

// ── 03 診斷筆記 ── 畫架上的診斷板依序釘上四張卡片，金線把「發現 → 建議 → 核對 → 決定」串起來。
const DIAG=[['發現','首頁有品牌故事，但主要產品與下一步入口不清楚。'],['建議','先讓首屏回答「提供什麼、適合誰、如何繼續」。'],['如何核對','請第一次接觸的人看首頁，記下他會點哪裡、卡在哪裡。'],['需要你決定','首要目標是看商品，還是先了解訂製服務？']];
function diagnosisProp({at,rotation=0,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);g.rotation.y=rotation;const W=1.7,H=2.2;
 const [bc,ba]=canvas(680,880);ba.fillStyle='#5b4330';ba.fillRect(0,0,680,880);let s=91;for(let i=0;i<9000;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;ba.fillStyle=i%3?'#00000014':'#ffffff10';ba.fillRect(s%680,(s>>>10)%880,3,3);}
 ba.fillStyle='#e8d3a6';ba.font=`28px ${SANS}`;ba.fillText('網站診斷 · 教學示範',36,56);
 const board=mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({map:tex(bc,owned,anisotropy),roughness:.95}),g,0,0,.03);board.castShadow=false;
 const slots=[[-.4,.55],[.4,.2],[-.4,-.2],[.4,-.6]],cards=[],pins=[];
 DIAG.forEach(([h,t],i)=>{const [c,a]=canvas(640,440);a.fillStyle=i===3?'#f3dcc2':'#f2eadb';a.fillRect(0,0,640,440);a.fillStyle=i===3?'#a2402f':'#7a5a2a';a.fillRect(0,0,640,18);
  a.fillStyle=i===3?'#a2402f':'#6e4f22';a.font=`600 52px ${SANS}`;a.fillText(`0${i+1}  ${h}`,34,100);a.fillStyle='#1f2a2e';a.font=`40px ${SANS}`;wrap(a,t,34,180,572,58);
  const m=mesh(new T.PlaneGeometry(.74,.51),paperMat(tex(c,owned,anisotropy),.16),g,slots[i][0],slots[i][1],.05);m.castShadow=false;m.userData.keepShape=true;cards.push(m); // 釘在軟木板上，不捲曲
  pins.push(mesh(new T.SphereGeometry(.028,12,8),new T.MeshStandardMaterial({color:i===3?'#a2402f':'#c9a25c',metalness:.5,roughness:.4}),g,slots[i][0],slots[i][1]+.2,.08));});
 // 金線：相鄰卡片的圖釘之間，逐段拉出
 const threads=[];for(let i=0;i<3;i++){const a=v3(slots[i][0],slots[i][1]+.2,.085),b=v3(slots[i+1][0],slots[i+1][1]+.2,.085),len=a.distanceTo(b);
  const line=mesh(new T.CylinderGeometry(.006,.006,1,6),new T.MeshStandardMaterial({color:'#e2b45f',emissive:'#a8782e',emissiveIntensity:.6}),g,0,0,0);line.castShadow=false;
  line.userData={a,b,len};threads.push(line);}
 function setOpen(v){cards.forEach((m,i)=>{const k=ease(clamp01(v*1.7-i*.22));m.position.z=.05+(1-k)*.5;m.rotation.z=(1-k)*.4*(i%2?1:-1);m.visible=k>.01;pins[i].visible=k>.85;});
  threads.forEach((l,i)=>{const k=ease(clamp01(v*1.7-.75-i*.15)),{a,b,len}=l.userData;const end=a.clone().lerp(b,k);l.position.copy(a).lerp(end,.5);l.scale.y=Math.max(.001,len*k);l.quaternion.setFromUnitVectors(v3(0,1,0),b.clone().sub(a).normalize());l.visible=k>.01;});}
 const n=worldDir(g,0,.05,1);
 return {group:g,setOpen,openDuration:1900,whole:{c:world(g,0,0,0),w:W+.3,h:H+.3,n,k:1.03},
  frames:[{c:world(g,0,.38,0),w:W+.1,h:1.05,n,label:'發現・建議'},{c:world(g,0,-.4,0),w:W+.1,h:1.05,n,label:'核對・決定'}]};
}

registerProp('site',siteProp);registerProp('proposal',proposalProp);registerProp('diagnosis',diagnosisProp);
