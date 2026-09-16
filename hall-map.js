import * as T from './assets/vendor/three.module.min.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// 沙盤以同一高度場定位地形、聚落與路線，避免物件懸空。
export function createHallMap(table,{stone,brass}){
 const batches=new Map();
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.78,...extra});
 const rock=stone.clone();rock.map=null;rock.normalMap=null;rock.roughnessMap=null;rock.color.set('#ffffff');rock.vertexColors=true;rock.roughness=.94;
 for(const key of ['map','normalMap','roughnessMap'])if(rock[key]){rock[key]=rock[key].clone();rock[key].repeat.set(2,2);}
 const masonry=material('#ada28a'),roof=material('#344e58',{metalness:.25}),forest=material('#244d43');
 const windowMat=material('#f8cb79',{emissive:'#ffc16c',emissiveIntensity:1.5});
 const water=material('#173c49',{metalness:.45,roughness:.27});
 const peaks=[[-.85,-.65,.97,.48],[.4,-1.15,.8,.43],[1.3,-.3,.63,.35],[-1.45,.5,.52,.38]];
 const height=(x,z)=>{
  const edge=T.MathUtils.smoothstep(2.55-Math.hypot(x,z),0,.55);
  let h=.07;
  for(const [px,pz,a,w] of peaks)h+=a*Math.exp(-((x-px)**2+(z-pz)**2)/(w*2));
  h+=(Math.sin(x*13+z*7)*Math.cos(z*17-x*3)*.035+Math.sin(x*27-z*19)*.015);
  return 1.59+Math.max(0,h)*edge;
 };
 function piece(g,m,x,y,z,ry=0){g.rotateY(ry);g.translate(x,y,z);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);}
 const box=(x,y,z,w,h,d,m,ry=0)=>piece(new T.BoxGeometry(w,h,d),m,x,y,z,ry);
 const cylinder=(x,y,z,r,h,m,n=12)=>piece(new T.CylinderGeometry(r,r,h,n),m,x,y,z);
 // 圓形地表沒有原本方形平面的硬邊；多頻率起伏形成破碎岩脊。
 const terrain=new T.BufferGeometry();
 // 同心環網格保留足夠內部頂點，而非只有扇形中心。
 const vertices=[],indices=[],uv=[];const rings=90,segments=192;
 for(let r=0;r<=rings;r++)for(let s=0;s<=segments;s++){
  const a=s/segments*Math.PI*2,rad=r/rings*2.57,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
  vertices.push(x,height(x,z),z);uv.push(x/5.14+.5,z/5.14+.5);
 }
 for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const colors=[];for(let i=0;i<vertices.length;i+=3){const h=vertices[i+1]-1.59;const c=new T.Color().lerpColors(new T.Color('#385a4a'),new T.Color('#a09c86'),T.MathUtils.clamp(h/1.2,0,1));colors.push(c.r,c.g,c.b);}
 terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.setAttribute('position',new T.Float32BufferAttribute(vertices,3));terrain.setAttribute('uv',new T.Float32BufferAttribute(uv,2));terrain.setIndex(indices);terrain.computeVertexNormals();
 const land=new T.Mesh(terrain,rock);land.castShadow=true;land.receiveShadow=true;table.add(land);
 cylinder(0,1.575,0,2.88,.035,water,128);
 // 層疊基座、鉚釘與細刻度讓桌體有製作尺度。
 for(const y of [1.24,1.34,1.45]){
  const ring=new T.TorusGeometry(3.15,.018,6,128);ring.rotateX(Math.PI/2);piece(ring,brass,0,y,0);
 }
 for(let i=0;i<64;i++){const a=i*Math.PI/32;cylinder(Math.cos(a)*3.16,1.58,Math.sin(a)*3.16,.021,.025,brass,6);}
 // 城塞的牆身、屋脊、窗孔、垛口形成可辨識輪廓。
 function tower(x,z,h=.32,r=.085){
  const y=height(x,z);cylinder(x,y+h/2,z,r,h,masonry);
  cylinder(x,y+h-.025,z,r*1.2,.05,brass);
  piece(new T.ConeGeometry(r*1.4,h*.48,8),roof,x,y+h+h*.24,z);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])box(x+Math.sin(a)*r,y+h*.65,z+Math.cos(a)*r,.026,.06,.008,windowMat,a);
 }
 const cx=-.4,cz=-.5,base=height(cx,cz);
 cylinder(cx,base+.04,cz,.43,.12,masonry,8);
 box(cx,base+.21,cz,.29,.37,.26,masonry);
 piece(new T.ConeGeometry(.25,.27,4),roof,cx,base+.53,cz,Math.PI/4);
 for(const [dx,dz] of [[-.28,-.22],[.28,-.22],[-.28,.22],[.28,.22]])tower(cx+dx,cz+dz,.42,.075);
 tower(cx,cz,.74,.065);
 // 小屋和林木採批次幾何；固定序列保證回捲時不會改變位置。
 for(let i=0;i<34;i++){
  const a=i*2.39996,r=.75+(i%7)*.15,x=Math.cos(a)*r,z=Math.sin(a)*r+.25;
  if(Math.hypot(x-cx,z-cz)<.65)continue;
  const y=height(x,z),h=.09+(i%4)*.018;
  box(x,y+h/2,z,.105,h,.085,masonry,a);
  piece(new T.ConeGeometry(.092,.075,4),roof,x,y+h+.035,z,a+Math.PI/4);
  box(x,y+h*.6,z+.044,.028,.038,.009,windowMat);
 }
 for(let i=0;i<110;i++){
  const a=i*2.39996,r=1.55+(i%13)/13*.85,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const y=height(x,z),h=.1+(i%5)*.018;
  piece(new T.ConeGeometry(.045,h,6),forest,x,y+h/2,z);
  piece(new T.ConeGeometry(.035,h*.7,6),forest,x,y+h*.85,z);
 }
 const routes=[];
 for(const [i,end] of [[1.95,.6],[-1.8,1.1],[.75,-2]].entries()){
  const points=[];
  for(let j=0;j<=40;j++){const t=j/40,x=cx+(end[0]-cx)*t,z=cz+(end[1]-cz)*t+Math.sin(t*Math.PI)*.22;points.push(new T.Vector3(x,height(x,z)+.045,z));}
  const m=material('#ad864a',{emissive:'#ffc475',emissiveIntensity:0});
  const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),100,.013,6,false),m);table.add(mesh);routes.push(m);
  tower(...end,.19,.06);
  const ring=new T.TorusGeometry(.13,.012,6,32);ring.rotateX(Math.PI/2);piece(ring,brass,end[0],height(...end)+.025,end[1]);
 }
 for(const [m,geometries] of batches){const merged=mergeGeometries(geometries,false);const mesh=new T.Mesh(merged,m);mesh.castShadow=true;mesh.receiveShadow=true;table.add(mesh);geometries.forEach(g=>g.dispose());}
 return routes;
}
