import * as T from './assets/vendor/three.module.min.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// 書架上的書：圓弧書脊、前後封板、內縮的米色書頁，書脊上有起筋、燙金線與書名籤。
// 同一種書脊用一個 InstancedMesh 畫完，整間房的書只要約九個繪製批次；
// 只能加進 scene，不能放進會被合併的靜態批次（合併會丟掉每本書的位置）。
const DESIGNS=[
 ['#5b2b26','#c9a35c',1],['#2f3f3a','#c9a35c',0],['#3b3550','#d0b070',2],['#6a4a2a','#d8b56a',1],
 ['#2c3c4f','#c4a061',0],['#4a2f3a','#cfa95f',2],['#56502f','#d6bb78',1],['#7a3b2c','#e0bd73',0]
];
function spineCanvas(base,gold,style,seed){
 const c=document.createElement('canvas');c.width=64;c.height=256;const a=c.getContext('2d');
 a.fillStyle=base;a.fillRect(0,0,64,256);
 // 皮面顆粒
 let s=seed;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(let i=0;i<900;i++){a.fillStyle=r()<.5?'rgba(0,0,0,.13)':'rgba(255,255,255,.06)';a.fillRect(r()*64,r()*256,1+r()*2,1+r()*2);}
 // 書脊中段微亮，模擬圓弧受光
 const g=a.createLinearGradient(0,0,64,0);g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(0,0,0,.35)');a.fillStyle=g;a.fillRect(0,0,64,256);
 // 起筋：深色一道、上緣一條亮線
 const bands=style===0?[34,70,186,222]:style===1?[28,62,96,160,194,228]:[40,216];
 for(const y of bands){a.fillStyle='rgba(0,0,0,.45)';a.fillRect(0,y,64,7);a.fillStyle='rgba(255,255,255,.12)';a.fillRect(0,y-1,64,1.5);a.fillStyle=gold;a.fillRect(4,y+2,56,1.4);a.fillRect(4,y+5,56,.9);}
 // 書名籤
 if(style!==1){a.fillStyle=style===0?'#1b1715':'#6b2a22';a.fillRect(9,92,46,56);a.strokeStyle=gold;a.lineWidth=1.6;a.strokeRect(11,94,42,52);a.fillStyle=gold;for(let i=0;i<3;i++)a.fillRect(17,104+i*13,30-i*6,3);}
 else{a.fillStyle=gold;for(let i=0;i<4;i++)a.fillRect(22,110+i*9,20,2);}
 // 頭尾燙金
 a.fillStyle=gold;a.fillRect(0,6,64,2);a.fillRect(0,248,64,2);
 return c;
}
function pagesCanvas(){
 const c=document.createElement('canvas');c.width=128;c.height=16;const a=c.getContext('2d');a.fillStyle='#d9cba8';a.fillRect(0,0,128,16);
 for(let x=0;x<128;x+=2){a.fillStyle=`rgba(90,70,40,${.08+Math.random()*.12})`;a.fillRect(x,0,1,16);}return c;
}
// 單位大小的書（中心在原點；x＝厚度、y＝高度、z＝深度，書脊朝 +z）。
function bookGeometry(){
 const cover=(x)=>{const g=new T.BoxGeometry(.1,1,.92);g.translate(x,0,-.04);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.5,.33);return g;};
 const spine=new T.CylinderGeometry(.5,.5,1,12,1,true,-Math.PI/2,Math.PI);spine.scale(1,1,.18);spine.translate(0,0,.42);
 const merged=mergeGeometries([cover(-.45),cover(.45),spine.toNonIndexed()].map(g=>g.index?g.toNonIndexed():g));
 return merged;
}
export function createBookCollector(owned){
 const items=[];
 return {
  // matrix：已含位置、旋轉與尺寸（寬、高、深）的世界矩陣
  add(matrix){items.push(matrix.clone());},
  addBook(parentMatrix,x,y,z,w,h,d,{rotY=0,rotZ=0}={}){
   const m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,rotY,rotZ)),new T.Vector3(w,h,d));
   items.push(parentMatrix?parentMatrix.clone().multiply(m):m);
  },
  build(scene){
   if(!items.length)return [];
   const geo=bookGeometry(),pageGeo=new T.BoxGeometry(.82,.94,.88);pageGeo.translate(0,0,-.05);
   const pageTex=new T.CanvasTexture(pagesCanvas());pageTex.colorSpace=T.SRGBColorSpace;owned?.add(pageTex);
   const meshes=[];
   const pages=new T.InstancedMesh(pageGeo,new T.MeshStandardMaterial({map:pageTex,roughness:.92}),items.length);
   const buckets=DESIGNS.map(()=>[]);let s=97;
   items.forEach((m,i)=>{pages.setMatrixAt(i,m);s=(s*16807)%2147483647;buckets[s%DESIGNS.length].push(m);});
   pages.castShadow=pages.receiveShadow=true;scene.add(pages);meshes.push(pages);
   const tint=new T.Color();
   buckets.forEach((list,k)=>{if(!list.length)return;const [base,gold,style]=DESIGNS[k];
    const tex=new T.CanvasTexture(spineCanvas(base,gold,style,k*131+7));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;owned?.add(tex);
    const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({map:tex,roughness:.58,metalness:.05}),list.length);
    list.forEach((m,i)=>{mesh.setMatrixAt(i,m);const v=.82+((i*37+k*11)%9)/30;mesh.setColorAt(i,tint.setRGB(v,v,v));});
    mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);meshes.push(mesh);});
   return meshes;
  }
 };
}
