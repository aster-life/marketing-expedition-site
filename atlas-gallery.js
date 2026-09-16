import {dressTreasury} from './treasury-detail.js?v=textile-1';
import * as T from './assets/vendor/three.module.min.js';
import {dressInterior} from './interior-detail.js?v=1';
import {createGalleryArtifact,createGalleryPedestal} from './gallery-artifacts.js?v=5';

// 展館入口承接本部出口世界座標；相機與展品揭示皆由捲動決定。
export function createAtlasGallery(scene,{stone,gold,glowMap,props}){
 const group=new T.Group();group.position.set(6.3,15.8,-143);scene.add(group);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.6,...extra});
 const wall=stone.clone();wall.color.set('#303d52');wall.roughness=.8;for(const k of ['map','normalMap','roughnessMap'])if(wall[k]){wall[k]=wall[k].clone();wall[k].repeat.set(3,2);}
 const metal=gold.clone();metal.color.set('#786047');metal.roughness=.37;metal.metalness=.86;
 const dark=mat('#142631',{metalness:.25}),paper=mat('#c6b68c'),ink=mat('#29404c');
 const luminous=mat('#e0bb73',{emissive:'#ffce8a',emissiveIntensity:.8});
 const add=(geo,m,x,y,z,parent=group)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x,y,z,w,h,d,m=wall,parent=group)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(x,y,z,r,h,m=metal,parent=group)=>add(new T.CylinderGeometry(r,r,h,48),m,x,y,z,parent);
 const tube=(points,r,m=metal)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,r,6,false),m,0,0,0);
 // 短廊有實際牆面與地板，走出拱口才展開挑高空間。
 box(0,-.12,7,3.5,.24,14);for(const side of [-1,1])box(side*1.8,4,7,.3,8,14);
 box(0,8,7,3.8,.3,14);
 box(0,-.18,-15,23,.36,33);
 for(const side of [-1,1]){
  box(side*11.5,8,-9.5,.4,16,22);
  for(const z of [-1,-10,-20,-29]){
   cyl(side*10.4,5,z,.3,10,wall);cyl(side*10.4,.3,z,.7,.6);cyl(side*10.4,9.8,z,.5,.2);
   tube([[side*10.4,9.8,z],[side*8,12,z],[side*4,14,z],[0,14.8,z]],.11);
   for(const y of [1,1.15,8.9])cyl(side*10.4,y,z,.38,.06);
  }
  for(const z of [-5,-15,-25]){
   // 頂部深夜藍、下緣霧藍；側窗使用獨立平面，保留正確貼圖方向。
   const sky=document.createElement('canvas');sky.width=128;sky.height=256;
   const context=sky.getContext('2d'),gradient=context.createLinearGradient(0,0,0,256);
   gradient.addColorStop(0,'#080e21');gradient.addColorStop(.55,'#172b48');gradient.addColorStop(1,'#435568');context.fillStyle=gradient;context.fillRect(0,0,128,256);
   for(let i=0;i<24;i++){context.fillStyle='rgba(191,210,230,.45)';context.fillRect((i*47)%128,(i*31)%170,1,1);}
   const skyMap=new T.CanvasTexture(sky);skyMap.colorSpace=T.SRGBColorSpace;
   const glass=new T.MeshBasicMaterial({map:skyMap,side:T.DoubleSide});
   const pane=add(new T.PlaneGeometry(3.4,8),glass,side*11.25,8,z);pane.rotation.y=Math.PI/2;
   for(const y of [6,9.5])box(side*11.12,y,z,.1,.035,3.4,metal);
   for(const dz of [-1.65,0,1.65])box(side*11.15,8,z+dz,.09,8.1,.07,metal);
   box(side*11.15,7,z,.12,.07,3.4,metal);
  }
 }
 box(0,8,-31.5,23,16,.4);box(0,15,-15,23,.3,33,dark);
 for(const x of [-2,2])box(x,.025,-15,.025,.02,31,metal);
 // 星圖圓窗與懸吊星環提供遠景焦點。
 const windowMat=mat('#1c3a51',{emissive:'#344c78',emissiveIntensity:.3});
 add(new T.CircleGeometry(4.2,96),windowMat,0,8.5,-31.24);
 for(const r of [2.1,3.5,4.25])add(new T.TorusGeometry(r,.045,8,96),metal,0,8.5,-31.17);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;tube([[0,8.5,-31.1],[Math.sin(a)*4.2,8.5+Math.cos(a)*4.2,-31.1]],.018);}
 const stars=new T.BufferGeometry(),points=[];
 for(let i=0;i<160;i++)points.push(Math.sin(i*2.4)*(3+i%8),7+(i%17)*.4,-2-(i%29));
 stars.setAttribute('position',new T.Float32BufferAttribute(points,3));group.add(new T.Points(stars,new T.PointsMaterial({color:'#f4d9a3',size:.035})));
 // 前廳不再預先展示三件展品；轉角後才由影片揭示星象儀。
 const partition=box(-3,6,-20,17,12,.65);
 for(const x of [-10.5,4.9]){
  cyl(x,5.7,-19.4,.48,11.4,wall);cyl(x,.3,-19.4,.7,.6,metal);
 }
 const spill=new T.PointLight('#8bbff5',200,22,1.4);spill.position.set(7,5,-24);group.add(spill);
 const warm=new T.PointLight('#ffc477',110,15,1.4);warm.position.set(5,1.4,-21);group.add(warm);
 const blue=new T.HemisphereLight('#8298bc','#171521',.7);group.add(blue);
 for(const z of [-4,-15,-26]){const fill=new T.PointLight('#8292b0',28,20,1.7);fill.position.set(0,6,z);group.add(fill);}
 const trim=dressInterior(group,{width:11.5,bays:[-1,-10,-20,-29],windowBays:[-5,-15,-25],windowY:8,windowHeight:8,windowWidth:3.4,metal,stone});
 trim.cutStone.color.set('#333c4c');
 // 柱冠以逐層收分代替單一方塊，保持原本柱身位置。
 for(const side of [-1,1])for(const z of [-1,-10,-20]){
  for(const [y,w,h] of [[6.44,.7,.1],[6.54,.84,.1],[6.94,1.08,.1]])box(side*10.4,y,z,w,h,w,trim.cutStone);
 }

 dressTreasury(group,{props,metal,wall});
 // 末端擴成門洞空間，近景柱與側窗不橫擋影片中的角色。
 for(const child of [...group.children])if(Math.abs(child.position.x)>10&&(child.position.z<-20||child.position.y<.7))group.remove(child);
 box(7.7,-.18,-26,15,.36,12);box(15,8,-26,.4,16,12);box(-10,8,-26,.4,16,12);
 // 門楣與側框屬於通道建築，攝影機靠近後自然離開視野。
 box(7.7,8.2,-30.7,14,1.2,1.1,wall);
 for(const x of [1.45,13.95])box(x,3.7,-30.7,.65,7.4,1.1,wall);

 const keys=[[0,[2.7,18.1,-123],[6.3,19.2,-131]],[.075,[6.3,18.1,-127],[6.3,19,-141]],[.18,[6.3,18.1,-141],[7,19,-151]],[.32,[6.3,18.5,-146],[9,19,-157]],[.47,[8,18.5,-151],[13,19,-162]],[.66,[12.2,18.5,-157],[14,19,-165]],[.85,[14,18.5,-163],[10,19,-171]],[1,[13,19,-168],[6.3,24,-174]]];
 const smooth=(a,b,p)=>{const t=T.MathUtils.clamp((p-a)/(b-a),0,1);return t*t*(3-2*t);};
 return {group,render(p,camera,narrow){
  const i=Math.max(0,keys.findIndex((k,j)=>j<keys.length-1&&p<=keys[j+1][0]));const a=keys[i],b=keys[i+1],t=smooth(a[0],b[0],p);
  camera.position.set(...a[1].map((v,j)=>T.MathUtils.lerp(v,b[1][j],t)));
  if(narrow)camera.position.z+=smooth(.25,.36,p)*1.8;
  camera.lookAt(...a[2].map((v,j)=>T.MathUtils.lerp(v,b[2][j],t)));
  const approach=smooth(.3,.62,p);blue.intensity=.7+approach*.08;spill.intensity=55+approach*20;spill.color.set('#8bbff5').lerp(new T.Color('#a4abc5'),approach);warm.intensity=80+approach*30;
 }};
}
