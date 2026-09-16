import * as T from './assets/vendor/three.module.min.js';
import {dressInterior} from './interior-detail.js?v=1';
import {createHallMap} from './hall-map.js?v=detail-2';

const clamp=T.MathUtils.clamp;
const ease=(a,b,p)=>{const t=clamp((p-a)/(b-a),0,1);return t*t*(3-2*t);};

// 入口沿用城門的世界座標；所有動作只由捲動進度推導。
export function createExpeditionHall(scene,{stone,gold,glowMap,props}){
 const hall=new T.Group();hall.name='expedition-headquarters';hall.position.set(0,15.8,-91);scene.add(hall);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.68,...extra});
 const wall=stone.clone();wall.color.set('#58616a');wall.roughness=.85;
 for(const key of ['map','normalMap','roughnessMap'])if(wall[key]){wall[key]=wall[key].clone();wall[key].repeat.set(5,3);}
 const trim=mat('#81735b'),wood=mat('#6c5140',{map:props.woodMaps[0],normalMap:props.woodMaps[1],normalScale:new T.Vector2(.28,.28),roughnessMap:props.woodMaps[2]}),brass=gold.clone();brass.color.set('#b38b4b');brass.roughness=.6;
 const floorMat=stone.clone();floorMat.color.set('#64717c');floorMat.roughness=.53;
 // 試鋪僅作用於室內；紋理座標以公尺計算，避免每一塊磚重複同一張圖。
 const interiorMaterial=(id,color,repeat,normal)=>{
  const maps=props.interiorMaps[id].map(t=>{const c=t.clone();c.repeat.set(...repeat);return c;});
  return mat(color,{map:maps[0],normalMap:maps[1],normalScale:new T.Vector2(normal,normal),roughnessMap:maps[2],roughness:.88});
 };
 const paving=interiorMaterial('monastery_stone_floor','#b8bec5',[1,1],.38);
 const sideStone=interiorMaterial('rustic_stone_wall_02','#959faa',[12,4.5],.45);
 const paper=mat('#c2b191'),ink=mat('#193a43'),green=mat('#3b4c3e');
 const add=(g,m,x,y,z,parent=hall)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x,y,z,w,h,d,m=wall,parent=hall)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(x,y,z,rt,rb,h,m=brass,parent=hall)=>add(new T.CylinderGeometry(rt,rb,h,32),m,x,y,z,parent);
 function tube(points,r,m=trim,parent=hall){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),48,r,8,false),m,0,0,0,parent);}
 function arc(cx,y,z,w,h,m=trim){
  return tube([[cx-w/2,y,z],[cx-w/2,y+h*.54,z],[cx-w*.32,y+h*.86,z],[cx,y+h,z],[cx+w*.32,y+h*.86,z],[cx+w/2,y+h*.54,z],[cx+w/2,y,z]],.16,m);
 }
 // 門廊有真實側牆與頂部，中央維持可通行開口。
 box(0,-.2,-20,20,.4,42,floorMat);
 for(const side of [-1,1]){
  box(side*6.3,7,-.3,8,14,.7);
  box(side*2.55,4.8,-2.7,.7,9.6,5.5);
  box(side*10.2,7,-23,.7,14,36);
 }
 box(0,11.8,-2.7,5.8,4.4,5.5);box(0,14,-23,21,.5,36);
 // 小幅高差以門檻坡面消化，避免相機跨過地板斷層。
 box(0,-.06,.4,4.5,.12,1.7,floorMat);
 // 保留中央整齊方石步道；兩側採連續板岩，避免方磚與不規則石縫互相打架。
 const tile=new T.InstancedMesh(new T.BoxGeometry(1.25,.045,1.6),floorMat,96),dummy=new T.Object3D();let ti=0;
 for(let z=0;z<24;z++)for(let x=0;x<4;x++){dummy.position.set((x-1.5)*1.3,.025,-z*1.68);dummy.updateMatrix();tile.setMatrixAt(ti++,dummy.matrix);}tile.receiveShadow=true;hall.add(tile);
 for(const side of [-1,1]){
  const g=new T.PlaneGeometry(6.8,39.8);g.rotateX(-Math.PI/2);g.translate(side*6.1,.052,-19.9);
  const pos=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/1.8,pos.getZ(i)/1.8);
  add(g,paving,0,0,0);
  const lining=add(new T.PlaneGeometry(35.8,13.4),sideStone,side*9.83,7,-23);
  lining.rotation.y=-side*Math.PI/2;
 }
 for(const x of [-2.7,2.7])box(x,.055,-20,.035,.016,39,brass);
 // 三跨高拱、柱礎、柱冠與連續肋拱提供近遠遮擋。
 for(const z of [-7,-16,-25,-34]){
  arc(0,0,z,17.8,13.4);
  for(const side of [-1,1]){
   const x=side*8.9;
   box(x,.2,z,1.5,.4,1.5,trim);cyl(x,3.8,z,.36,.47,7.2,wall);
   for(const dy of [.7,6.7,7.25])box(x,dy,z,1,.2,1,trim);
   for(const dx of [-.32,.32])cyl(x+dx,3.75,z+.15,.07,.09,6.1,trim);
  }
 }
 for(const side of [-1,1])for(const z of [-7,-16,-25])tube([[side*8.9,7,z],[side*6,10,z-3],[0,13.4,z-4.5],[side*-6,10,z-6],[side*-8.9,7,z-9]],.09,trim);
 // 壁腳、柱身環帶與拱頂接點補足近景尺度。
 for(const side of [-1,1]){
  for(const y of [.2,.55,6.9])box(side*9.77,y,-23,.22,.13,35,trim);
  for(const z of [-7,-16,-25,-34]){
   for(const y of [1.1,1.22,6.45])cyl(side*8.9,y,z,.49,.49,.065,brass);
   for(const dx of [-.5,.5])box(side*8.9+dx,.53,z,.13,.42,1.15,wall);
   for(const dz of [-.31,.31])tube([[side*8.9,7.3,z+dz],[side*6.2,10.6,z+dz],[0,13.3,z+dz]],.065,wall);
  }
 }
 for(const z of [-7,-16,-25,-34]){
  const boss=add(new T.IcosahedronGeometry(.3,1),brass,0,13.24,z);boss.scale.y=.45;
 }
 // 背牆以分件留出右後出口，沒有封死的門面貼片。
 box(-2.8,7,-40,14.9,14,.7);box(9.075,7,-40,2.25,14,.7);box(6.3,10.75,-40,3.3,6.5,.7);
 arc(6.3,0,-39.5,3.3,7.5,brass);
 const exitPivot=new T.Group();exitPivot.position.set(4.65,0,-40.2);hall.add(exitPivot);
 box(1.65,3.75,0,3.3,7.5,.24,wood,exitPivot);
 for(const dx of [.15,3.15])box(dx,3.75,.16,.08,7.2,.08,brass,exitPivot);
 box(6.3,-.05,-43,3.3,.1,6,floorMat);
 const exitLight=new T.PointLight('#ffcf92',0,15,2);exitLight.position.set(6.3,3.5,-42);hall.add(exitLight);
 const exitGlow=mat('#8e7243',{emissive:'#ffc16c',emissiveIntensity:0});box(6.3,3.5,-40.05,.035,6.8,.035,exitGlow);
 // 深色實木門：細木紋、板縫與內嵌面板共用原門軸。
 const doorMaps=props.woodMaps.map(t=>{const c=t.clone();c.rotation=Math.PI/2;c.repeat.set(2,.095);c.offset.set(0,.025);return c;});
 const doorWood=mat('#8c6d56',{map:doorMaps[0],normalMap:doorMaps[1],normalScale:new T.Vector2(.32,.32),roughnessMap:doorMaps[2],roughness:.9});
 const bronze=mat('#66503a',{metalness:.65,roughness:.63});
 const recess=mat('#21170f');
 const doors=[];
 for(const side of [-1,1]){
  const pivot=new T.Group();pivot.position.set(side*2.14,0,.08);hall.add(pivot);doors.push(pivot);
  const cx=-side*1.065;
  box(cx,4.45,0,2.13,8.9,.48,recess,pivot);
  // 獨立長木板保留窄縫，避免平整單片塑膠感。
  for(let i=0;i<7;i++)box(cx+(i-3)*.294,4.45,.14,.282,8.66,.24,doorWood,pivot);
  for(const dx of [-.94,.94])box(cx+dx,4.45,.29,.16,8.85,.18,doorWood,pivot);
  for(const y of [.22,2.72,6.32,8.68])box(cx,y,.3,2,.18,.18,doorWood,pivot);
  for(const [y,h] of [[1.45,2.08],[4.52,3.1],[7.5,1.93]]){
   for(const dx of [-.78,.78])box(cx+dx,y,.31,.06,h,.09,bronze,pivot);
   for(const dy of [-h/2,h/2])box(cx,y+dy,.31,1.62,.055,.09,bronze,pivot);
  }
  for(const y of [.55,2.6,6.5,8.35]){
   box(cx,y,.42,1.91,.15,.065,bronze,pivot);
   for(const dx of [-.84,-.55,.55,.84])add(new T.SphereGeometry(.036,8,6),bronze,cx+dx,y,.47,pivot);
  }
  const hx=-side*1.72;
  box(hx,3.7,.4,.25,.5,.1,bronze,pivot);
  const ring=add(new T.TorusGeometry(.19,.043,10,32),bronze,hx,3.57,.54,pivot);ring.name='door-handle';
  add(new T.SphereGeometry(.065,12,8),bronze,hx,3.78,.52,pivot);
 }
 const fixtures=[];
 function lamp(x,y,z,start,amount=38){
  const bulb=mat('#a27232',{emissive:'#ffc174',emissiveIntensity:.18});
  cyl(x,y,z,.15,.18,.65,bulb);cyl(x,y-.42,z,.3,.3,.1);add(new T.ConeGeometry(.34,.25,8),brass,x,y+.47,z);
  for(const dx of [-.22,.22])box(x+dx,y,z,.035,.8,.035,brass);
  const sprite=new T.Sprite(new T.SpriteMaterial({map:glowMap,transparent:true,opacity:.04,depthWrite:false,blending:T.AdditiveBlending}));sprite.position.set(x,y,z);sprite.scale.setScalar(1.6);hall.add(sprite);
  const light=new T.PointLight('#ffc280',0,13,2);light.position.set(x,y,z);hall.add(light);
  fixtures.push({bulb,sprite,light,start,amount});
 }
 lamp(-1.6,3,-4,.17,22);lamp(1.6,3,-4,.17,22);
 for(const x of [-1.6,1.6])tube([[x,3.55,-4],[x,9.6,-4]],.023,brass);
 for(const side of [-1,1])for(const [i,z] of [-10,-22,-34].entries()){
  box(side*9.4,3,z,.9,.14,.8,brass);lamp(side*9.2,3.5,z,.34+i*.13,55);
 }
 // 高窗的冷光保留森林的色溫，不把室內變成全黃。
 const glass=mat('#416782',{emissive:'#6c9bbb',emissiveIntensity:.28,roughness:.3});
 for(const side of [-1,1])for(const z of [-11,-22,-33]){
  box(side*9.79,8.7,z,.07,4.8,2.2,glass);for(const dz of [-1,0,1])box(side*9.68,8.7,z+dz,.13,4.9,.07,brass);
  box(side*9.68,8.5,z,.13,.08,2.2,brass);
 }
 const windowDisc=add(new T.CircleGeometry(2.65,64),glass,-1.5,8,-39.61);
 add(new T.TorusGeometry(2.7,.13,8,80),brass,-1.5,8,-39.5);
 add(new T.TorusGeometry(1.75,.045,8,80),brass,-1.5,8,-39.47);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;tube([[-1.5,8,-39.4],[-1.5+Math.cos(a)*2.6,8+Math.sin(a)*2.6,-39.4]],.04,brass);}
 const ambient=new T.HemisphereLight('#a9c3d7','#322314',1);hall.add(ambient);
 const cool=new T.SpotLight('#91c4e7',370,48,.72,.65,1.5);cool.position.set(-7,12,-13);cool.target.position.set(1,0,-22);hall.add(cool,cool.target);
 const tableLight=new T.SpotLight('#ffd49b',0,25,.8,.5,1.5);tableLight.position.set(1.2,9,-21);tableLight.target.position.set(1.2,0,-21);tableLight.castShadow=true;tableLight.shadow.mapSize.set(1024,1024);tableLight.shadow.bias=-.0003;hall.add(tableLight,tableLight.target);
 // 主桌為立體浮雕沙盤；邊緣、山脈、塔樓與路線都是幾何。
 const table=new T.Group();table.position.set(1.2,0,-21);hall.add(table);
 cyl(0,.19,0,3.2,3.5,.36,wall,table);cyl(0,.78,0,1.4,2.35,1.2,wood,table);cyl(0,1.35,0,3.25,3.05,.22,brass,table);
 cyl(0,1.51,0,3.05,3.05,.1,ink,table);
 for(const r of [2.95,3.18]){const o=add(new T.TorusGeometry(r,.045,8,96),brass,0,1.55,0,table);o.rotation.x=Math.PI/2;}
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const o=box(Math.sin(a)*3.1,1.57,Math.cos(a)*3.1,.025,.025,i%4===0?.17:.08,brass,table);o.rotation.y=a;}
 const routes=createHallMap(table,{stone,brass});
 const orrery=new T.Group();orrery.position.set(1.2,6,-21);hall.add(orrery);
 for(let i=0;i<3;i++){const o=add(new T.TorusGeometry(1.4+i*.27,.025,8,96),brass,0,0,0,orrery);o.rotation.set(i*.72,.4+i*.65,0);}
 add(new T.SphereGeometry(.17,24,16),glass,0,0,0,orrery);tube([[1.2,13,-21],[1.2,8,-21],[1.2,7.8,-21]],.025,brass);
 // 左側典籍區與右側製圖檯，內容入口由 DOM 呈現。
 for(const z of [-14,-21,-28]){
  hall.add(props.place('wooden_bookshelf_worn',-8.9,0,z,3.9,Math.PI/2));
  // 書籍底面對齊實際層板上表面，維持模型原比例。
  const shelfScale=3.9/props.metrics.wooden_bookshelf_worn.size[1];
  for(const [row,level] of [.107,.392,.961,1.276].entries())
   hall.add(props.place('book_encyclopedia_set_01',-8.83,level*shelfScale+.015,z+(row%2?.4:-.35),.4,Math.PI/2));
 }
 for(const z of [-16,-27]){
  hall.add(props.place('wooden_table_02',7.2,0,z,1.48,Math.PI/2));
  const sheet=box(7.12,1.50,z,.86,.025,1.05,paper);sheet.rotation.y=.13;
  for(let i=0;i<5;i++)box(7.12,1.52,z-.34+i*.15,.65-i*.065,.01,.017,ink);
  lamp(7.55,2.1,z-.7,.59,24);
  hall.add(props.place('book_encyclopedia_set_01',7.25,1.49,z+.68,.23,-Math.PI/2));
 }
 cyl(-4,.4,-33,2.3,2.5,.8,wall);cyl(-4,1.2,-33,.12,.28,1.2,brass);
 const telescope=cyl(-4,2.1,-33,.22,.35,2.3,brass);telescope.rotation.z=1.1;
 box(-4,1.35,-35,.15,2.7,.15,brass);cyl(-4,.1,-35,.4,.5,.2,wall);
 lamp(-4,3.3,-35,.7,65);box(-4,2.88,-35,.5,.12,.5,brass);
 box(8.65,3.15,-39.2,1.1,.13,.8,brass);lamp(8.3,3.6,-39.2,.87,45);
 dressInterior(hall,{width:10,bays:[-7,-16,-25,-34],windowBays:[-11,-22,-33],windowY:8.7,windowHeight:4.8,windowWidth:2.2,metal:brass,stone});
 return {
  group:hall,
  update(p){
   const opened=ease(.17,.29,p);doors[0].rotation.y=opened*Math.PI*.47;doors[1].rotation.y=-opened*Math.PI*.47;
   fixtures.forEach(f=>{const a=ease(f.start,f.start+.1,p);f.light.intensity=a*f.amount;f.bulb.emissiveIntensity=.1+a*2;f.sprite.material.opacity=.02+a*.38;});
   tableLight.intensity=25+ease(.36,.5,p)*130;
   routes.forEach((m,i)=>m.emissiveIntensity=ease(.49+i*.08,.59+i*.08,p)*2.3);
   exitPivot.rotation.y=ease(.88,.99,p)*Math.PI*.42;exitLight.intensity=ease(.88,.99,p)*55;
   orrery.rotation.y=ease(.45,.82,p)*.4;exitGlow.emissiveIntensity=ease(.87,.97,p)*2;exitGlow.visible=p<.9;
   return opened;
  }
 };
}
