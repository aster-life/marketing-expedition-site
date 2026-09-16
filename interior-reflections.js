import * as T from './assets/vendor/three.module.min.js';

// 從本案實際室內擷取一次反射，不引入與窗位、色溫不符的外部棚景。
export function createInteriorReflections(renderer,scene){
 const done=new Set();
 return function capture(name,root,position){
  if(done.has(name))return;
  const cube=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
  const camera=new T.CubeCamera(.1,65,cube);camera.position.set(...position);
  // 固定反射來源，不讓第一次捲到的進度決定整段影片與網頁的材質亮度。
  const visibility=scene.children.map(o=>[o,o.visible]);
  const lights=[];root.traverse(o=>{if(o.isLight){lights.push([o,o.intensity]);if(o.isSpotLight)o.intensity=160;}});
  const previousFog=scene.fog,previousBackground=scene.background;
  scene.children.forEach(o=>{o.visible=o===root;});root.visible=true;
  scene.fog=null;scene.background=new T.Color('#17232f');
  try{scene.updateMatrixWorld(true);camera.update(renderer,scene);}
  finally{visibility.forEach(([o,v])=>o.visible=v);lights.forEach(([o,v])=>o.intensity=v);scene.fog=previousFog;scene.background=previousBackground;}
  const generator=new T.PMREMGenerator(renderer),result=generator.fromCubemap(cube.texture);
  root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(m.isMeshStandardMaterial&&m.metalness>.2){m.envMap=result.texture;m.envMapIntensity=.7;m.needsUpdate=true;}
  }});
  generator.dispose();cube.dispose();done.add(name);
 };
}
