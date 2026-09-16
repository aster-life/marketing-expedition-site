import * as T from './assets/vendor/three.module.min.js';

// 建築細部共用相同尺寸語言：石造柱礎、窗框與壁腳具有真實厚度。
export function dressInterior(group,{width,bays,windowBays,windowY,windowHeight,windowWidth,metal,stone}){
 const cutStone=stone.clone();cutStone.map=null;cutStone.normalMap=null;cutStone.roughnessMap=null;cutStone.color.set('#62656a');cutStone.roughness=.86;
 const recess=new T.MeshStandardMaterial({color:'#20282f',roughness:.91});
 const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
 const box=(x,y,z,w,h,d,m)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 for(const side of [-1,1]){
  for(const z of bays){
   const x=side*(width-1.1);
   const profile=[[0,0],[.78,0],[.82,.09],[.82,.2],[.7,.28],[.65,.4],[.5,.48],[.46,.68],[0,.68]].map(v=>new T.Vector2(...v));
   add(new T.LatheGeometry(profile,48),cutStone,x,.02,z);
   // 垂直細柱與上方承托塊，不以金色線条代替承重結構。
   for(const dx of [-.29,.29])for(const dz of [-.2,.2])add(new T.CylinderGeometry(.052,.07,5.6,12),cutStone,x+dx,3.5,z+dz);
   box(x,6.62,z,1.02,.18,1.02,cutStone);
   box(x,6.8,z,.91,.16,.91,cutStone);
  }
  for(const z of windowBays){
   const x=side*(width-.28);
   for(const dz of [-windowWidth/2-.12,windowWidth/2+.12])box(x,windowY,z+dz,.28,windowHeight+.52,.18,cutStone);
   for(const y of [windowY-windowHeight/2-.14,windowY+windowHeight/2+.14])box(x,y,z,.4,.22,windowWidth+.58,cutStone);
   box(x-side*.08,windowY-windowHeight/2-.33,z,.62,.14,windowWidth+.78,cutStone);
   // 窗頂四葉飾圈，與窗格平面垂直於側牆。
   for(let j=0;j<4;j++){
    const a=j*Math.PI/2;const ring=add(new T.TorusGeometry(.23,.024,8,32),metal,x-side*.15,windowY+windowHeight*.3+Math.sin(a)*.2,z+Math.cos(a)*.2);ring.rotation.y=Math.PI/2;
   }
  }
  const start=Math.min(...bays),end=Math.max(...bays),length=end-start+4;
  for(const [y,h,depth] of [[.17,.22,.28],[.42,.09,.35],[.57,.05,.28]])box(side*(width-.35),y,(start+end)/2,depth,h,length,cutStone);
 }
 return {cutStone,recess};
}
