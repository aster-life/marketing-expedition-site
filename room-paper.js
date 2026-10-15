import * as T from './assets/vendor/three.module.min.js';

// 近景紙張的質感：舊版紙面帶 12–42% 自發光、零厚度、不投影，近看像貼在螢幕上的平面圖。
// 這裡把自發光降到 45%，改由近看時的閱讀燈打出明暗；紙面加紙纖維凹凸、立著的紙微微捲曲並有米色背面、
// 平放的紙底下墊一層厚度，紙張都會投影。所有近景物件建立後統一處理（makeProp 呼叫）。
const GLOW_KEEP=.45;
const grains=new WeakMap();
function grainFor(owned){
 const key=owned||grains;if(grains.has(key))return grains.get(key);
 // 紙纖維法線貼圖：平滑雜訊高度場取差分。
 const N=128,hgt=new Float32Array(N*N);let s=4127;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<N*N;i++)hgt[i]=r();
 for(let pass=0;pass<2;pass++){const out=new Float32Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let t=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)t+=hgt[((y+dy+N)%N)*N+(x+dx+N)%N];out[y*N+x]=t/9;}hgt.set(out);}
 const data=new Uint8Array(N*N*4);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=(hgt[y*N+(x+1)%N]-hgt[y*N+(x-1+N)%N])*6,dy=(hgt[((y+1)%N)*N+x]-hgt[((y-1+N)%N)*N+x])*6,l=Math.hypot(dx,dy,1);data.set([(-dx/l*.5+.5)*255,(-dy/l*.5+.5)*255,(1/l*.5+.5)*255,255],(y*N+x)*4);}
 const t=new T.DataTexture(data,N,N);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(5,5);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
 const edge=new T.MeshStandardMaterial({color:'#d8ccad',roughness:.95});
 const pack={grain:t,edge};grains.set(key,pack);return pack;
}
function curled(w,h){
 // 立著、懸空的紙（信、掛牌、照片）：左右兩側往後微彎，幅度隨紙張大小。裱在板上的紙要標 keepShape。
 const g=new T.PlaneGeometry(w,h,16,4),p=g.attributes.position,a=Math.min(w,h)*.022;
 for(let i=0;i<p.count;i++){const u=p.getX(i)/(w/2);p.setZ(i,-a*u*u);}
 g.computeVertexNormals();return g;
}
export function finishPaper(group,{owned}={}){
 const {grain,edge}=grainFor(owned),seen=new Set(),todo=[];
 group.traverse(o=>{if(o.isMesh&&!o.userData.paperDone)todo.push(o);});
 for(const o of todo){
  const mats=Array.isArray(o.material)?o.material:[o.material];let paper=false;
  for(const m of mats){
   if(!m?.emissiveMap)continue;paper=true;
   if(seen.has(m))continue;seen.add(m);
   m.emissiveIntensity*=GLOW_KEEP;m.normalMap=grain;m.normalScale=new T.Vector2(.28,.28);m.roughness=Math.max(m.roughness,.88);m.needsUpdate=true;
  }
  if(!paper)continue;o.userData.paperDone=true;o.castShadow=true;o.receiveShadow=true;
  const geo=o.geometry;if(geo?.type!=='PlaneGeometry'||geo.parameters.widthSegments>1||o.userData.keepShape)continue;
  const {width:w,height:h}=geo.parameters,flat=Math.abs(Math.abs(o.rotation.x)-Math.PI/2)<.01;
  if(flat){
   // 平放的紙（便條卡、卷軸、手稿）：底下墊 4mm 厚度，邊緣會留一道細影。
   const base=new T.Mesh(new T.BoxGeometry(w,h,.004),edge);base.position.z=-.0025;base.castShadow=base.receiveShadow=true;base.userData.paperDone=true;o.add(base);
  }else{
   // 立著的紙（信、掛牌、照片）：微捲曲，背面是米色紙底，不再看到反過來的字。
   const g=curled(w,h);geo.dispose();o.geometry=g;mats.forEach(m=>{m.side=T.FrontSide;});
   const back=new T.Mesh(g,edge);back.material=edge.clone();back.material.side=T.BackSide;back.position.z=-.002;back.castShadow=true;back.userData.paperDone=true;o.add(back);
  }
 }
}
