import * as T from './assets/vendor/three.module.min.js';
import {webAsset} from './web-assets.js';
import {registerProp} from './room-props.js?v=props-2';

// 典籍山谷與營火之地的近景物件。每一件用不同的「打開方式」：卷軸展開、書抽出掛牌、卡片分類、
// 木牌升起、照片垂掛、信從信封升起。內容取自網站上既有的文章、示範與說明，不另外編造成果。
const SANS='"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif',SERIF='"Noto Serif TC","PMingLiU",serif';
const v3=(x,y,z)=>new T.Vector3(x,y,z),ease=t=>t*t*(3-2*t),clamp01=t=>Math.min(1,Math.max(0,t));
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function tex(c,owned,anisotropy){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;owned?.add(t);return t;}
function wrap(a,text,x,y,maxW,lh){let line='';const out=[];for(const ch of String(text)){if(a.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}if(line)out.push(line);out.forEach((l,i)=>a.fillText(l,x,y+i*lh));return y+out.length*lh;}
function parchment(a,w,h,seed=771){const g=a.createLinearGradient(0,0,w,h);g.addColorStop(0,'#efe3c6');g.addColorStop(.7,'#e1cfa8');g.addColorStop(1,'#d2bd92');a.fillStyle=g;a.fillRect(0,0,w,h);let s=seed;for(let i=0;i<w*h/90;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=s%w;s=(Math.imul(s,1664525)+1013904223)>>>0;a.fillStyle=i%2?'#ffffff0e':'#6b52300c';a.fillRect(x,s%h,2,2);}}
// 書頁、紙張受場景燈光影響，再加一點自發光，確保暗處仍讀得清楚。
function paperMat(t,glow=.32){return new T.MeshStandardMaterial({map:t,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:glow,roughness:.92,side:T.DoubleSide});}
const wood=()=>new T.MeshStandardMaterial({color:'#4b3526',roughness:.72}),brass=()=>new T.MeshStandardMaterial({color:'#b8914f',metalness:.75,roughness:.35});
function mesh(geo,mat,parent,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}

// ── 典籍山谷 01：交辦卷冊 ── 卷軸在桌上向兩側展開，攤開四格任務交辦法的示範。
function scrollProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);const W=1.24,D=.8,[c,a]=canvas(1600,1032);parchment(a,1600,1032);
 a.fillStyle='#7a5a2a';a.font=`32px ${SANS}`;a.fillText('四格任務交辦法 · 示範',70,84);
 a.fillStyle='#1f2a2e';a.font=`600 52px ${SERIF}`;a.fillText('「幫我寫三篇貼文」，再多寫四格：',70,160);
 const box=[['目標','讓第一次聽到我們的人，理解產品適合什麼情境。'],['素材','可用產品照片與三則客人回饋；價格還沒確認，先標「未定」。'],['交付','三篇 IG 貼文草稿，每篇附一張建議圖片。'],['驗收','沒聽過我們的人讀完，說得出產品適合誰。']];
 box.forEach(([h,t],i)=>{const x=70+(i%2)*740,y=220+Math.floor(i/2)*360;a.strokeStyle='#8c7247aa';a.lineWidth=3;a.strokeRect(x,y,700,320);
  a.fillStyle='#7a5a2a';a.beginPath();a.arc(x+52,y+58,26,0,Math.PI*2);a.fill();a.fillStyle='#f3e6c8';a.font='600 30px Georgia';a.textAlign='center';a.fillText(String(i+1),x+52,y+69);a.textAlign='left';
  a.fillStyle='#6e4f22';a.font=`600 46px ${SANS}`;a.fillText(h,x+98,y+74);a.fillStyle='#2a2a24';a.font=`40px ${SANS}`;wrap(a,t,x+40,y+150,620,58);});
 a.fillStyle='#5b5240';a.font=`32px ${SANS}`;a.fillText('不知道的地方，直接寫「未定」；收到結果時，先看有沒有回答最初的問題。',70,988);
 const t=tex(c,owned,anisotropy),sheet=mesh(new T.PlaneGeometry(W,D),paperMat(t,.16),g,0,.012,0);sheet.rotation.x=-Math.PI/2;
 const rollers=[-1,1].map(s=>{const r=mesh(new T.CylinderGeometry(.045,.045,D+.08,18),wood(),g,0,.045,0);r.rotation.x=Math.PI/2;
  for(const dz of [-1,1])mesh(new T.CylinderGeometry(.055,.055,.03,18),brass(),r,0,dz*(D/2+.05),0);return {r,s};});
 function setOpen(v){const e=ease(v);sheet.scale.x=Math.max(.02,e);t.repeat.x=Math.max(.02,e);t.offset.x=(1-Math.max(.02,e))/2;rollers.forEach(({r,s})=>{r.position.x=s*(.035+(W/2)*e);r.rotation.y=s*e*7;});}
 const n=v3(.06,.86,.5).normalize(),y=at[1]+.02;
 return {group:g,setOpen,openDuration:1200,whole:{c:v3(at[0],y,at[2]),w:W+.22,h:D+.12,n,k:1.12},
  frames:[{c:v3(at[0]-W/4,y,at[2]),w:W/2+.1,h:D+.08,n,label:'目標・素材'},{c:v3(at[0]+W/4,y,at[2]),w:W/2+.1,h:D+.08,n,label:'交付・驗收'}]};
}

