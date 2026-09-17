import {GLTFLoader} from './assets/vendor/GLTFLoader.js';
import {createAtlasGallery} from './atlas-gallery.js?v=textile-1';
import * as T from './assets/vendor/three.module.min.js';
import {loadForestAssets} from './forest-assets.js?v=moon-2';
import {createExpeditionHall} from './expedition-hall.js?v=continuity-1';
import {hallCamera} from './hall-camera.js?v=1';
import {loadHallAssets} from './hall-assets.js?v=performance-4';
import {createInteriorReflections} from './interior-reflections.js?v=2';

// 真實空間：石徑、岩台、樹木、拱橋與城堡各自具有完整幾何。
export async function createForest(host,onFailure=()=>{},options={}){
 const report=(stage,value,label)=>options.onProgress?.({stage,value,label});
 const constrained=options.constrained??(matchMedia('(max-width: 700px)').matches||(navigator.deviceMemory&&navigator.deviceMemory<=4));
 const renderer=new T.WebGLRenderer({antialias:!constrained,powerPreference:'high-performance'});
 renderer.setPixelRatio(options.pixelRatio??Math.min(devicePixelRatio,constrained?1:1.25));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 report('forest',.02,'正在喚醒森林入口');
 const assets=await loadForestAssets((value,label)=>report('forest',.04+value*.53,label));
 const scene=new T.Scene();scene.background=new T.Color('#13283c');scene.fog=new T.FogExp2('#39618b',.0095);
 const camera=new T.PerspectiveCamera(54,16/9,.1,260);
 let seed=9271;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 const loader=new T.TextureLoader(),base='./3d/forest-match/assets/mossy_cobblestone/mossy_cobblestone_';
 const terrainResolution=constrained?'1k':'2k';
 const [diff,normal,rough]=await Promise.all(['diff','nor_gl','rough'].map(n=>loader.loadAsync(`${base}${n}_${terrainResolution}.jpg`)));
 report('forest',.68,'正在鋪設森林石徑');
 await new Promise(resolve=>requestAnimationFrame(resolve));
 diff.colorSpace=T.SRGBColorSpace;for(const t of [diff,normal,rough]){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.82,...extra});
 const rock=material('#8a9eb5',{roughness:.46,map:diff,normalMap:normal,normalScale:new T.Vector2(.75,.75),roughnessMap:rough});
 const cliffMat=material('#495957',{roughness:.96});
 const stone=material('#82919a',{map:diff,normalMap:normal,normalScale:new T.Vector2(.3,.3)});
 const gold=material('#8e6b39',{metalness:.7,roughness:.35});
 const roof=material('#254157',{metalness:.35,roughness:.45});
 const lightMat=new T.MeshBasicMaterial({color:'#d99b50',fog:false}),moss=material('#354d29');
 // 樹皮紋理由枝幹表面座標產生，避免整根樹是光滑圓管。
 const bark=material('#4c5147');
 bark.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 barkPos;').replace('#include <begin_vertex>','#include <begin_vertex>\nbarkPos=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 barkPos;').replace('#include <color_fragment>','#include <color_fragment>\nfloat ridge=sin(barkPos.x*31.0+sin(barkPos.y*1.7)*1.8+barkPos.z*23.0);float fine=sin(barkPos.x*123.0+barkPos.z*91.0+barkPos.y*3.0);diffuseColor.rgb*=.85+.09*ridge+.06*fine;');};
 const add=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;scene.add(o);return o;};
 const box=(x,y,z,w,h,d,m=stone)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 const sphere=new T.SphereGeometry(1,12,8);
 const geoRock=new T.IcosahedronGeometry(1,3),rp=geoRock.attributes.position;
 for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);const n=1+.14*Math.sin(x*11+y*8)*Math.cos(z*9)+.07*Math.sin(z*21+x*17);rp.setXYZ(i,x*n,y*n,z*n);}geoRock.computeVertexNormals();
 let rockId=0;function boulder(x,y,z,sx,sy,sz){const group=new T.Group(),layers=Math.max(1,Math.ceil(sy/(sx*.6))),layerHeight=sy*2/layers;for(let k=0;k<layers;k++){const o=assets.rock(rockId++,x+(random()-.5)*sx*.25,y-sy*.65+k*layerHeight*.76,z+(random()-.5)*sz*.2,sx*2,layerHeight,sz*2,random()*6.28);group.add(o);}scene.add(group);return group;}
 const hemi=new T.HemisphereLight('#88b8f5','#182d46',2.7);scene.add(hemi);
 const moon=new T.DirectionalLight('#97c2ff',3.7);moon.position.set(-18,48,-28);moon.castShadow=true;moon.shadow.mapSize.set(constrained?1024:2048,constrained?1024:2048);Object.assign(moon.shadow.camera,{left:-30,right:30,top:40,bottom:-30,near:1,far:140});moon.shadow.bias=-.0005;scene.add(moon);scene.add(moon.target);moon.target.position.set(0,4,-25);
 const fill=new T.DirectionalLight('#eeb66b',.32);fill.position.set(8,12,16);scene.add(fill);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),gr=gc.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'#fff1d7');gr.addColorStop(.12,'#ffdc9ca0');gr.addColorStop(.5,'#ffb96325');gr.addColorStop(1,'#ffb96300');gc.fillStyle=gr;gc.fillRect(0,0,128,128);const glowMap=new T.CanvasTexture(glowCanvas);
 function glow(x,y,z,size=2){const o=new T.Sprite(new T.SpriteMaterial({map:glowMap,fog:false,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));o.position.set(x,y,z);o.scale.setScalar(size);scene.add(o);}
 function lantern(x,y,z,s=.7){box(x,y+.08*s,z,.8*s,.16*s,.8*s,rock);add(new T.CylinderGeometry(.16*s,.23*s,.7*s,8),lightMat,x,y+.6*s,z);for(const a of [0,1,2,3]){const r=a*Math.PI/2;box(x+Math.cos(r)*.25*s,y+.6*s,z+Math.sin(r)*.25*s,.04*s,.9*s,.04*s,gold);}add(new T.ConeGeometry(.43*s,.3*s,8),gold,x,y+1.15*s,z);glow(x,y+.6*s,z,2.5*s);}
 const pathX=z=>Math.sin((z+3)*.052)*1.15;
 const groundY=z=>Math.max(0,-z*.075);
 // 獨立石塊沿緩彎石徑上升，鏡頭會真正穿過近景樹幹。
 const groundGeo=new T.PlaneGeometry(80,145,50,90);groundGeo.rotateX(-Math.PI/2);
 const gp=groundGeo.attributes.position;for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i)-52;gp.setXYZ(i,x,groundY(z)-.28+Math.sin(x*.5)*Math.sin(z*.23)*.16+smooth(4,17,Math.abs(x))*(2.2+Math.sin(z*.14)*1.3),z);}groundGeo.computeVertexNormals();
 const groundMat=rock.clone();groundMat.map=diff.clone();groundMat.map.repeat.set(35,55);groundMat.color.set("#293726");add(groundGeo,groundMat);
 const slabs=new T.InstancedMesh(new T.BoxGeometry(1,.16,1),rock,450),dummy=new T.Object3D();let count=0;
 for(let i=0;i<90;i++){const z=14-i*1.02,y=groundY(z);for(let j=0;j<5;j++){dummy.position.set(pathX(z)+(j-2)*1.04+(random()-.5)*.06,y,z);dummy.rotation.set((random()-.5)*.025,(random()-.5)*.05,0);dummy.scale.set(.94+random()*.06,1,.92+random()*.07);dummy.updateMatrix();slabs.setMatrixAt(count++,dummy.matrix);}}slabs.receiveShadow=true;scene.add(slabs);
 for(let i=0;i<18;i++){const z=8-i*4.8;for(const side of [-1,1]){if(i%2===0)lantern(pathX(z)+side*3,groundY(z),z,.65);boulder(pathX(z)+side*(3.9+random()*1.4),groundY(z)-.1,z,.65+random(),.35+random()*.6,.7+random());}}
 // 層疊岩台錯開中間開口；瀑布由各平台邊緣落下。
 for(const side of [-1,1])for(let tier=0;tier<4;tier++){const z=-20-tier*17,y=2+tier*4,x=side*(13+tier*1.1);for(let j=0;j<9;j++){boulder(x+(j%3-1)*3.2,y-4+Math.floor(j/3)*1.4,z+(Math.floor(j/3)-1)*3,3+random()*2,5+random()*2,3+random()*2);}for(let j=0;j<7;j++){const o=add(sphere,moss,x+(random()-.5)*8,y+2.1,z+(random()-.5)*7);o.scale.set(2,.22,1.4);}lantern(x,y+3,z,1);}
 function branch(points,r1,r2){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments=22,radial=12,frames=curve.computeFrenetFrames(segments,false),verts=[],uv=[],idx=[];
  for(let i=0;i<=segments;i++){const p=curve.getPointAt(i/segments),r=T.MathUtils.lerp(r1,r2,i/segments);for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2,rr=r*(1+.08*Math.sin(j*3.7+i*.7)),v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr);verts.push(v.x,v.y,v.z);uv.push(j/radial,i/segments*5);if(i<segments&&j<radial){const k=i*(radial+1)+j;idx.push(k,k+1,k+radial+1,k+1,k+radial+2,k+radial+1);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const o=add(g,bark);o.castShadow=true;
 }
 const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.32,.26,0,.75);leafShape.quadraticCurveTo(-.32,.26,0,0);const leafGeo=new T.ShapeGeometry(leafShape,3);
 const leafMat=material('#38583b',{side:T.DoubleSide}),leaves=new T.InstancedMesh(leafGeo,leafMat,30000);let leafCount=0;
 function leafAt(x,y,z,s){if(leafCount>=30000)return;dummy.position.set(x,y,z);dummy.rotation.set(random()*3,random()*6,random()*6);dummy.scale.setScalar(s);dummy.updateMatrix();leaves.setMatrixAt(leafCount++,dummy.matrix);}
 for(const side of [-1,1])for(let i=0;i<7;i++){const z=9-i*15;scene.add(assets.tree(side*(14+i*.8),groundY(z)-.4,z,i<2?39+random()*5:23+random()*5,random()*6.28));}
 // 第二、三排錯開主樹，補足林冠與後景，中央視線仍保持開放。
 for(const side of [-1,1])for(let i=0;i<(constrained?6:10);i++){
  const z=6-i*11+(random()-.5)*4,x=side*(22+(i%2)*7+random()*3);
  const tree=assets.tree(x,groundY(z)-.7,z,26+random()*10,random()*Math.PI*2);
  tree.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  scene.add(tree);
 }
 for(let i=0;i<(constrained?60:110);i++){const z=12-random()*95;scene.add(assets.fern(i,pathX(z)+(i%2?1:-1)*(3.1+random()*5),groundY(z)-.1,z,1.3+random()*1.3,random()*6.28));}
 function arch(x,y,z,w,h,depth,mat=stone){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(-w/2,h-w/2);shape.absarc(0,h-w/2,w/2,Math.PI,0,true);shape.lineTo(w/2,0);shape.lineTo(w/2+.35,0);shape.lineTo(w/2+.35,h-w/2);shape.absarc(0,h-w/2,w/2+.35,0,Math.PI,false);shape.lineTo(-w/2-.35,0);shape.closePath();const o=add(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:16}),mat,x,y,z);return o;}
 function bridge(x1,x2,y,z){const width=x2-x1,mid=(x1+x2)/2;box(mid,y,z,width,.4,2.2);const spans=Math.max(1,Math.round(width/5));for(let i=0;i<spans;i++){const x=x1+width/spans*(i+.5);arch(x,y-4,z-.7,width/spans-.6,3.9,1.4);}
  for(const side of [-1,1]){box(mid,y+1,z+side*1.1,width,.13,.15,gold);for(let i=0;i<=width;i++)box(x1+i,y+.5,z+side*1.1,.09,1,.09,stone);}for(const x of [x1,x2])lantern(x,y+.1,z,1);
 }
 bridge(-23,-5,10,-34);bridge(5,24,13,-45);bridge(-24,-5,18,-62);bridge(4,24,22,-76);
 function tower(x,y,z,h,r,cut=0){const o=add(new T.CylinderGeometry(r*.85,r,h-cut,16),stone,x,y+(h+cut)/2,z);o.castShadow=true;
  for(let j=0;j<3;j++)if(h*(.2+j*.28)>cut)add(new T.CylinderGeometry(r*1.03,r*1.03,.18,16),gold,x,y+h*(.2+j*.28),z);
  add(new T.ConeGeometry(r*1.3,h*.37,16),roof,x,y+h+h*.185,z);add(new T.CylinderGeometry(.04,.06,1.6,8),gold,x,y+h*1.37+.5,z);
  for(let k=0;k<5;k++){const a=k/5*Math.PI*2;for(let j=0;j<3;j++){const wx=x+Math.sin(a)*r*.98,wz=z+Math.cos(a)*r*.98,wy=y+h*(.22+j*.24);if(wy<y+cut)continue;const window=box(wx,wy,wz,.23,.9,.07,lightMat);window.rotation.y=a;}}
 }
 // 中央主殿以尖拱、扶壁、屋頂與多層細塔建立輪廓。
 const castleStart=scene.children.length;for(let i=0;i<12;i++){const x=(i%4-1.5)*4;if(Math.abs(x)>3)boulder(x,4+Math.floor(i/4)*2,-96+(Math.floor(i/4)-1)*4,3,7,5);}
 // 分件外牆保留真正的入口；不以門貼片蓋在封閉方塊上。
 for(const side of [-1,1])box(side*4.4,23,-94,4.2,14,9);
 box(0,28.8,-94,4.6,2.4,9);box(0,31,-94,10,.45,10,gold);
 const gateFrame=stone.clone();gateFrame.color.set('#5b5144');gateFrame.roughness=.87;
 const entrance=arch(0,17,-89.3,3.2,8,1.2,gateFrame);
 // 開合門扇由遠征本部持有，外側拱框沿用既有城堡。
 for(const side of [-1,1])for(let i=0;i<4;i++){box(side*(2+i*1.3),24,-88.8,.32,12,.7);arch(side*(2.2+i*1.25),23,-88.3,.6,3.8,.25,gold);}
 for(let i=0;i<9;i++){const x=(i-4)*2.7,h=12+(4-Math.abs(i-4))*2.7;tower(x,21,-95+(i%2)*2,h,.75+(i===4?.5:0),10);}
 const ring=add(new T.TorusGeometry(3.2,.07,8,100),gold,0,39,-87);add(new T.TorusGeometry(2.7,.055,8,100),gold,0,39,-86.9).rotation.y=.8;glow(0,39,-87,5);
 const castleEnd=scene.children.length;for(const side of [-1,1])for(let i=0;i<5;i++)tower(side*(9+i*2.7),8+i*4,-35-i*13,5+i*.6,.55);
 const castleParts=scene.children.slice(castleStart,castleEnd),castle=new T.Group();for(const part of castleParts)castle.add(part);castle.scale.setScalar(1.4);castle.position.set(0,-8,34);scene.add(castle);
 // 最後一段階梯把低處石徑接到城門門檻，底座隨地形落地。
 for(let i=0;i<48;i++){const z=-68-i*.5,top=5.1+i*.225,base=groundY(z)-.25;box(0,(top+base)/2,z,4.5,Math.max(.2,top-base),.53,stone);if(i%12===0){lantern(-2.55,top,z,.7);lantern(2.55,top,z,.7);}}
 const water=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{phase:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float phase;void main(){float edge=smoothstep(0.,.08,v.x)*smoothstep(0.,.08,1.-v.x);float a=sin(v.x*320.+sin(v.x*73.)*6.+sin(v.y*9.+phase)*1.8)*.5+.5;float b=sin(v.x*91.+v.y*5.+sin(v.x*219.)*2.)*.5+.5;float flow=.8+.2*sin(v.y*90.+phase*16.);gl_FragColor=vec4(mix(vec3(.21,.48,.67),vec3(.74,.89,1.),a*b),edge*(.44+a*.23)*flow*smoothstep(0.,.035,v.y)*smoothstep(0.,.025,1.-v.y));}'});
 const sprayPoints=[];
 function cascade(x,top,z,width){
  const bottom=groundY(z)+.2,height=Math.max(2,top-bottom),ledge=bottom+height*.48;
  function ribbon(cx,from,to,cz,w){
   const g=new T.PlaneGeometry(1,1,12,36),pos=g.attributes.position;
   for(let i=0;i<pos.count;i++){
    const u=pos.getX(i)+.5,t=.5-pos.getY(i);
    const spread=w*(.52+.48*t+.1*Math.sin(t*13));
    pos.setXYZ(i,(u-.5)*spread+Math.sin(t*8)*w*.055,from-t*(from-to),t*t*.55+Math.sin(u*7+t*11)*.035);
   }
   g.computeVertexNormals();add(g,water,cx,0,cz);
  }
  ribbon(x,top,ledge,z,width*.8);
  const shelf=assets.rock(2,x,ledge-.5,z+.3,width*1.4,.6,1.3,.13);scene.add(shelf);
  ribbon(x-width*.2,ledge+.08,bottom,z+.85,width*.64);
  ribbon(x+width*.24,ledge+.06,bottom+.05,z+.9,width*.43);
  sprayPoints.push([x,ledge+.1,z+.8,width*2],[x,bottom+.1,z+1.5,width*2.8]);
 }
 for(const [x,y,z,w] of [[-11,7,-22,2.6],[13,9,-30,2],[-17,15,-43,3.4],[18,19,-57,3],[-8,22,-77,2.8],[8,25,-88,2.4]])cascade(x,y,z,w);
 const mistCanvas=document.createElement('canvas');mistCanvas.width=mistCanvas.height=128;const mc=mistCanvas.getContext('2d'),mg=mc.createRadialGradient(64,64,0,64,64,64);mg.addColorStop(0,'#c8e6ff70');mg.addColorStop(.5,'#9cc9ef25');mg.addColorStop(1,'#9cc9ef00');mc.fillStyle=mg;mc.fillRect(0,0,128,128);const mistMap=new T.CanvasTexture(mistCanvas);
for(let i=0;i<40;i++){const z=-10-random()*95,o=new T.Sprite(new T.SpriteMaterial({map:mistMap,transparent:true,opacity:.3,depthWrite:false}));o.position.set((random()-.5)*36,groundY(z)+random()*3,z);o.scale.set(9+random()*12,3+random()*4,1);scene.add(o);}
for(let i=0;i<(constrained?48:90);i++){const z=16-random()*100,x=(i%2?1:-1)*(5+random()*10);scene.add(assets.fern(i,x,groundY(z),z,1.5+random()*2,random()*6.28));}
const castleLight=new T.PointLight('#83bde6',270,70,1.4);castleLight.position.set(0,34,-66);scene.add(castleLight);
// 少量實際暖光照亮近景石面，讓燈籠與地面產生關係。
for(const z of [5,-14,-33]){const lampLight=new T.PointLight('#ffc17b',18,10,2);lampLight.position.set(pathX(z)+2.6,1.1+groundY(z),z);scene.add(lampLight);}
const particles=new T.BufferGeometry(),pts=[];for(let i=0;i<250;i++)pts.push((random()-.5)*45,random()*27,10-random()*100);particles.setAttribute('position',new T.Float32BufferAttribute(pts,3));scene.add(new T.Points(particles,new T.PointsMaterial({color:'#92d7ef',size:.055,transparent:true,opacity:.7})));
 const sky=new T.Mesh(new T.SphereGeometry(220,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){float h=normalize(v).y;float cloud=sin(v.x*.047+sin(v.z*.033))*sin(v.y*.072+v.z*.04);vec3 c=mix(vec3(.19,.32,.51),vec3(.018,.052,.12),smoothstep(-.1,.65,h));c+=vec3(.024,.038,.055)*cloud;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
 const moonDisk=add(new T.SphereGeometry(5,32,24),new T.MeshBasicMaterial({color:'#a5d1ec',fog:false}),8,53,-158);
 // 外圍岩壁填補平地邊緣，遠方岩台與橋塔形成向上延伸的城邦。
 for(const side of [-1,1]){
  boulder(side*19,3,4,8,6,10);
  for(let tier=0;tier<3;tier++){
   const z=-27-tier*25,y=12+tier*7,x=side*(27+tier*2);
   boulder(x,y,z,9,14+tier*3,11);
   tower(x,y+10,z,7+tier*2,.85);
   lantern(x-side*5,y+8,z+6,1.1);
   cascade(x-side*7,y+9,z+8,3.2);
  }
  bridge(side<0?-32:12,side<0?-12:32,25,-80);
 }
 // 水霧置於不同深度，近景保持清晰，遠景由藍霧拉開層次。
 for(const [x,y,z,sx,sy] of [[-12,7,-24,25,10],[14,10,-42,29,14],[0,15,-68,45,18],[0,25,-100,58,25]]){
  const mist=new T.Sprite(new T.SpriteMaterial({map:mistMap,color:'#7faeff',transparent:true,opacity:.72,depthWrite:false,fog:false}));mist.position.set(x,y,z);mist.scale.set(sx,sy,1);scene.add(mist);
 }
 for(const [x,y,z,size] of sprayPoints){const spray=new T.Sprite(new T.SpriteMaterial({map:mistMap,color:'#c1ddf3',transparent:true,opacity:.8,depthWrite:false}));spray.position.set(x,y,z);spray.scale.set(size,size*.36,1);scene.add(spray);}
 const outdoors=scene.children.filter(o=>!o.isLight&&o!==moon.target&&o!==sky);
 const reflectInterior=constrained?()=>{}:createInteriorReflections(renderer,scene);
 const filmMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false});
 const filmSurface=new T.Mesh(new T.PlaneGeometry(12,6.75),filmMaterial);filmSurface.position.set(14,19.3,-174);filmSurface.visible=false;scene.add(filmSurface);
 let hall=null,gallery=null,entryDoors=null,doorPivots=[],interiorPromise=null;
 // 第一個森林畫面先完成；室內桌櫃與城門在背景載入，避免轉場同時解析全部資產。
 function ensureInterior(){
  if(interiorPromise)return interiorPromise;
  host.dataset.interiorLoading='true';
  interiorPromise=(async()=>{
   const resolution=constrained?'1k':'2k';
   const hallProps=await loadHallAssets({resolution,onProgress:(value,label)=>report('interior',value*.82,label)});
   hall=createExpeditionHall(scene,{stone,gold,glowMap,props:hallProps});
   gallery=createAtlasGallery(scene,{stone,gold,glowMap,props:hallProps});
   report('interior',.9,'正在建立遠征本部');
   host.dataset.assetMetrics=JSON.stringify(hallProps.metrics);host.dataset.interiorReady='true';delete host.dataset.interiorLoading;
   try{
    const doorAsset=await new GLTFLoader().loadAsync(`./3d/hall-assets/large_castle_door/large_castle_door_${resolution}.gltf`);
    entryDoors=doorAsset.scene;entryDoors.scale.setScalar(4.2);entryDoors.position.set(14.185,15.6,-169);scene.add(entryDoors);
    doorPivots=['large_castle_door_left','large_castle_door_right'].map(name=>entryDoors.getObjectByName(name)).filter(Boolean);
    doorPivots.forEach(o=>o.rotation.set(0,0,0));
    entryDoors.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.color.set('#695444');for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(o.material[k])o.material[k].anisotropy=constrained?2:8;}});
    host.dataset.doorReady='true';
    report('interior',1,'遠征本部已就緒');
   }catch(error){host.dataset.doorFailed='true';console.warn('星圖館門扇暫時無法載入。',error);}
   return {hall,gallery,entryDoors};
  })().catch(error=>{delete host.dataset.interiorLoading;host.dataset.interiorFailed='true';console.warn('室內資產暫時無法載入。',error);return null;});
  return interiorPromise;
 }
 // 石牆包住原模型的拱頂；保留模型比例，不把古堡門拉成橫向平板。
 const surround=new T.Shape();surround.moveTo(-15,0);surround.lineTo(15,0);surround.lineTo(15,19);surround.lineTo(-15,19);surround.closePath();
 const opening=new T.Path();opening.moveTo(-3.9,0);opening.lineTo(-3.9,8.0);opening.absarc(0,8.0,3.9,Math.PI,0,true);opening.lineTo(3.9,0);opening.closePath();surround.holes.push(opening);
 const surroundMaterial=stone.clone();surroundMaterial.color.set('#394553');
 const masonry=new T.Mesh(new T.ExtrudeGeometry(surround,{depth:.55,bevelEnabled:false}),surroundMaterial);masonry.position.set(14,15.6,-169.15);scene.add(masonry);
 // 拱券逐塊砌築，接縫與前後退縮提供真正的輪廓層次。
 const dressedStone=surroundMaterial.clone();dressedStone.color.set('#47505b');dressedStone.roughness=.86;
 for(let i=0;i<15;i++){
  const a=i*Math.PI/15+.009,b=(i+1)*Math.PI/15-.009;
  const block=new T.Shape();block.moveTo(Math.cos(a)*3.91,8+Math.sin(a)*3.91);
  block.absarc(0,8,3.91,a,b,false);block.lineTo(Math.cos(b)*4.34,8+Math.sin(b)*4.34);
  block.absarc(0,8,4.34,b,a,true);block.closePath();
  const voussoir=new T.Mesh(new T.ExtrudeGeometry(block,{depth:.24,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2}),dressedStone);
  voussoir.position.z=.57;masonry.add(voussoir);
 }
 for(const side of [-1,1])for(let i=0;i<10;i++){
  const jamb=new T.Mesh(new T.BoxGeometry(.43,.77,.28),dressedStone);jamb.position.set(side*4.125,.4+i*.8,.69);masonry.add(jamb);
 }
 const entryWarm=new T.PointLight('#ffc18b',0,12,1.6);entryWarm.position.set(0,4.5,1.6);masonry.add(entryWarm);
 let galleryVideo=null, galleryFrameReady=false;
 let width=0,height=0;host.append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',onFailure);
 report('forest',1,'森林入口已建立');
 requestAnimationFrame(()=>setTimeout(ensureInterior,400));
 return {prepareInterior:ensureInterior,setGalleryVideo(video){galleryVideo=video;filmMaterial.map=new T.VideoTexture(video);filmMaterial.map.colorSpace=T.SRGBColorSpace;filmMaterial.needsUpdate=true;},render(p,actTwo=0,actThree=0,filmPose=null){
  if(actTwo>.02&&!hall)ensureInterior();
  const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);}
  camera.aspect=w/h;camera.fov=w/h<1?68:54;
  const t=smooth(0,1,p),z=12-t*37;
  camera.position.set(pathX(z)*.6+Math.sin(t*Math.PI)*.8,3.2+groundY(z),z);camera.lookAt(Math.sin(t*Math.PI)*-2,14+t*3,-85);
  const interiorProgress=hall?actTwo:Math.min(actTwo,.29);
  if(interiorProgress>0){
   const pose=hallCamera(interiorProgress);camera.position.fromArray(pose.position);
   if(w/h<1){
    // 窄畫面以較遠、較短的桌側弧線保留整張桌子，不裁切主體。
    const amount=smooth(.4,.49,interiorProgress)*(1-smooth(.88,.96,interiorProgress));
    const dx=(pose.position[0]-1.2)*.55,dz=pose.position[2]+112,len=Math.hypot(dx,dz)||1;
    camera.position.x=T.MathUtils.lerp(camera.position.x,1.2+dx/len*12,amount);
    camera.position.z=T.MathUtils.lerp(camera.position.z,-112+dz/len*12,amount);
   }
   camera.lookAt(...pose.look);
  }
  const indoors=smooth(.30,.43,interiorProgress);scene.fog.color.set('#39618b').lerp(new T.Color('#252e38'),indoors);scene.fog.density=.0095-indoors*.006;
  hemi.intensity=2.7-indoors*2.1;moon.intensity=3.7*(1-indoors);fill.intensity=.32*(1-indoors);castleLight.intensity=270*(1-indoors);
  outdoors.forEach(o=>{o.visible=interiorProgress<.43;});
  // 穿過外拱後，外殼退出繪製；室內獨立頂部接手，降低已離開視野的幾何負擔。
  castle.visible=interiorProgress<.43;

  const opened=hall?.update(interiorProgress)??0;
  if(gallery&&hall){gallery.group.visible=interiorProgress>.8;hall.group.visible=actThree<.36;if(actThree>0)gallery.render(actThree,camera,w/h<1);}
  camera.updateProjectionMatrix();water.uniforms.phase.value=(t+interiorProgress)*12;
  if(hall&&interiorProgress>.48&&actThree===0)reflectInterior('hall',hall.group,[1.2,19.8,-112]);
  if(gallery&&actThree>.2)reflectInterior('gallery',gallery.group,[6.3,20,-157]);
  // 製作取景可指定鏡位，主網站未傳入時沿用捲動運鏡。
  if(options.cameraPose){camera.position.fromArray(options.cameraPose.position);camera.lookAt(...options.cameraPose.look);camera.fov=options.cameraPose.fov??54;camera.updateProjectionMatrix();}
  // 以核定尾幀的同鏡位交接；保持影片與 3D 的 16:9 取景，再平順展回裝置尺寸。
  let viewport={x:0,y:0,w,h};
  if(filmPose){
   const weight=filmPose.weight??1,framing=filmPose.framing??weight;
   const originalPosition=camera.position.clone(),originalRotation=camera.quaternion.clone();
   camera.position.fromArray(filmPose.position);camera.lookAt(...filmPose.look);
   camera.position.lerpVectors(originalPosition,camera.position,weight);
   camera.quaternion.slerpQuaternions(originalRotation,camera.quaternion.clone(),weight);
   camera.fov=T.MathUtils.lerp(camera.fov,filmPose.fov,weight);
   const fitW=Math.min(w,h*16/9),fitH=fitW*9/16;
   viewport.w=T.MathUtils.lerp(w,fitW,framing);viewport.h=T.MathUtils.lerp(h,fitH,framing);
   viewport.x=(w-viewport.w)/2;viewport.y=(h-viewport.h)/2;
   camera.aspect=viewport.w/viewport.h;camera.updateProjectionMatrix();
  }

  if(galleryVideo?.readyState>=2)galleryFrameReady=true;
  filmSurface.visible=!!entryDoors&&!!filmPose?.portal&&galleryFrameReady;
  if(entryDoors)entryDoors.visible=actThree>0;masonry.visible=!!entryDoors&&actThree>0;
  entryWarm.intensity=12*smooth(.34,.61,actThree)*(1-smooth(.72,.85,actThree));
  const entryOpen=galleryFrameReady?(filmPose?.doorOpen??0):0;
  doorPivots.forEach((pivot,i)=>{pivot.rotation.y=(i===0?1:-1)*entryOpen*Math.PI/2;});
  if(filmSurface.visible){filmMaterial.map.needsUpdate=true;const distance=Math.abs(camera.position.z-filmSurface.position.z);const viewHeight=2*distance*Math.tan(T.MathUtils.degToRad(camera.fov)/2);const containScale=Math.min(viewHeight/6.75,viewHeight*camera.aspect/12);filmSurface.scale.setScalar(T.MathUtils.lerp(1,containScale,filmPose.portalProgress??0));}
  renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);renderer.clear();
  renderer.setViewport(viewport.x,viewport.y,viewport.w,viewport.h);
  renderer.setScissor(viewport.x,viewport.y,viewport.w,viewport.h);renderer.setScissorTest(true);
  renderer.render(scene,camera);renderer.setScissorTest(false);
  host.dataset.act=actThree>0?'three':actTwo>0?'two':'one';host.dataset.galleryProgress=actThree.toFixed(4);host.dataset.progress=actTwo.toFixed(4);host.dataset.door=opened.toFixed(3);host.dataset.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(',');
 },captureFrame(p,actTwo,actThree){this.render(p,actTwo,actThree);return renderer.domElement.toDataURL('image/png');},getStats(){return {...renderer.info.render,geometries:renderer.info.memory.geometries};}};
}
