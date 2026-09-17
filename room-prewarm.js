// 進場運鏡前分批上傳材質、非同步編譯著色器，保留原始貼圖與模型。
export async function prewarmRoom(renderer,scene,camera,host){
 const started=performance.now(),textures=new Set();
 scene.traverse(object=>{
  const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
  materials.forEach(material=>Object.values(material).forEach(value=>{if(value?.isTexture)textures.add(value);}));
 });
 for(const texture of textures){
  renderer.initTexture(texture);
  // 讓出主執行緒，讓地圖運鏡與載入提示可以繼續更新。
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 await renderer.compileAsync(scene,camera);
 host.dataset.prewarmMs=(performance.now()-started).toFixed(1);
}
