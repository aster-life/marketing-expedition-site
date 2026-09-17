import * as T from './assets/vendor/three.module.min.js';
import {mergeGeometries} from './assets/vendor/BufferGeometryUtils.js';

// 僅合併不會獨立移動的不透明網格；保留根群組變形、材質、面數與陰影設定。
export function batchStaticMeshes(root){
 root.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),groups=new Map(),originals=new Set();
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||Array.isArray(mesh.material)||mesh.material.transparent||!mesh.visible||Object.keys(mesh.geometry.morphAttributes).length)return;
  const attributes=Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,a.itemSize,a.normalized,a.array.constructor.name].join(':')).sort().join('|');
  const key=[mesh.material.uuid,mesh.castShadow,mesh.receiveShadow,mesh.renderOrder,mesh.layers.mask,attributes].join('/');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const parts=meshes.map(mesh=>{const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));return geometry;});
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const first=meshes[0],batch=new T.Mesh(geometry,first.material);
  batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
  for(const mesh of meshes){originals.add(mesh.geometry);mesh.removeFromParent();}root.add(batch);
 }
 const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry);});
 originals.forEach(g=>{if(!retained.has(g))g.dispose();});
}
