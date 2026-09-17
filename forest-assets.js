import * as T from './assets/vendor/three.module.min.js';
import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
export async function loadForestAssets(onProgress=()=>{}){
 const root='./3d/forest-match/assets/',loader=new GLTFLoader();
 const sources=[
  {path:root+'tree_small_02/tree_small_02-web.glb',weight:.76,bytes:20389512,label:'正在載入森林樹冠'},
  {path:root+'rock_moss_set_01/rock_moss_set_01_1k.gltf',weight:.14,bytes:1466380,label:'正在載入岩石地貌'},
  {path:root+'fern_02/fern_02_1k.gltf',weight:.10,bytes:900000,label:'正在載入林下植被'}
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
 function place(source,x,y,z,sx,sy,sz,rotation=0){const child=source.clone(true),group=new T.Group();group.add(child);group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());child.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));group.scale.set(sx/size.x,sy/size.y,sz/size.z);group.position.set(x,y,z);group.rotation.y=rotation;group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return group;}
 return {
  tree:(x,y,z,h,r)=>{const b=new T.Box3().setFromObject(tree.scene),s=b.getSize(new T.Vector3());return place(tree.scene,x,y,z,h*s.x/s.y,h,h*s.z/s.y,r);},
  rock:(i,x,y,z,sx,sy,sz,r)=>place(rockList[i%rockList.length],x,y,z,sx,sy,sz,r),
  fern:(i,x,y,z,s,r)=>place(fernList[i%fernList.length],x,y,z,s,s*.48,s,r)
 };
}
