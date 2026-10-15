import * as T from './assets/vendor/three.module.min.js';
import {artifacts} from './room-artifact.js?v=book-1';

// 協作桌上那本書：點選後在場景裡翻開，內容印在書頁上，不另外疊網頁視窗。
// 書平放在桌面，書脊沿 z 軸、位於群組原點；鏡頭從 +z 那一側往下看。
const PAGE_W=.74,PAGE_H=.82,THICK=.12,PX=1024,PY=Math.round(PX*PAGE_H/PAGE_W);
const INK='#2a2a24',BROWN='#6e4f22',SOFT='#5b5240',SANS='"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif',SERIF='"Noto Serif TC","PMingLiU",serif';

function wrap(a,text,x,y,maxW,lh){
 let line='';const out=[];
 for(const ch of String(text)){if(a.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}
 if(line)out.push(line);out.forEach((l,i)=>a.fillText(l,x,y+i*lh));return y+out.length*lh;
}
function paper(rotate){
 const c=document.createElement('canvas');c.width=PX;c.height=PY;const a=c.getContext('2d');
 if(rotate){a.translate(PX,PY);a.rotate(Math.PI);}
 const g=a.createLinearGradient(0,0,PX,PY);g.addColorStop(0,'#efe3c6');g.addColorStop(.7,'#e2d1ab');g.addColorStop(1,'#d3bf95');a.fillStyle=g;a.fillRect(0,0,PX,PY);
 let s=917;for(let i=0;i<9000;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const x=s%PX;s=(Math.imul(s,1664525)+1013904223)>>>0;a.fillStyle=i%2?'#ffffff0d':'#6b52300b';a.fillRect(x,s%PY,2,2);}
 return {c,a};
}
function heading(a,n,text,y){
 a.fillStyle=BROWN;a.beginPath();a.arc(82,y-15,23,0,Math.PI*2);a.fill();
 a.fillStyle='#f3e6c8';a.font='28px Georgia';a.textAlign='center';a.fillText(String(n),82,y-5);a.textAlign='left';
 a.fillStyle=BROWN;a.font=`600 40px ${SANS}`;a.fillText(text,122,y);return y+66;
}
// 左頁：需求與「先講清楚要什麼」＋時程；右頁：分工與留給你決定的事。字級以鏡頭到位時「看得清楚」為準。
export function drawBriefPages(key){
 const d=artifacts[key],[s1,s2,s3]=d.sections,L=paper(true),R=paper(false),M=60,W=PX-M*2;
 let a=L.a,y;
 a.strokeStyle='#9c7a4499';a.lineWidth=2;a.strokeRect(M,48,232,58);a.fillStyle='#7a5a2a';a.font=`28px ${SANS}`;a.fillText(d.tag,M+22,87);
 a.fillStyle=SOFT;a.font=`32px ${SANS}`;a.fillText('你說：',M,176);
 a.fillStyle='#1f2a2e';a.font=`54px ${SERIF}`;y=wrap(a,'「'+d.title+'」',M,246,W,74);
 a.fillStyle=SOFT;a.font=`32px ${SANS}`;y=wrap(a,d.note,M,y+18,W,48);
 a.strokeStyle='#8c724788';a.setLineDash([9,9]);a.beginPath();a.moveTo(M,y+8);a.lineTo(PX-M,y+8);a.stroke();a.setLineDash([]);
 y=heading(a,1,s1.h,y+84);
 for(const [k,v] of s1.rows){a.fillStyle='#7a5a2a';a.font=`600 36px ${SANS}`;a.fillText(k,M,y);a.fillStyle=INK;a.font=`36px ${SANS}`;y=wrap(a,v,M+118,y,W-118,52)+22;}
 a.strokeStyle='#8c724788';a.beginPath();a.moveTo(M,PY-122);a.lineTo(PX-M,PY-122);a.stroke();
 a.fillStyle=SOFT;a.font=`30px ${SANS}`;wrap(a,d.foot,M,PY-70,W,42);
 a=R.a;y=heading(a,2,s2.h,104);
 for(const [who,what,back] of s2.team){
  a.strokeStyle='#8c724744';a.beginPath();a.moveTo(M,y-40);a.lineTo(PX-M,y-40);a.stroke();
  a.fillStyle='#1f2a2e';a.font=`600 36px ${SANS}`;a.fillText(who,M,y+6);
  a.fillStyle=INK;a.font=`35px ${SANS}`;let yy=wrap(a,what,M,y+60,W,50);
  a.fillStyle=BROWN;a.font=`33px ${SANS}`;yy=wrap(a,'交回：'+back,M,yy+2,W,48);y=yy+44;
 }
 y=heading(a,3,s3.h,y+26);
 for(const c of s3.checks){a.strokeStyle='#7a5a2a';a.lineWidth=3;a.strokeRect(M+2,y-28,28,28);a.lineWidth=2;a.fillStyle=INK;a.font=`35px ${SANS}`;y=wrap(a,c,M+50,y,W-50,50)+20;}
 R.c.dataset.bottom=String(y);
 return [L.c,R.c];
}

export function createBook({key,owned,anisotropy=8}){
 const group=new T.Group(),leather=new T.MeshStandardMaterial({color:'#4a2f22',roughness:.62,metalness:.05}),edge=new T.MeshStandardMaterial({color:'#d9c7a0',roughness:.9});
 const [left,right]=drawBriefPages(key).map(c=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=anisotropy;owned?.add(t);
  // 書頁受場景燈光影響（才會跟房間融在一起），再用同一張圖做微弱自發光，確保字在暗房裡仍讀得清楚。
  return new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#ffffff',emissiveIntensity:.42,roughness:.92,metalness:0});});
 // 書頁從書脊微微拱起再攤平，不是一張平板。
 const pageGeometry=()=>{const g=new T.PlaneGeometry(PAGE_W,PAGE_H,32,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=(p.getX(i)+PAGE_W/2)/PAGE_W;p.setZ(i,.03*Math.sin(Math.PI*Math.min(1,u*1.6))*(1-.6*u)+.004);}g.computeVertexNormals();return g;};
 const box=(w,h,d,m,x,y,z,p=group)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const half=THICK/2;
 box(PAGE_W+.03,.012,PAGE_H+.04,leather,PAGE_W/2,.006,0);                     // 封底
 box(PAGE_W,half-.012,PAGE_H,edge,PAGE_W/2,.012+(half-.012)/2,0);             // 右半書頁
 const rightPage=new T.Mesh(pageGeometry(),right);rightPage.receiveShadow=true;rightPage.rotation.x=-Math.PI/2;rightPage.position.set(PAGE_W/2,half+.001,0);group.add(rightPage);
 const pivot=new T.Group();pivot.position.y=half;group.add(pivot);                  // 書脊轉軸
 box(PAGE_W,half-.012,PAGE_H,edge,PAGE_W/2,(half-.012)/2,0,pivot);             // 左半書頁（闔上時疊在右半上）
 box(PAGE_W+.03,.012,PAGE_H+.04,leather,PAGE_W/2,half-.006,0,pivot);           // 封面
 const leftPage=new T.Mesh(pageGeometry(),left);leftPage.receiveShadow=true;leftPage.rotation.x=Math.PI/2;leftPage.position.set(PAGE_W/2,-.001,0);pivot.add(leftPage);
 const spine=box(.03,THICK+.012,PAGE_H+.04,leather,0,THICK/2,0);
 const gild=new T.Mesh(new T.PlaneGeometry(.34,.34),new T.MeshStandardMaterial({color:'#c9a25c',metalness:.8,roughness:.35,transparent:true,opacity:.85}));gild.rotation.x=-Math.PI/2;gild.position.set(PAGE_W/2,half+.0005,0);
 const emblem=new T.Mesh(new T.RingGeometry(.11,.125,40),gild.material);emblem.rotation.x=-Math.PI/2;emblem.position.set(PAGE_W/2,half+.0009,0);pivot.add(emblem); // 封面燙金圈
 let amount=0;
 const glow=new T.PointLight('#ffc77a',0,2.6,2);glow.position.set(0,.85,.35);group.add(glow); // 翻開時桌燈般的暖光落在書頁上
 function setOpen(t){amount=T.MathUtils.clamp(t,0,1);const e=amount*amount*(3-2*amount);pivot.rotation.z=e*Math.PI;spine.scale.x=1+e*.4;glow.intensity=e*2.2;}
 setOpen(0);
 return {group,setOpen,get open(){return amount;},size:{w:PAGE_W,h:PAGE_H,thick:THICK}};
}
