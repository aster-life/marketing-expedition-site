import * as T from './assets/vendor/three.module.min.js';
import {createGLTFLoader,webAsset} from './web-assets.js';
export async function loadForestAssets(onProgress=()=>{}){
 const root='./3d/forest-match/assets/',loader=createGLTFLoader();
 const sources=[
  {path:webAsset(root+'tree_small_02/tree_small_02-web.glb'),weight:.76,bytes:6510000,label:'正在載入森林樹冠'},
  {path:webAsset(root+'rock_moss_set_01/rock_moss_set_01_1k.gltf'),weight:.14,bytes:1160000,label:'正在載入岩石地貌'},
  {path:webAsset(root+'fern_02/fern_02_1k.gltf'),weight:.10,bytes:370000,label:'正在載入林下植被'}
 ];
 const portions=sources.map(()=>0);
 const report=(index,event,label)=>{
  const total=event?.total||sources[index].bytes;
  portions[index]=Math.max(portions[index],Math.min(1,(event?.loaded||0)/Math.max(1,total)));
  onProgress(portions.reduce((sum,value,i)=>sum+value*sources[i].weight,0),label);
 };
 const [tree,rocks,ferns]=await Promise.all(sources.map((source,index)=>
  loader.loadAsync(source.path,event=>report(index,event,source.label)).then(asset=>{
   portions[index]=1;onProgress(portions.reduce((sum,value,i)=>sum+value*sources[i].weight,0),source.label);return asset;
  })
 ));
 onProgress(1,'森林模型已就緒');
 // 材質本身降低黃綠與土褐，保留貼圖明暗，讓月光下的岩面與植物同屬冷色環境。
 for(const [asset,amount] of [[tree,.24],[rocks,.48],[ferns,.36]]){
  const seen=new Set();asset.scene.traverse(o=>{if(!o.isMesh)return;for(const mat of (Array.isArray(o.material)?o.material:[o.material])){
   if(seen.has(mat))continue;seen.add(mat);
   mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(gray),${amount.toFixed(2)})*vec3(.84,.94,1.0);`);};
   mat.customProgramCacheKey=()=>`forest-moon-${amount}`;
   if(asset===rocks)mat.roughness=.64;
  }});
 }
 function templates(gltf){const list=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){const m=o.clone();m.applyMatrix4(o.parent.matrixWorld);list.push(m);}});return list;}
 const rockList=templates(rocks),fernList=templates(ferns);
 const treeBounds=new T.Box3().setFromObject(tree.scene),treeSize=treeBounds.getSize(new T.Vector3()),treeCenter=treeBounds.getCenter(new T.Vector3());
 tree.scene.updateMatrixWorld(true);
 const treeMeshes=[];tree.scene.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)treeMeshes.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()});});
 function place(source,x,y,z,sx,sy,sz,rotation=0){const child=source.clone(true),group=new T.Group();group.add(child);group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());child.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));group.scale.set(sx/size.x,sy/size.y,sz/size.z);group.position.set(x,y,z);group.rotation.y=rotation;group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return group;}
 return {
  tree:(x,y,z,h,r)=>{const b=new T.Box3().setFromObject(tree.scene),s=b.getSize(new T.Vector3());return place(tree.scene,x,y,z,h*s.x/s.y,h,h*s.z/s.y,r);},
  treeBatch:(placements=[])=>{
   const group=new T.Group(),normalizer=new T.Matrix4().makeTranslation(-treeCenter.x,-treeBounds.min.y,-treeCenter.z),axis=new T.Vector3(0,1,0);
   group.name='forest-detail-trees';
   const transforms=placements.map(treePlacement=>{
    const scale=treePlacement.h/treeSize.y;
    return new T.Matrix4().compose(new T.Vector3(treePlacement.x,treePlacement.y,treePlacement.z),new T.Quaternion().setFromAxisAngle(axis,treePlacement.r),new T.Vector3(scale,scale,scale)).multiply(normalizer);
   });
   // 使用完整樹冠包圍盒判斷，不替換模型，也不以樹幹中心判斷可見性。
   const bounds=transforms.map(matrix=>treeBounds.clone().applyMatrix4(matrix));
   const batches=treeMeshes.map(source=>{
    const mesh=new T.InstancedMesh(source.geometry,source.material,placements.length);
    mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
    const matrices=transforms.map(matrix=>matrix.clone().multiply(source.matrix));
    matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);
    return {mesh,matrices};
   });
   const frustum=new T.Frustum(),viewProjection=new T.Matrix4(),worldBounds=new T.Box3();
   let lastSelection=placements.map((_,i)=>i).join(',');
   group.userData.updateVisibility=(camera,shadowPass)=>{
    // 森林陰影仍啟用時保留所有投影者；穿門後才剔除視野外的完整樹木。
    camera.updateMatrixWorld();group.updateWorldMatrix(true,false);
    viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewProjection);
    const visible=[];
    bounds.forEach((bound,index)=>{if(shadowPass||frustum.intersectsBox(worldBounds.copy(bound).applyMatrix4(group.matrixWorld)))visible.push(index);});
    const selection=visible.join(',');if(selection===lastSelection)return;
    lastSelection=selection;
    for(const {mesh,matrices} of batches){
     visible.forEach((sourceIndex,index)=>mesh.setMatrixAt(index,matrices[sourceIndex]));
     mesh.count=visible.length;mesh.instanceMatrix.needsUpdate=true;
    }
   };
   return group;
  },
  rock:(i,x,y,z,sx,sy,sz,r)=>place(rockList[i%rockList.length],x,y,z,sx,sy,sz,r),
  fern:(i,x,y,z,s,r)=>place(fernList[i%fernList.length],x,y,z,s,s*.48,s,r)
 };
}