// ── 典籍山谷 02：方法書架 ── 六本書從架前的展示檯往前滑出，上方升起寫著篇名的掛牌。
const SHELF=[['交辦方法','第一次交辦就上手：四格任務交辦法','把「幫我做一下」變成有目標、有完成條件的交辦。','#6b2f2a'],
 ['AI 入門','挑 AI 同事前，先寫下你要交付什麼','先定義任務，再比較工具。','#2d4a43'],
 ['工作流程','從會議紀錄，整理出真正可追蹤的行動','決定、負責人、期限與待確認事項。','#3b3f63'],
 ['交辦方法','做簡報之前，先讓大綱有一個目的','從聽眾要做的決定，倒推每一頁。','#5a3a22'],
 ['工作流程','自動化週報前，先把人工流程走順','資料來源、計算方式與異常處理說清楚。','#2f4c5e'],
 ['內容創作','AI 寫作：把初稿、查證與改稿分開','每一輪只處理一種問題。','#6a4a2a']];
function shelfProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);const W=2.9,ledgeY=1.2,z=.62,gap=W/SHELF.length;
 mesh(new T.BoxGeometry(W+.16,.06,.42),wood(),g,0,ledgeY,z);mesh(new T.BoxGeometry(W+.18,.03,.44),brass(),g,0,ledgeY+.045,z);
 for(const s of [-1,1])mesh(new T.BoxGeometry(.06,ledgeY,.4),wood(),g,s*W/2,ledgeY/2,z);
 const books=[],tags=[],frames=[];
 SHELF.forEach(([cat,title,line,color],i)=>{
  const x=-W/2+gap*(i+.5);
  const [sc,sa]=canvas(160,560);sa.fillStyle=color;sa.fillRect(0,0,160,560);sa.fillStyle='#d9b770';sa.fillRect(0,40,160,6);sa.fillRect(0,514,160,6);sa.save();sa.translate(96,90);sa.rotate(Math.PI/2);sa.font=`600 40px ${SANS}`;sa.fillStyle='#f0dcb0';sa.fillText(cat,0,0);sa.restore();
  const cover=new T.MeshStandardMaterial({color,roughness:.6}),spine=new T.MeshStandardMaterial({map:tex(sc,owned,anisotropy),roughness:.6});
  const book=mesh(new T.BoxGeometry(.17,.56,.36),[cover,cover,cover,cover,spine,cover],g,x,ledgeY+.06+.28,z);books.push({book,z});
  const [tc,ta]=canvas(600,760);parchment(ta,600,760,300+i);ta.strokeStyle='#8c7247aa';ta.lineWidth=4;ta.strokeRect(14,14,572,732);
  ta.fillStyle='#7a5a2a';ta.font='34px Georgia';ta.fillText('0'+(i+1),40,78);ta.font=`32px ${SANS}`;ta.fillText(cat,110,76);
  ta.fillStyle='#1f2a2e';ta.font=`600 46px ${SERIF}`;const y2=wrap(ta,title,40,170,520,64);ta.fillStyle='#4a4232';ta.font=`36px ${SANS}`;wrap(ta,line,40,y2+40,520,52);
  ta.fillStyle='#8c7247';ta.beginPath();ta.arc(300,0,22,0,Math.PI*2);ta.fill();
  const tag=mesh(new T.PlaneGeometry(gap-.05,(gap-.05)*760/600),paperMat(tex(tc,owned,anisotropy),.3),g,x,ledgeY+.95,z+.1);tag.castShadow=false;tags.push(tag);
  const string=mesh(new T.CylinderGeometry(.004,.004,.32,6),brass(),tag,0,(gap-.05)*760/600/2+.16,0);string.castShadow=false;
 });
 for(let i=0;i<3;i++){const x=-W/2+gap*(i*2+1);frames.push({c:v3(at[0]+x,at[1]+ledgeY+.7,at[2]+z),w:gap*2+.1,h:1.25,n:v3(.1,.12,1).normalize(),label:`第 ${i*2+1}–${i*2+2} 本`});}
 function setOpen(v){books.forEach(({book,z:bz},i)=>{const k=ease(clamp01(v*1.5-i*.08));book.position.z=bz+.16*k;book.rotation.x=.12*k;});
  tags.forEach((tag,i)=>{const k=ease(clamp01(v*1.6-.3-i*.1));tag.scale.setScalar(Math.max(.001,k));tag.position.y=1.2+.95-(1-k)*.4;tag.rotation.z=Math.sin(k*Math.PI)*.08*(i%2?1:-1);});}
 return {group:g,setOpen,openDuration:1600,whole:{c:v3(at[0],at[1]+ledgeY+.62,at[2]+z),w:W+.3,h:1.6,n:v3(.08,.14,1).normalize(),k:1.05},frames};
}

