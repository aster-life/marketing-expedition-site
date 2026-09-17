import * as T from './assets/vendor/three.module.min.js';

// 沙盤與近景共用同一座入口；尺寸以室內公尺為基準，沙盤只縮放整個群組。
export function createHarborFacade({stone,wood,brass,roof,glow,depth=20}){
 const group=new T.Group();
 function mesh(geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 const box=(x,y,z,w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 // 門洞直接留空，鏡頭穿過時不需要隱藏牆面。
 for(const x of [-4.2,4.2])box(x,2.9,0,3.6,5.8,.45,stone);
 box(0,5.25,0,4.8,1.1,.45,stone);
 for(const x of [-2.45,2.45]){
  box(x,2.4,.24,.28,4.8,.32,wood);
  box(x,2.4,.43,.045,4.65,.03,brass);
  box(x,.17,.29,.54,.34,.58,stone);
  box(x,4.62,.29,.55,.16,.58,brass);
  // 門柱的接縫、底腳與鉚釘，在靠近時提供實際厚度。
  for(let row=0;row<7;row++)box(x+Math.sign(x)*.32,.62+row*.56,.16,.38,.52,.44,stone);
  for(const y of [.52,1.72,2.92,4.12])mesh(new T.SphereGeometry(.025,8,6),brass,x,y,.459);
 }
 box(0,4.76,.25,5.45,.23,.55,wood);box(0,4.91,.25,5.65,.045,.59,brass);
 box(0,.015,.35,5.15,.07,1.1,stone);
 for(const x of [-4.15,4.15]){
  box(x,3.1,.25,1.4,2.15,.09,roof);
  for(const dx of [-.74,0,.74])box(x+dx,3.1,.33,.04,2.27,.04,brass);
  for(const y of [1.98,3.1,4.23])box(x,y,.33,1.5,.045,.04,brass);
  box(x,1.87,.35,1.7,.16,.65,stone);
  box(x,1.1,.5,.2,.36,.2,glow);
  for(const y of [.86,1.34])box(x,y,.5,.34,.08,.34,brass);
  for(const dx of [-.13,.13])for(const dz of [-.13,.13])box(x+dx,1.1,.5+dz,.018,.43,.018,brass);
 }
 for(const y of [.38,.53,5.63])box(0,y,.29,12.3,.065,.1,brass);
 const pediment=new T.Shape();pediment.moveTo(-6.4,5.84);pediment.lineTo(0,8.15);pediment.lineTo(6.4,5.84);pediment.closePath();
 mesh(new T.ExtrudeGeometry(pediment,{depth:.5,bevelEnabled:false}),roof,0,0,-.25);
 for(const side of [-1,1]){const beam=box(side*3.2,7,.13,6.8,.1,.14,brass);beam.rotation.z=-side*Math.atan2(2.31,6.4);}
 for(const side of [-1,1]){const slope=box(side*3.2,7,-depth/2,6.8,.18,depth,roof);slope.rotation.z=-side*Math.atan2(2.31,6.4);}
 box(0,8.19,-depth/2,.1,.12,depth+.15,brass);
 mesh(new T.TorusGeometry(.45,.045,6,32),brass,0,6.7,.31);
 box(0,6.7,.32,.04,.67,.04,brass);box(0,6.7,.32,.67,.04,.04,brass);
 return group;
}
