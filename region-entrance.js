import * as T from './assets/vendor/three.module.min.js';

// 沙盤與近景共用輪廓；近景從正面開口進入，門柱留在原地。
export function createRegionEntrance(index,{stone,wood,metal,roof,glow,cloth}){
 const g=new T.Group();
 const add=(geo,mat,x,y,z)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(x,y,z,w,h,d,m)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(x,y,z,r,h,m)=>add(new T.CylinderGeometry(r,r,h,24),m,x,y,z);
 if(index===0){
  for(const x of [-4,4]){
   cyl(x,3,0,1.3,6,stone);cyl(x,5.9,0,1.42,.18,metal);
   add(new T.ConeGeometry(1.65,2.5,12),roof,x,7.15,0);
   for(const y of [.25,1.5,2.8,4.1,5.4])cyl(x,y,0,1.32,.065,metal);
   for(const dx of [-.48,.48]){box(x+dx,3.6,1.2,.35,1.1,.06,glow);box(x+dx,3.6,1.25,.035,1.13,.03,metal);}
  }
  for(const x of [-2.55,2.55])box(x,2.65,-.25,1.6,5.3,.5,stone);
  box(0,4.75,-.25,3.5,1.15,.5,stone);box(0,5.4,-.25,6.8,.16,.7,metal);
  for(const x of [-1.8,1.8]){box(x,2.1,.05,.18,4.2,.24,wood);box(x,2.1,.2,.028,4.1,.025,metal);}
  for(let i=0;i<11;i++)box(-3+i*.6,5.65,-.25,.28,.42,.55,stone);
  for(const x of [-1.5,1.5])for(const y of [.7,2,3.3])box(x,y,.07,.025,.14,.09,metal);
 }else if(index===2){
  for(const x of [-4.8,4.8])box(x,3,0,2.4,6,.45,stone);
  box(0,5.15,0,7.2,1.7,.45,stone);
  for(const x of [-4.5,-2.35,2.35,4.5]){
   cyl(x,2.75,.9,.25,5.2,stone);cyl(x,.22,.9,.42,.24,metal);cyl(x,5.3,.9,.43,.18,metal);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;cyl(x+Math.cos(a)*.249,2.75,.9+Math.sin(a)*.249,.017,4.8,metal);}
  }
  box(0,5.6,.5,11,.22,2,metal);
  const shape=new T.Shape();shape.moveTo(-5.7,5.75);shape.lineTo(0,8);shape.lineTo(5.7,5.75);shape.closePath();
  add(new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false}),roof,0,0,-.4);
  for(const x of [-2.9,2.9]){const edge=box(x,6.87,.65,6.15,.09,.12,metal);edge.rotation.z=-Math.sign(x)*.377;}
  add(new T.TorusGeometry(.48,.04,8,48),metal,0,6.65,.7);
  for(let i=0;i<3;i++)box(0,-.05-i*.12,1.5+i*.36,10.5+i*.35,.17,.5,stone);
 }else{
  // 麻布頂有多段褶線；入口兩側敞開，不讓整張布擋住鏡頭。
  const plane=new T.PlaneGeometry(6,8,18,20),a=plane.attributes.position;
  for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getX(i)*8)*.025);
  plane.computeVertexNormals();
  for(const side of [-1,1]){
   const panel=add(plane.clone(),cloth,side*2.25,3.3,-2);panel.rotation.set(-Math.PI/2,side*.65,0);
   const pole=cyl(side*3.8,1.8,1.2,.075,3.6,wood);
   cyl(side*3.8,1.8,-5,.075,3.6,wood);
  }
  cyl(0,2.55,1.8,.065,5.1,wood);cyl(0,2.55,-5.8,.065,5.1,wood);
  const ridge=box(0,5.1,-2,.1,.1,8.2,wood);
  const back=box(0,1.5,-5.8,7.6,3,.035,cloth);
  for(const x of [-4.8,4.8]){
   cyl(x,.23,2.8,.06,.5,wood);
   const start=new T.Vector3(x, .35,2.8),end=new T.Vector3(Math.sign(x)*3.8,3.5,1.2),d=end.clone().sub(start);
   const rope=add(new T.CylinderGeometry(.018,.018,d.length(),8),metal,...start.clone().add(end).multiplyScalar(.5).toArray());rope.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
  }
 }
 return g;
}