// ── 典籍山谷 03：實作書桌 ── 一疊會議便條卡飛出，分到「已決定／行動／待確認」三欄。
const CARDS=[[0,'新品先發 IG，不做直播'],[0,'第一篇主打使用情境'],[1,'寫三篇草稿｜內容專家｜週五'],[1,'確認預購頁網址｜你｜週三'],[1,'整理客人回饋｜秘書｜週四'],[2,'要不要加廣告？金額待你核准'],[2,'上市日是 10/30 嗎？待確認']];
const COLS=[['已決定','#7a5a2a'],['行動｜誰｜何時','#2f4c5e'],['待確認','#a2402f']];
function cardsProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);const CW=.36,CH=.22,colX=[-.46,0,.46],cards=[],frames=[];
 const card=(text,color,head)=>{const [c,a]=canvas(720,440);a.fillStyle=head?color:'#f1e7cf';a.fillRect(0,0,720,440);if(!head){a.fillStyle=color;a.fillRect(0,0,720,22);}
  a.fillStyle=head?'#f3e6c8':'#14181a';a.font=head?`600 66px ${SANS}`:`600 50px ${SANS}`;if(head){a.textAlign='center';a.fillText(text,360,250);a.textAlign='left';}else wrap(a,text,44,130,632,70);return tex(c,owned,anisotropy);};
 COLS.forEach(([h,color],i)=>{const m=mesh(new T.PlaneGeometry(CW,CH*.62),paperMat(card(h,color,true),.25),g,colX[i],.004,-.3);m.rotation.x=-Math.PI/2;m.userData.target=m.position.clone();cards.push({m,from:v3(.62,.02+i*.004,.22),to:m.position.clone(),i:i});});
 const rows=[0,0,0];
 CARDS.forEach(([col,text],k)=>{const m=mesh(new T.PlaneGeometry(CW,CH),paperMat(card(text,COLS[col][1],false),.1),g,0,0,0);m.rotation.x=-Math.PI/2;const to=v3(colX[col],.006+rows[col]*.001,-.12+rows[col]*.25);rows[col]++;cards.push({m,from:v3(.62,.03+(k+3)*.004,.22),to,i:k+3});});
 cards.forEach(({m,from})=>m.position.copy(from));
 COLS.forEach(([h],i)=>frames.push({c:v3(at[0]+colX[i],at[1]+.02,at[2]+.1),w:CW+.18,h:.82,n:v3(.1,.9,.45).normalize(),label:h.split('｜')[0]}));
 function setOpen(v){cards.forEach(({m,from,to,i})=>{const k=ease(clamp01(v*1.8-i*.09));m.position.lerpVectors(from,to,k);m.position.y+=Math.sin(k*Math.PI)*.18;m.rotation.z=(1-k)*.35*(i%2?1:-1);});}
 return {group:g,setOpen,openDuration:1700,whole:{c:v3(at[0],at[1]+.02,at[2]+.05),w:1.5,h:.95,n:v3(.12,.88,.48).normalize(),k:1.12},frames};
}

