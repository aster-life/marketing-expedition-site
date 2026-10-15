import * as T from './assets/vendor/three.module.min.js';

// 房間的光線與環境：反光用的環境貼圖、燈火周圍的光暈、物件落地的接觸陰影。
// 全部是一次性預先算好的低成本做法（不用逐格後製），手機也只多幾個繪製批次。

function radial(stops,size=128){
 const c=document.createElement('canvas');c.width=c.height=size;const a=c.getContext('2d');const g=a.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
 stops.forEach(([at,color])=>g.addColorStop(at,color));a.fillStyle=g;a.fillRect(0,0,size,size);return c;
}

// 環境貼圖：一間看不見的暗室，牆上有幾塊暖燈與一扇冷色窗，讓金屬、皮面、玻璃有東西可以反射。
// 只在載入時用 PMREM 算一次，之後每格不再多花成本。
export function applyRoomEnvironment(renderer,scene,{warm='#ffb468',cool='#7fa8d6',intensity=.45,night=false}={}){
 const env=new T.Scene(),geos=[],mats=[];
 const add=(geo,color,k,pos,rot)=>{const m=new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(k),side:T.BackSide});const o=new T.Mesh(geo,m);o.position.set(...pos);if(rot)o.rotation.set(...rot);env.add(o);geos.push(geo);mats.push(m);return o;};
 add(new T.BoxGeometry(12,6,12),night?'#1b2630':'#2a2a2c',1,[0,3,0]);
 const panel=new T.PlaneGeometry(1,1);
 const front=(color,k,pos,size,rot)=>{const o=add(panel,color,k,pos,rot);o.material.side=T.DoubleSide;o.scale.set(...size);};
 // 暖燈：兩側牆與天花板的小光塊
 for(const z of [-3,1,4])for(const x of [-5.9,5.9])front(warm,night?5:7,[x,3.2,z],[.6,.8,1],[0,Math.PI/2,0]);
 front(warm,4,[0,5.9,0],[3,1.4,1],[Math.PI/2,0,0]);
 // 冷色窗：後方一大片，給反光一個藍灰色的對比
 front(cool,night?1.6:2.6,[2,3.2,-5.9],[4,2.6,1]);
 // 地面反射回來的暖褐色
 front('#5a4030',.8,[0,.02,0],[10,10,1],[-Math.PI/2,0,0]);
 const pmrem=new T.PMREMGenerator(renderer);const target=pmrem.fromScene(env,.035);pmrem.dispose();
 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
 scene.environment=target.texture;scene.environmentIntensity=intensity;
 return {dispose(){target.dispose();}};
}

// 光暈：所有燈火共用一個點雲，一個繪製批次；以疊加混色模擬眼睛看到強光時的散射。
let haloCanvas=null;
export function addHalos(scene,points,{color='#ffcf8f',size=1.1,opacity=.55,push=.35}={}){
 if(!points.length)return null;
 haloCanvas||=radial([[0,'rgba(255,255,255,1)'],[.2,'rgba(255,255,255,.78)'],[.42,'rgba(255,255,255,.34)'],[.7,'rgba(255,255,255,.08)'],[1,'rgba(255,255,255,0)']]);
 const tex=new T.CanvasTexture(haloCanvas);tex.colorSpace=T.SRGBColorSpace;
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
 const mat=new T.PointsMaterial({map:tex,color,size,sizeAttenuation:true,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 // 光暈沿視線往鏡頭推一點，才會蓋在燈罩前面發亮，而不是躲在燈的後面。
 mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);mvPosition.xyz+=normalize(-mvPosition.xyz)*${push.toFixed(3)};gl_Position=projectionMatrix*mvPosition;`);};
 mat.customProgramCacheKey=()=>'halo'+push;
 const halo=new T.Points(geo,mat);halo.renderOrder=4;halo.frustumCulled=false;scene.add(halo);return halo;
}

// 接觸陰影：家具底下一圈柔和的暗影，讓物件「坐」在地上，而不是浮在上面。
// 所有陰影共用同一個材質，房間合併靜態批次時會併成一個繪製批次。
// 每個房間各自建立一份（房間關閉時材質會一起釋放）。
export function createContactShadows(owned){
 const tex=new T.CanvasTexture(radial([[0,'rgba(0,0,0,.8)'],[.4,'rgba(0,0,0,.52)'],[.74,'rgba(0,0,0,.16)'],[1,'rgba(0,0,0,0)']]));owned?.add(tex);
 const mat=new T.MeshBasicMaterial({map:tex,color:'#000',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 return (parent,x,z,w,d,{y=.016,rotation=0}={})=>{const o=new T.Mesh(new T.PlaneGeometry(w,d),mat);o.rotation.set(-Math.PI/2,0,rotation);o.position.set(x,y,z);o.castShadow=false;parent.add(o);return o;};
}
