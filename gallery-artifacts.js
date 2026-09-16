import * as T from './assets/vendor/three.module.min.js';

// 細孔只影響表面起伏與粗糙度，不把石磚接縫帶入車製整石。
const grainData=new Uint8Array(128*128*4);let grainSeed=419;
for(let i=0;i<grainData.length;i+=4){grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const value=195+(grainSeed%55);grainData.set([value,value,value,255],i);}
const grain=new T.DataTexture(grainData,128,128,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;

// 近景展品採獨立幾何：紙頁有曲面、金屬有轉軸，保留之後動作所需部件。
export function createGalleryArtifact(kind,metal){
 const root=new T.Group();
 const paper=new T.MeshStandardMaterial({color:'#d4c39f',roughness:.92,bumpMap:grain,bumpScale:.002,side:T.DoubleSide});
 const leather=new T.MeshStandardMaterial({color:'#30251f',roughness:.8,bumpMap:grain,bumpScale:.008});
 const ink=new T.MeshStandardMaterial({color:'#65513b',roughness:.95});
 function mesh(g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;}
 const box=(x,y,z,w,h,d,m)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 const ring=(r,t,x,y,z)=>mesh(new T.TorusGeometry(r,t,12,96),metal,x,y,z);
 function sheet(width,depth,height,curve){
  const g=new T.PlaneGeometry(width,depth,48,24);g.rotateX(-Math.PI/2);
  const a=g.attributes.position;
  for(let i=0;i<a.count;i++)a.setY(i,height+curve(a.getX(i),a.getZ(i)));
  g.computeVertexNormals();return g;
 }
 if(kind===0){
  // 卷尾連續彎曲；紙面不再是一塊厚方板。
  const curve=(x,z)=>.035*Math.cos(x*2)+.19*Math.pow(Math.abs(z)/1.02,10);
  mesh(sheet(1.7,2.04,.11,curve),paper);
  for(const z of [-1.04,1.04]){
   const roll=mesh(new T.CylinderGeometry(.115,.115,1.87,32),paper,0,.23,z);roll.rotation.z=Math.PI/2;
   for(const x of [-.98,.98]){const cap=mesh(new T.SphereGeometry(.115,20,12),metal,x,.23,z);cap.scale.x=.55;}
  }
  for(let i=0;i<12;i++){const z=-.72+i*.12;box(-.12,.16+curve(0,z),z,.95-(i%4)*.095,.008,.011,ink);}
  const seal=mesh(new T.CylinderGeometry(.13,.13,.025,32),new T.MeshStandardMaterial({color:'#74382c',roughness:.65}),.53,.19,.66);
  const rim=ring(.34,.035,.48,.22,.22);rim.rotation.x=-Math.PI/2+.18;
  const rim2=ring(.30,.012,.48,.23,.22);rim2.rotation.copy(rim.rotation);
  const glass=mesh(new T.SphereGeometry(.29,40,20),new T.MeshPhysicalMaterial({color:'#bad6db',transparent:true,opacity:.22,roughness:.08,metalness:0,clearcoat:1}),.48,.22,.22);glass.scale.y=.08;
  const start=new T.Vector3(.72,.19,.46),end=new T.Vector3(1.12,.13,.88),direction=end.clone().sub(start);
  const midpoint=start.clone().add(end).multiplyScalar(.5);
  const handle=mesh(new T.CylinderGeometry(.055,.073,direction.length(),24),leather,...midpoint.toArray());handle.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
  mesh(new T.SphereGeometry(.065,20,12),metal,...start.toArray());
  root.children.forEach(o=>o.position.y-=.11);
 }else if(kind===1){
  // 書脊低、兩側紙頁微拱；層疊頁緣提供掠射光細節。
  for(const side of [-1,1]){
   const cover=box(side*.44,.08,0,.88,.09,1.98,leather);cover.rotation.z=-side*.055;
   for(let i=0;i<12;i++){
    const g=sheet(.82,1.86,.14+i*.008,(x,z)=>.08*Math.sin((x/.82+.5)*Math.PI)+.02*Math.cos(z*2));
    g.translate(side*.43,0,0);mesh(g,paper);
   }
   for(let row=0;row<13;row++){
    const z=-.72+row*.115;
    box(side*.43,.327+.02*Math.cos(z*2),z,.53-(row%5)*.035,.006,.012,ink);
   }
   for(const z of [-.9,.9])box(side*.72,.14,z,.16,.026,.11,metal);
  }
  box(0,.115,0,.055,.09,1.98,leather);
  box(.10,.34,.75,.07,.008,.55,new T.MeshStandardMaterial({color:'#7b3d32',roughness:.85}));
 }else{
  const profile=[[0,0],[.9,0],[1,.05],[1,.12],[.88,.18],[.76,.22],[.72,.3],[0,.3]].map(p=>new T.Vector2(...p));
  mesh(new T.LatheGeometry(profile,64),metal);
  for(let i=0;i<48;i++){
   const a=i*Math.PI/24;const tick=box(Math.sin(a)*.86,.19,Math.cos(a)*.86,.018,.014,i%4===0?.12:.06,leather);tick.rotation.y=a;
  }
  mesh(new T.CylinderGeometry(.045,.075,1.45,24),metal,0,1,0);
  for(const y of [.34,.4,.52,1.53,1.6])mesh(new T.CylinderGeometry(.085,.085,.035,24),metal,0,y,0);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   mesh(new T.SphereGeometry(.027,12,8),leather,Math.sin(a)*.9,.18,Math.cos(a)*.9);
  }
  for(let j=0;j<3;j++){
   const orbit=ring(.59+j*.16,.025,0,1.02,0);orbit.rotation.set(.45+j*.62,j*.52,.3);orbit.name='independent-orbit-'+j;
   for(const side of [-1,1])mesh(new T.SphereGeometry(.055,16,12),metal,0,1.02+side*.91,0);
  }
  for(const side of [-1,1]){
   const strut=mesh(new T.CylinderGeometry(.035,.055,.78,16),metal,side*.55,.56,0);strut.rotation.z=side*.4;
  }
  mesh(new T.SphereGeometry(.2,32,24),new T.MeshStandardMaterial({color:'#a8c8d3',metalness:.35,roughness:.3,emissive:'#568394',emissiveIntensity:.25}),0,1.02,0);
  mesh(new T.SphereGeometry(.065,20,12),metal,.62,1.23,.32);
 }
 return root;
}