// ── 營火之地 01：營火故事 ── 營火旁升起三塊木牌，刻著團隊做事的三個原則。
const PRINCIPLES=[['說人話','每個術語，都應該能翻成對工作有用的意思。'],['留下依據','讓讀者分辨觀察、推論與仍待確認的地方。'],['保留選擇','建議可以有立場，重要的決定仍由你做。']];
function plaquesProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);const posts=[],frames=[];
 PRINCIPLES.forEach(([h,t],i)=>{
  const x=(i-1)*1.18,z=-1.05+Math.abs(i-1)*.25,post=new T.Group();post.position.set(x,0,z);post.rotation.y=-(i-1)*.22;g.add(post);
  mesh(new T.CylinderGeometry(.05,.06,2.05,10),wood(),post,0,1.0,-.05);
  const [c,a]=canvas(900,560);const gr=a.createLinearGradient(0,0,0,560);gr.addColorStop(0,'#6a4a32');gr.addColorStop(1,'#4c3424');a.fillStyle=gr;a.fillRect(0,0,900,560);
  for(let k=0;k<14;k++){a.strokeStyle='#00000018';a.lineWidth=2;a.beginPath();a.moveTo(0,40*k+12);a.bezierCurveTo(300,40*k+30,600,40*k-6,900,40*k+16);a.stroke();}
  a.strokeStyle='#d9b770aa';a.lineWidth=5;a.strokeRect(22,22,856,516);a.fillStyle='#d9b770';a.font='44px Georgia';a.fillText('0'+(i+1),64,112);
  a.fillStyle='#f6e4bd';a.font=`600 78px ${SERIF}`;a.fillText(h,150,118);a.fillStyle='#efe0c2';a.font=`46px ${SANS}`;wrap(a,t,64,240,772,68);
  const board=mesh(new T.BoxGeometry(1.0,.62,.05),[wood(),wood(),wood(),wood(),new T.MeshStandardMaterial({map:tex(c,owned,anisotropy),emissive:'#ffffff',emissiveMap:null,emissiveIntensity:0,roughness:.8}),wood()],post,0,1.62,0);
  board.material[4].emissiveMap=board.material[4].map;board.material[4].emissiveIntensity=.28;posts.push(post);
  const wp=v3(x,1.62,z).applyAxisAngle(v3(0,1,0),0).add(v3(...at));frames.push({c:wp,w:1.15,h:.8,n:v3(Math.sin(-(i-1)*.22)*.9,.2,Math.cos((i-1)*.22)).normalize(),label:h});
 });
 const flare=new T.PointLight('#ffb35c',0,6,2);flare.position.set(0,1.1,0);g.add(flare);
 function setOpen(v){posts.forEach((p,i)=>{const k=ease(clamp01(v*1.5-i*.18));p.position.y=-2.15*(1-k);});flare.intensity=Math.sin(clamp01(v)*Math.PI)*14+clamp01(v)*3;}
 return {group:g,setOpen,openDuration:1500,whole:{c:v3(at[0],at[1]+1.35,at[2]-1),w:3.6,h:2.0,n:v3(.25,.28,1).normalize(),k:1.04},frames};
}

