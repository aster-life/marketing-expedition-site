import * as T from './assets/vendor/three.module.min.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';
import {createGLTFLoader,webAsset} from './web-assets.js';

// CC0 原始 glTF 與材質保留於資產目錄；不改写原始模型。
export async function loadHallAssets({resolution='2k',onProgress=()=>{}}={}){
 const loader=createGLTFLoader();
 const ids=['wooden_table_02','wooden_bookshelf_worn','book_encyclopedia_set_01','treasure_chest'];
 // 逐件解析，避免多組 glTF 與圖片在同一個主執行緒尖峰完成。
 const results=[];
 for(const [index,id] of ids.entries()){
  results.push(await loader.loadAsync(webAsset(`./3d/hall-assets/${id}/${id}_${id==='treasure_chest'?'1k':resolution}.gltf`)));
  onProgress((index+1)/6*.72,`正在整理${['製圖桌','典籍書架','藏書','寶庫陳設'][index]}`);
 }
 const models=Object.fromEntries(ids.map((id,i)=>[id,results[i].scene]));
 // 同材質靜態書籍合併繪製，保留每本書的實際幾何與 UV。
 const originalBooks=models.book_encyclopedia_set_01;originalBooks.updateMatrixWorld(true);
 const batches=new Map();originalBooks.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;
  if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});
  batches.get(key).geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
 });
 const books=new T.Group();for(const batch of batches.values()){
  const geometry=mergeGeometries(batch.geometries,false);if(!geometry)throw new Error('書籍幾何合併失敗');
  books.add(new T.Mesh(geometry,batch.material));batch.geometries.forEach(g=>g.dispose());
 }models.book_encyclopedia_set_01=books;
 onProgress(.78,'正在整理典籍細節');
 const metrics={};
 for(const [id,root] of Object.entries(models)){
  root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);let triangles=0,meshes=0,missingMaps=0;
  root.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m.map)missingMaps++;for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(m[k])m[k].anisotropy=4;}
  });metrics[id]={size:box.getSize(new T.Vector3()).toArray(),triangles,meshes,missingMaps};
 }
 function place(id,x,y,z,height,rotation=0){
  const root=models[id].clone(true),bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  root.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));
  const group=new T.Group();group.add(root);group.scale.setScalar(height/size.y);group.position.set(x,y,z);group.rotation.y=rotation;
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return group;
 }
 const textureLoader=new T.TextureLoader();
 const woodMaps=await Promise.all(['diff','nor_gl','rough'].map(k=>textureLoader.loadAsync(webAsset('./3d/hall-materials/wood_planks/wood_planks_'+k+'_1k.jpg'))));
 woodMaps.forEach(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;});woodMaps[0].colorSpace=T.SRGBColorSpace;
 const interiorMaps={};
 await Promise.all(['monastery_stone_floor','rustic_stone_wall_02'].map(async id=>{
  const maps=await Promise.all(['diff','nor_gl','rough'].map(k=>textureLoader.loadAsync(webAsset(`./3d/interior-candidates/${id}/${id}_${k}_1k.jpg`))));
  maps.forEach(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;});maps[0].colorSpace=T.SRGBColorSpace;interiorMaps[id]=maps;
 }));
 onProgress(1,'遠征本部資產已就緒');
 return {place,metrics,woodMaps,interiorMaps};
}
