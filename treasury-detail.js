import {createGalleryArtifact} from './gallery-artifacts.js?v=5';
import * as T from './assets/vendor/three.module.min.js';

// 收藏沿牆分組，右側轉角通道保持淨空；重用 CC0 模型的幾何與材質。
export function dressTreasury(group,{props,metal,wall}){
 const add=(geometry,material,x,y,z)=>{const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
 const box=(x,y,z,w,h,d,m)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 const weaveCanvas=document.createElement('canvas');weaveCanvas.width=64;weaveCanvas.height=64;
 const weaveContext=weaveCanvas.getContext('2d');weaveContext.fillStyle='#777777';weaveContext.fillRect(0,0,64,64);
 for(let i=0;i<64;i+=2){weaveContext.fillStyle=i%4?'#999999':'#555555';weaveContext.fillRect(i,0,1,64);weaveContext.fillRect(0,i,64,1);}
 const weave=new T.CanvasTexture(weaveCanvas);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(12,20);
 const velvet=new T.MeshStandardMaterial({color:'#292132',roughness:1,bumpMap:weave,bumpScale:.012,side:T.DoubleSide});
 const recess=new T.MeshStandardMaterial({color:'#15222c',roughness:.9});
 const brass=metal.clone();brass.color.set('#756047');brass.roughness=.42;
 // 細長木紋由固定種子產生，避免每次載入改變外觀。
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#352920';ctx.fillRect(0,0,128,512);
 for(let i=0;i<120;i++){ctx.strokeStyle=i%3?'#403025':'#241d19';ctx.lineWidth=.5+(i%4)*.25;ctx.beginPath();for(let y=0;y<=512;y+=8){const x=i*1.13+Math.sin(y*.017+i)*1.4; y?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
 const grain=new T.CanvasTexture(canvas);grain.colorSpace=T.SRGBColorSpace;
 const wood=new T.MeshStandardMaterial({map:grain,roughness:.72,bumpMap:grain,bumpScale:.018});
 for(const z of [-5,-12]){
  group.add(props.place('wooden_bookshelf_worn',-9.2,0,z,5.2,Math.PI/2));
  const scale=5.2/props.metrics.wooden_bookshelf_worn.size[1];
  for(const level of [.25,.58,.92,1.25])for(const offset of [-.6,.45])group.add(props.place('book_encyclopedia_set_01',-9.15,level*scale+.03,z+offset,.46,Math.PI/2));
 }
 // 正面收藏櫃打破大片空牆，箱子與器皿有不同高度。
 for(const x of [-2.5,2]){
  box(x,2.6,-19.52,3.7,5.2,.16,recess);
  for(const dx of [-1.88,1.88]){
   box(x+dx,2.65,-19,.22,5.4,1.15,wood);
   box(x+dx,2.65,-18.4,.055,5.22,.035,brass);
  }
  for(const y of [.12,2.35,5.3]){
   box(x,y,-18.95,4.08,.2,1.35,wood);
   box(x,y-.055,-18.26,4.02,.045,.04,brass);
  }
  box(x,5.46,-18.95,4.22,.12,1.45,wood);
  box(x,.03,-18.95,4.22,.16,1.45,wood);
  for(const dx of [-1.15,0,1.15])box(x+dx,2.65,-19.39,.024,5,.035,wood);
  if(x===2)group.add(props.place('treasure_chest',x,.2,-18.7,1.3,0));
  else group.add(props.place('book_encyclopedia_set_01',x,.2,-18.7,.85,0));
  const artifact=createGalleryArtifact(x===2?2:1,brass);artifact.position.set(x,2.45,-18.7);artifact.scale.setScalar(.9);group.add(artifact);
  const lamp=new T.PointLight('#ffbc79',38,6,1.7);lamp.position.set(x,5.05,-18.75);group.add(lamp);
  // 光源藏於頂板下方的遮光檐內。
  box(x,5.12,-18.33,3.7,.22,.18,wood);
 }
 group.add(props.place('wooden_table_02',-5,0,-10,1.65,.2));
 const chart=createGalleryArtifact(0,brass);chart.position.set(-5,1.68,-10);chart.rotation.y=.2;chart.scale.setScalar(.65);group.add(chart);
 group.add(props.place('treasure_chest',-6.8,0,-14,1.45,.3));
 // 深紅掛毯、青銅徽章與壁燈提供上層輪廓。
 for(const x of [-2.5,2]){
  // 下緣自然垂墜，細摺與掛桿提供布料的真實厚度感。
  const cloth=new T.PlaneGeometry(2.35,4.3,32,40),vertices=cloth.attributes.position;
  for(let i=0;i<vertices.count;i++){
   const u=vertices.getX(i),v=vertices.getY(i),fall=(2.15-v)/4.3;
   vertices.setZ(i,.07*Math.sin(u*9)+fall*.045*Math.sin(u*5));
   vertices.setY(i,v-.08*fall*fall*Math.cos(u*2));
  }
  cloth.computeVertexNormals();add(cloth,velvet,x,8.1,-19.34);
  const rod=add(new T.CylinderGeometry(.035,.035,2.7,16),brass,x,10.3,-19.22);rod.rotation.z=Math.PI/2;
  for(const dx of [-1.38,1.38])add(new T.SphereGeometry(.065,12,8),brass,x+dx,10.3,-19.22);
  add(new T.TorusGeometry(.72,.022,8,64),brass,x,8.4,-19.17);
  // 星圖刻度與細軌道取代厚重的浮凸菱形。
  const orbit=add(new T.TorusGeometry(.48,.013,8,64),brass,x,8.4,-19.15);orbit.scale.x=.55;orbit.rotation.z=x<0?.6:-.6;
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,tick=box(x+Math.sin(angle)*.64,8.4+Math.cos(angle)*.64,-19.14,.018,.07,.018,brass);tick.rotation.z=-angle;
  }
  add(new T.SphereGeometry(.075,16,12),brass,x,8.4,-19.1);
 }
 // 沿窗矮櫃不占用中央路徑。
 for(const z of [-11]){
  group.add(props.place('treasure_chest',9.4,.15,z,1.2,-Math.PI/2));
  box(9.4,.08,z,2.1,.16,3.5,wall);
  const lamp=new T.PointLight('#ffc080',25,6,1.7);lamp.position.set(9.4,2.4,z);group.add(lamp);
 }
}