// ── 營火之地 02：旅人筆記 ── 書桌後方拉起一條繩子，幾張照片依序垂掛下來，各是一則遠征誌。
const PHOTOS=[['assets/world/guild.webp','2026.09.10｜網站設計','從製圖室，走向完整的奇幻國度。'],['assets/world/room.webp','探索中的方向','營火集會與訓練場：尚未開放，有確定資訊才會更新。'],[null,'下一張','留給下一段旅程。']];
function photosProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(at[0]+.75,at[1],at[2]-.15);const ropeY=1.5,z=-.62,span=2.3,photos=[],frames=[];const ox=.75,oz=-.15;
 for(const s of [-1,1]){mesh(new T.CylinderGeometry(.035,.04,ropeY+1.4,8),wood(),g,s*span/2,(ropeY-1.36)/2+.05,z);}
 const rope=mesh(new T.CylinderGeometry(.008,.008,span,6),new T.MeshStandardMaterial({color:'#c9b08a',roughness:.9}),g,0,ropeY,z);rope.rotation.z=Math.PI/2;
 const loader=new T.TextureLoader();
 PHOTOS.forEach(([img,h,caption],i)=>{
  const x=(i-1)*.74,[c,a]=canvas(600,740);a.fillStyle='#f4efe4';a.fillRect(0,0,600,740);a.fillStyle='#1d2a30';a.fillRect(36,36,528,420);
  if(!img){a.strokeStyle='#8c7247';a.setLineDash([14,12]);a.lineWidth=4;a.strokeRect(60,60,480,372);a.setLineDash([]);}
  const draw=()=>{a.fillStyle='#f4efe4';a.fillRect(0,456,600,284);a.fillStyle='#7a5a2a';a.font=`34px ${SANS}`;a.fillText(h,44,526);a.fillStyle='#1f2a2e';a.font=`40px ${SANS}`;wrap(a,caption,44,590,512,54);};draw();
  const t=tex(c,owned,anisotropy);
  if(img)loader.load(webAsset(img),it=>{const im=it.image,s=Math.max(528/im.width,420/im.height),w=im.width*s,hh=im.height*s;a.save();a.beginPath();a.rect(36,36,528,420);a.clip();a.drawImage(im,36+(528-w)/2,36+(420-hh)/2,w,hh);a.restore();t.needsUpdate=true;it.dispose();});
  const holder=new T.Group();holder.position.set(x,ropeY,z+.01);g.add(holder);
  const p=mesh(new T.PlaneGeometry(.56,.69),paperMat(t,.3),holder,0,-.39,0);p.castShadow=false;
  mesh(new T.BoxGeometry(.05,.07,.02),new T.MeshStandardMaterial({color:'#a07a48'}),holder,0,-.03,.01);photos.push(holder);
  frames.push({c:v3(at[0]+ox+x,at[1]+ropeY-.4,at[2]+oz+z),w:.8,h:.85,n:v3(.05,.12,1).normalize(),label:h.split('｜')[0]});
 });
 function setOpen(v){photos.forEach((ph,i)=>{const k=clamp01(v*1.6-i*.22),e=ease(k);ph.position.y=ropeY+(1-e)*1.4;ph.rotation.z=Math.sin(k*9)*.18*(1-k);ph.visible=k>0;});}
 return {group:g,setOpen,openDuration:1500,whole:{c:v3(at[0]+ox,at[1]+ropeY-.38,at[2]+oz+z),w:span+.3,h:1.0,n:v3(.05,.14,1).normalize(),k:1.08},frames};
}