export function createGalleryPedestal(stone,metal){
 const root=new T.Group();
 // 車製整石底座不用磚牆 UV，避免圓盤頂部放射狀磚縫。
 const pedestalStone=stone.clone();pedestalStone.map=null;pedestalStone.normalMap=null;pedestalStone.roughnessMap=grain;pedestalStone.bumpMap=grain;pedestalStone.bumpScale=.012;pedestalStone.color.set('#29353d');pedestalStone.roughness=.92;
 const profile=[[0,0],[1.85,0],[1.96,.08],[1.96,.2],[1.82,.29],[1.47,.33],[1.39,.44],[1.32,.54],[1.32,1.18],[1.43,1.29],[1.68,1.36],[1.79,1.45],[1.79,1.54],[0,1.54]].map(p=>new T.Vector2(...p));
 const body=new T.Mesh(new T.LatheGeometry(profile,96),pedestalStone);body.castShadow=true;body.receiveShadow=true;root.add(body);
 for(const y of [.3,1.3,1.49]){const rim=new T.Mesh(new T.TorusGeometry(y<.4?1.76:1.7,.018,8,96),metal);rim.rotation.x=Math.PI/2;rim.position.y=y;root.add(rim);}
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12;const strip=new T.Mesh(new T.BoxGeometry(.025,.59,.022),metal);strip.position.set(Math.sin(a)*1.325,.86,Math.cos(a)*1.325);strip.rotation.y=a;root.add(strip);
 }
 return root;
}
