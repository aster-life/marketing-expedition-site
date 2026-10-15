import * as T from './assets/vendor/three.module.min.js';
import {webAsset} from './web-assets.js';
import {createBook} from './room-book.js?v=props-1';

// 遠征本部三個近景物件，各用不同的「打開方式」：書翻開、立牌近看、告示板翻面。
// 每個物件回傳 {group, setOpen(t), frames, whole}；frames 是放大閱讀時鏡頭要對準的區塊（世界座標）。
const SANS='"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif',SERIF='"Noto Serif TC","PMingLiU",serif';
const v3=(x,y,z)=>new T.Vector3(x,y,z);
function texture(canvas,owned,anisotropy){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;owned?.add(t);return t;}
function wrap(a,text,x,y,maxW,lh){let line='';const out=[];for(const ch of String(text)){if(a.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}if(line)out.push(line);out.forEach((l,i)=>a.fillText(l,x,y+i*lh));return y+out.length*lh;}

// 協作桌：書平放桌面，鏡頭從前上方看。
export function bookProp({at,owned,anisotropy}){
 const book=createBook({key:'brief',owned,anisotropy}),{w,h,thick}=book.size;book.group.position.set(...at);
 const n=v3(0,.84,.54).normalize(),y=at[1]+thick/2+.02;
 return {group:book.group,setOpen:book.setOpen,openDuration:900,closeDuration:500,
  whole:{c:v3(at[0],y,at[2]),w:w*2+.12,h:h+.08,n,k:1.3,x:.12},
  frames:[{c:v3(at[0]-w/2,y,at[2]),w:w+.06,h:h+.06,n,label:'左頁'},{c:v3(at[0]+w/2,y,at[2]),w:w+.06,h:h+.06,n,label:'右頁'}]};
}

// 角色名冊：一座名冊架，五位隊員的立牌站成一排，前方銅名牌寫著各自交回的成果。
export const ROSTER=[
 ['secretary','秘書（幕僚長）','一份待決清單，附首選、理由與代價'],
 ['seo','SEO 專家','問題依據與修改的優先順序'],
 ['content','內容行銷專家','有明確讀者與下一步的內容草稿'],
 ['ads','廣告投放專家','測試假設、素材方向與停止條件'],
 ['analytics','成效分析專家','分開事實、推論與缺口的分析摘要']
];
function plate(name,back,owned,anisotropy){
 const c=document.createElement('canvas');c.width=640;c.height=420;const a=c.getContext('2d');
 const g=a.createLinearGradient(0,0,0,420);g.addColorStop(0,'#1b2b31');g.addColorStop(1,'#122026');a.fillStyle=g;a.fillRect(0,0,640,420);
 a.strokeStyle='#c9a25c';a.lineWidth=6;a.strokeRect(14,14,612,392);a.strokeStyle='#c9a25c66';a.lineWidth=2;a.strokeRect(28,28,584,364);
 a.fillStyle='#f0dcb0';a.font=`600 54px ${SERIF}`;a.textAlign='center';a.fillText(name,320,112);a.textAlign='left';
 a.fillStyle='#c9a25c';a.font=`32px ${SANS}`;a.fillText('交回給你：',56,190);
 a.fillStyle='#e6dccb';a.font=`38px ${SANS}`;wrap(a,back,56,250,528,54);
 return texture(c,owned,anisotropy);
}
export function rosterProp({at,owned,anisotropy}){
 const group=new T.Group();group.position.set(...at);
 const wood=new T.MeshStandardMaterial({color:'#4b3526',roughness:.7}),brass=new T.MeshStandardMaterial({color:'#b8914f',metalness:.75,roughness:.35});
 const box=(w,h,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
 const W=2.9,top=1.05;
 box(W,top,.56,wood,0,top/2,0);box(W+.08,.05,.62,brass,0,top+.025,0);box(W+.08,.06,.62,wood,0,.03,0);
 // 架子後方的小橫匾
 const sign=document.createElement('canvas');sign.width=1200;sign.height=200;const s=sign.getContext('2d');s.fillStyle='#14282d';s.fillRect(0,0,1200,200);s.strokeStyle='#c9a25c';s.lineWidth=5;s.strokeRect(12,12,1176,176);
 s.fillStyle='#c9a25c';s.font='30px Georgia';s.textAlign='center';s.fillText('THE  FELLOWSHIP',600,70);s.fillStyle='#f0dcb0';s.font=`600 64px ${SERIF}`;s.fillText('角色名冊',600,150);
 const signMesh=new T.Mesh(new T.PlaneGeometry(2.4,.4),new T.MeshStandardMaterial({map:texture(sign,owned,anisotropy),roughness:.8}));signMesh.position.set(0,2.5,-.32);group.add(signMesh);
 box(2.5,.5,.06,wood,0,2.5,-.36);
 const loader=new T.TextureLoader(),gap=W/ROSTER.length,frames=[],standees=[];
 ROSTER.forEach(([id,name,back],i)=>{
  const x=-W/2+gap*(i+.5);
  const mat=new T.MeshStandardMaterial({transparent:true,alphaTest:.45,roughness:.8,side:T.DoubleSide});
  const fig=new T.Mesh(new T.PlaneGeometry(.5,.76),mat);fig.position.set(x,top+.05+.38,-.06);fig.castShadow=true;group.add(fig);standees.push(fig);
  loader.load(webAsset(`assets/char-${id}.webp`),t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;owned?.add(t);const r=t.image.height/t.image.width;fig.scale.y=r*.5/.76;fig.position.y=top+.05+.38*fig.scale.y;mat.map=t;mat.needsUpdate=true;});
  box(.3,.03,.18,brass,x,top+.065,-.06); // 立牌底座
  const p=new T.Mesh(new T.PlaneGeometry(gap-.06,(gap-.06)*420/640),new T.MeshStandardMaterial({map:plate(name,back,owned,anisotropy),emissive:'#ffffff',emissiveMap:null,emissiveIntensity:0,roughness:.6,metalness:.1}));
  p.material.emissiveMap=p.material.map;p.material.emissiveIntensity=.35;p.position.set(x,top*.62,.285);group.add(p);
  frames.push({c:v3(0,0,0),w:gap+.16,h:1.6,n:v3(.18,.3,1).normalize(),label:name});
 });
 group.updateMatrixWorld(true);frames.forEach((f,i)=>{const x=-W/2+gap*(i+.5);f.c=v3(at[0]+x,at[1]+top+.12,at[2]+.12);});
 // 打開時立牌依序微微前傾致意
 function setOpen(t){standees.forEach((s,i)=>{const k=T.MathUtils.clamp(t*1.6-i*.15,0,1);s.rotation.x=-Math.sin(k*Math.PI)*.12;});}
 return {group,setOpen,openDuration:1100,closeDuration:300,
  whole:{c:v3(at[0],at[1]+1.45,at[2]+.1),w:W+.3,h:2.1,n:v3(0,.22,1).normalize(),k:1.06},frames};
}

// 交付檢核：牆上的告示板翻面，背面是一份示範報告節錄，金色標註指出交付該有的三件事。
function reportCanvas(){
 const c=document.createElement('canvas');c.width=1200;c.height=1480;const a=c.getContext('2d');
 const g=a.createLinearGradient(0,0,1200,1480);g.addColorStop(0,'#ebdfc2');g.addColorStop(1,'#d6c39b');a.fillStyle=g;a.fillRect(0,0,1200,1480);
 a.strokeStyle='#8c724788';a.lineWidth=3;a.strokeRect(36,36,1128,1408);
 a.fillStyle='#7a5a2a';a.font=`30px ${SANS}`;a.fillText('示範報告節錄 · 決策摘要',80,112);
 a.fillStyle='#1f2a2e';a.font=`600 62px ${SERIF}`;a.fillText('這週，只需要先決定一件事',80,200);
 a.fillStyle='#5b5240';a.font=`32px ${SANS}`;a.fillText('假設情境：網站改版與社群內容，同時需要人力。',80,262);
 const rows=[
  ['01 現在要決定','本週先改善首頁入口，還是先增加發文數量？',1,'回答了原本的問題'],
  ['02 首選與理由','先釐清首頁入口。新內容把人帶進來之後，才有清楚的下一步。',0,''],
  ['03 代價與限制','本週社群產量可能較少；若客人完全不經過網站，這個排序就要重新評估。',2,'依據與代價寫在同一頁'],
  ['04 決策後怎麼追蹤','記錄改動日期，觀察入口點擊與後續詢問，不把所有變化都算成改版的功勞。',3,'事後可以回查']
 ];
 let y=360;
 rows.forEach(([h,body,n,note])=>{
  a.strokeStyle='#8c724755';a.lineWidth=2;a.beginPath();a.moveTo(80,y-48);a.lineTo(1120,y-48);a.stroke();
  a.fillStyle='#6e4f22';a.font=`600 40px ${SANS}`;a.fillText(h,80,y);
  a.fillStyle='#2a2a24';a.font=`36px ${SANS}`;const end=wrap(a,body,80,y+62,n?720:1040,54);
  if(n){ // 右側金色批註
   a.strokeStyle='#b8883a';a.lineWidth=5;a.beginPath();a.arc(880,y+30,30,0,Math.PI*2);a.stroke();
   a.fillStyle='#b8883a';a.font='600 36px Georgia';a.textAlign='center';a.fillText(String(n),880,y+43);a.textAlign='left';
   a.font=`600 34px ${SANS}`;wrap(a,note,930,y+42,190,46);
  }
  y=end+92;
 });
 a.save();a.translate(960,1330);a.rotate(-.12);a.strokeStyle='#a2402fcc';a.lineWidth=6;a.strokeRect(-150,-56,300,112);a.fillStyle='#a2402fcc';a.font=`600 44px ${SERIF}`;a.textAlign='center';a.fillText('交付前核對 ✓',0,16);a.restore();
 return c;
}
export function flipBoardProp({at,front,owned,anisotropy}){
 const group=new T.Group();group.position.set(...at);const W=2.35,H=2.9;
 const wood=new T.MeshStandardMaterial({color:'#3e2c20',roughness:.75}),metal=new T.MeshStandardMaterial({color:'#b8914f',metalness:.75,roughness:.35});
 const pivot=new T.Group();group.add(pivot);
 const back=new T.Mesh(new T.BoxGeometry(W+.22,H+.22,.14),wood);back.castShadow=back.receiveShadow=true;pivot.add(back);
 for(const dx of [-1,1]){const o=new T.Mesh(new T.BoxGeometry(.07,H+.22,.18),metal);o.position.x=dx*(W/2+.08);pivot.add(o);}
 for(const dy of [-1,1]){const o=new T.Mesh(new T.BoxGeometry(W+.22,.07,.18),metal);o.position.y=dy*(H/2+.08);pivot.add(o);}
 const faceA=new T.Mesh(new T.PlaneGeometry(W,H),new T.MeshBasicMaterial({map:front}));faceA.position.z=.076;pivot.add(faceA);
 const rep=texture(reportCanvas(),owned,anisotropy);
 const faceB=new T.Mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({map:rep,emissive:'#ffffff',emissiveMap:rep,emissiveIntensity:.12,roughness:.9}));faceB.rotation.y=Math.PI;faceB.position.z=-.076;pivot.add(faceB);
 // 翻面：先往前拉離牆面，再繞垂直軸轉半圈，最後貼回原位。
 function setOpen(t){const e=t*t*(3-2*t);pivot.rotation.y=e*Math.PI;pivot.position.z=Math.sin(e*Math.PI)*.95;}
 const n=v3(0,.04,1).normalize(),c=v3(...at);
 return {group,setOpen,openDuration:1300,closeDuration:900,
  whole:{c,w:W+.3,h:H+.3,n,k:1.04},
  frames:[{c:v3(at[0],at[1]+.62,at[2]),w:W+.2,h:1.6,n,label:'上半'},{c:v3(at[0],at[1]-.62,at[2]),w:W+.2,h:1.6,n,label:'下半'}]};
}