// ── 營火之地 03：同行邀請 ── 寶箱上的信封打開，邀請信升起、轉向你。
function letterProp({at,owned,anisotropy}){
 const g=new T.Group();g.position.set(...at);const LW=.92,LH=1.18,[c,a]=canvas(920,1180);parchment(a,920,1180,505);
 a.strokeStyle='#8c724799';a.lineWidth=3;a.strokeRect(30,30,860,1120);
 a.fillStyle='#7a5a2a';a.font=`32px ${SANS}`;a.fillText('同行邀請',70,104);
 a.fillStyle='#1f2a2e';a.font=`600 56px ${SERIF}`;a.fillText('先說想完成什麼，',70,192);a.fillText('再一起看怎麼走。',70,262);
 [['你想完成什麼？','例如：新品上市，想讓熟客知道'],['現在卡在哪裡？','例如：有素材，但不知道先寫哪一篇'],['想先試哪一段？','AI 導入諮詢／企業內訓／內容與社群']].forEach(([q,hint],i)=>{
  const y=380+i*220;a.fillStyle='#6e4f22';a.font=`600 42px ${SANS}`;a.fillText(q,70,y);a.fillStyle='#7d725c';a.font=`34px ${SANS}`;a.fillText(hint,70,y+58);
  a.strokeStyle='#8c724777';a.beginPath();a.moveTo(70,y+118);a.lineTo(850,y+118);a.stroke();});
 a.fillStyle='#5b5240';a.font=`30px ${SANS}`;wrap(a,'需求單目前只會下載到你的裝置，不會送出或寄信。',70,1080,780,42);
 a.save();a.translate(760,170);a.fillStyle='#8f2d22';a.beginPath();a.arc(0,0,48,0,Math.PI*2);a.fill();a.fillStyle='#e8c99a';a.font='44px Georgia';a.textAlign='center';a.fillText('✧',0,15);a.restore();
 const env=new T.MeshStandardMaterial({color:'#d8c49c',roughness:.85});
 mesh(new T.BoxGeometry(.56,.02,.38),env,g,0,.01,0);
 const flapPivot=new T.Group();flapPivot.position.set(0,.022,-.19);g.add(flapPivot);
 const flap=mesh(new T.ConeGeometry(.28,.2,4,1),env,flapPivot,0,0,.1);flap.scale.set(1,.06,1);flap.rotation.set(0,Math.PI/4,0);
 const seal=mesh(new T.CylinderGeometry(.045,.045,.012,20),new T.MeshStandardMaterial({color:'#8f2d22',roughness:.5}),g,0,.03,.02);
 const letter=new T.Group();g.add(letter);const sheet=mesh(new T.PlaneGeometry(LW,LH),paperMat(tex(c,owned,anisotropy),.3),letter,0,0,0);sheet.castShadow=false;
 const glow=new T.PointLight('#ffd391',0,3,2);glow.position.set(0,1.2,.6);g.add(glow);
 const up=1.05,face=-.2;
 function setOpen(v){const f=ease(clamp01(v*2.5)),r=ease(clamp01(v*1.4-.3));flapPivot.rotation.x=-f*2.6;seal.visible=f<.3;
  letter.position.set(r*.35,.05+r*up+(LH/2)*r,r*.95);letter.rotation.set(-Math.PI/2*(1-r),face*r,0);letter.scale.setScalar(.36+.64*r);glow.intensity=r*2.4;}
 const cy=at[1]+.05+up+LH/2,n=v3(.08,.12,1).normalize();
 return {group:g,setOpen,openDuration:1500,whole:{c:v3(at[0]+.35,cy-.1,at[2]+.95),w:LW+.5,h:LH+.75,n,k:1.06},
  frames:[{c:v3(at[0]+.35,cy+.28,at[2]+.95),w:LW+.12,h:.7,n,label:'上半'},{c:v3(at[0]+.35,cy-.3,at[2]+.95),w:LW+.12,h:.7,n,label:'下半'}]};
}

registerProp('scroll',scrollProp);registerProp('shelf',shelfProp);registerProp('cards',cardsProp);
registerProp('plaques',plaquesProp);registerProp('photos',photosProp);registerProp('letter',letterProp);
