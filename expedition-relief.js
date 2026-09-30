import * as T from './assets/vendor/three.module.min.js';
import {webAsset} from './web-assets.js';
import {createRegionEntrance} from './region-entrance.js?v=regions-1';
import {createHarborFacade} from './harbor-facade.js?v=polish-1';
import {batchStaticMeshes} from './static-batch.js';

// 獨立的小型地形場景；不修改前三幕的 renderer、相機或素材。
export function createRelief(host, labels) {
  const constrained=matchMedia('(max-width: 700px)').matches||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: !constrained, powerPreference: 'high-performance' });
  // 沙盤佔據大面積畫面；限制 DPR 可大幅降低每次捲動時的像素填充量。
  renderer.setPixelRatio(Math.min(devicePixelRatio, constrained?.85:1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.domElement.className = 'relief-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  host.prepend(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-15,15,10,-10,.1,100);
  camera.position.set(3,22,25); camera.lookAt(0,0,0);
  const island = new T.Group();scene.add(island);
  const mat = (color, metalness=0, roughness=.8) => new T.MeshStandardMaterial({color,metalness,roughness});
  const stone=mat(0x384b4c,.25), wall=mat(0x837151,.5), roof=mat(0x27434b,.12), gold=mat(0xcda25d,.7,.32), wood=mat(0x887052), cliff=mat(0x1d343a), grass=mat(0x263b34,.15), snow=mat(0x646e60,.2), water=mat(0x163d4b,.55,.3);
  const lamp = new T.MeshStandardMaterial({color:0xffd187,emissive:0xffaa44,emissiveIntensity:2});
  function mesh(geometry,material,parent=island,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,m,p,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);}
  function cylinder(r,h,m,p,x=0,y=0,z=0,n=12){return mesh(new T.CylinderGeometry(r,r,h,n),m,p,x,y,z);}
  function cone(r,h,m,p,x=0,y=0,z=0,n=6){return mesh(new T.ConeGeometry(r,h,n),m,p,x,y,z);}
  scene.add(new T.HemisphereLight(0xc4d9e6,0x3d5149,1.65));
  const sun = new T.DirectionalLight(0xffe3b7,3.6); sun.position.set(-9,17,8);sun.castShadow=true;sun.shadow.mapSize.set(constrained?512:1024,constrained?512:1024);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14});sun.shadow.normalBias=.05;sun.shadow.bias=-.0002;scene.add(sun);
  const rim=new T.DirectionalLight(0x9dcced,1.85);rim.position.set(10,8,-12);scene.add(rim);
  // 沿不規則海岸保留岩層厚度，移除矩形展盤與外圍金框。
  const coords=[[-10,-1],[-9,-5],[-6,-6],[-4,-7],[-1,-6.3],[2,-7],[4,-5.9],[7,-6],[8,-4],[9,-2],[8.5,0],[10,2],[8,3.5],[5.5,4],[6,5.5],[3,6.5],[0,6],[-2,7],[-5,6.3],[-7,5],[-7.5,3],[-9,2]];
  function land(scale,depth,y,material){const shape=new T.Shape();coords.forEach(([x,z],i)=>i?shape.lineTo(x*scale,-z*scale):shape.moveTo(x*scale,-z*scale));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.12});g.rotateX(-Math.PI/2);return mesh(g,material,island,0,y,0);}
  land(.94,.35,-1.02,cliff);land(1,1,-.75,cliff);land(1.007,.045,-.24,stone);land(.98,.16,.26,stone);land(.96,.12,.47,grass);
  // 山稜採不同高度、角度與明暗面，避免只有平面符號。
  let seed=51;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // 連續地形網格：山腳相連，峰面有稜線與侵蝕起伏。
  const ridgeGeo=new T.PlaneGeometry(13.8,4.2,100,32);ridgeGeo.rotateX(-Math.PI/2);
  const ridgePos=ridgeGeo.attributes.position, ridgeColors=[];
  function coastInset(x,z){
    let inside=false,distance=Infinity;
    for(let i=0,j=coords.length-1;i<coords.length;j=i++){
      const ax=coords[j][0]*.96,az=coords[j][1]*.96,bx=coords[i][0]*.96,bz=coords[i][1]*.96;
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
      distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
    }
    return inside?Math.min(1,distance/.65):0;
  }
  for(let i=0;i<ridgePos.count;i++){
    const x=ridgePos.getX(i),z=ridgePos.getZ(i);
    const edge=Math.pow(Math.max(0,Math.sin((z+2.1)/4.2*Math.PI)),1.5)*Math.pow(Math.max(0,Math.sin((x+6.9)/13.8*Math.PI)),.7);
    const peaks=1.15+.65*Math.sin(x*1.18)+.5*Math.sin(x*2.4+.4);
    const erosion=.17*Math.sin(x*8+z*5)+.12*Math.sin(x*3-z*9);
    // 山腳下沉於島面，避免矩形網格在海岸之外露出。
    const h=edge*(peaks+erosion);ridgePos.setY(i,-1.4+(h+1.4)*coastInset(x,z-4.6));
    const c=new T.Color().lerpColors(new T.Color(0x364e49),new T.Color(0x899f9d),Math.min(1,h/2.7));ridgeColors.push(c.r,c.g,c.b);
  }
  ridgeGeo.setAttribute('color',new T.Float32BufferAttribute(ridgeColors,3));ridgeGeo.computeVertexNormals();
  const ridgeMaterial=new T.MeshStandardMaterial({vertexColors:true,color:0xa4b9b3,roughness:.92,metalness:.08});mesh(ridgeGeo,ridgeMaterial,island,0,.5,-4.6);
  const sites=[[-6,0], [6,2.8], [5,-3.7], [-3.4,4.6]];
  // 細小地勢與苔色變化，避免中央呈現一整塊平滑的板材。
  const earth=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0});
  const ground=new T.PlaneGeometry(20,14,72,48);ground.rotateX(-Math.PI/2);
  const gp=ground.attributes.position,tones=[],inside=[];
  for(let i=0;i<gp.count;i++){
    const x=gp.getX(i),z=gp.getZ(i),edge=coastInset(x,z);
    const clear=Math.min(1,Math.max(0,Math.min(...sites.map(([sx,sz])=>Math.hypot(x-sx,z-sz)))-1.65));
    const grain=(Math.sin(x*2.3+z*.9)+Math.cos(z*3.4-x*.7)+2)/4;
    gp.setY(i,.735+edge*clear*(.02+.065*grain));inside.push(edge>0);
    const c=new T.Color().lerpColors(new T.Color(0x253d34),new T.Color(0x4b6247),grain*.8);
    tones.push(c.r,c.g,c.b);
  }
  const indices=[];for(let i=0;i<ground.index.count;i+=3){const a=ground.index.getX(i),b=ground.index.getX(i+1),c=ground.index.getX(i+2);if(inside[a]&&inside[b]&&inside[c])indices.push(a,b,c);}
  ground.setIndex(indices);ground.setAttribute('color',new T.Float32BufferAttribute(tones,3));ground.computeVertexNormals();mesh(ground,earth);
  const groups=sites.map(([x,z])=>{const g=new T.Group();g.position.set(x,.68,z);island.add(g);cylinder(1.55,.14,stone,g,0,0,0,32);return g;});
  const castle=groups[0],guildEntrance=createRegionEntrance(0,{stone:wall,wood,metal:gold,roof,glow:lamp});guildEntrance.scale.setScalar(.27);castle.add(guildEntrance);
  box(2.8,1.4,2.5,wall,castle,0,.7,-1.15);box(2.95,.14,2.65,roof,castle,0,1.47,-1.15);
  const harbor=groups[1];
  const facade=createHarborFacade({stone,wood,brass:gold,roof,glow:lamp,depth:8});facade.scale.setScalar(.18);facade.position.set(0,.1,.3);harbor.add(facade);
  box(2.16,1.04,1.8,stone,harbor,0,.62,-.65);box(2.3,.1,1.9,roof,harbor,0,1.16,-.65);
  // 開放門洞內的暖光與近景入口一致，不再把中央窗戶當成進門位置。
  box(.82,.8,.025,roof,harbor,0,.49,.285);
  for(let i=0;i<8;i++)box(2.9,.08,.13,wood,harbor,0,.05,.6+i*.17);
  const ship=new T.Group();harbor.add(ship);ship.position.set(1.6,-.65,1.4);const hull=mesh(new T.SphereGeometry(.65,12,6),wood,ship);hull.scale.set(.5,.35,1.5);cylinder(.035,2,gold,ship,0,.8,0);const sail=mesh(new T.PlaneGeometry(.85,1.15),wall,ship,.4,1,0);sail.material=wall.clone();sail.material.side=T.DoubleSide;sail.rotation.y=-.35;
  const library=groups[2],archiveEntrance=createRegionEntrance(2,{stone:wall,wood,metal:gold,roof,glow:lamp});archiveEntrance.scale.setScalar(.24);library.add(archiveEntrance);
  box(2.7,1.4,2.2,wall,library,0,.7,-1.15);box(2.8,.1,2.3,roof,library,0,1.45,-1.15);
  const camp=groups[3],campCloth=wall.clone();campCloth.color.set('#8e7754');campCloth.side=T.DoubleSide;
  const campEntrance=createRegionEntrance(3,{stone:wall,wood,metal:gold,roof,glow:lamp,cloth:campCloth});campEntrance.scale.setScalar(.24);campEntrance.position.set(-.35,0,0);camp.add(campEntrance);
  const fire=cone(.25,.66,lamp,camp,.95,.5,.5,7);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(new T.DodecahedronGeometry(.12),stone,camp,.95+Math.cos(a)*.34,.12,.5+Math.sin(a)*.34);}const log=box(.7,.14,.14,wood,camp,.95,.15,.5);log.rotation.y=.6;
  // 石砌基座、拱窗、屋頂稜線與碼頭結構，讓四區有各自的工藝細節。
  function line(points,r,material,parent=island){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,20,r,6,false),material,parent);}
  function archWindow(parent,x,y,z,w=.2,h=.38){
    box(w,h,.028,roof,parent,x,y,z);
    line([[x-w/2,y-h/2,z+.02],[x-w/2,y+h*.18,z+.02],[x,y+h*.65,z+.02],[x+w/2,y+h*.18,z+.02],[x+w/2,y-h/2,z+.02]],.018,gold,parent);
    box(.025,h,.035,gold,parent,x,y,z+.04);box(w,.025,.035,gold,parent,x,y-.03,z+.04);
  }
  // 屋脊、分片金屬瓦與簷口有真實厚度，沿用既有入口輪廓。
  const patina=mat(0x6d8584,.35,.65);
  function pitchedRoof(parent,width,depth,y,z){
    const slope=.38,half=width/2;
    for(const side of [-1,1]){
      const panel=box(half+.12,.07,depth,roof,parent,side*half/2,y,z);panel.rotation.z=-side*slope;
      for(let row=0;row<8;row++){const seam=box(half+.14,.025,.025,patina,parent,side*half/2,y+.04,z-depth/2+row*depth/7);seam.rotation.z=-side*slope;}
      box(.045,.08,depth,patina,parent,side*half,y-Math.sin(slope)*half/2,z);
    }
    box(.065,.08,depth+.12,patina,parent,0,y+Math.sin(slope)*half/2,z);
  }
  pitchedRoof(castle,3.15,2.85,1.86,-1.12);pitchedRoof(library,2.95,2.7,1.8,-1.08);
  for(const x of [-.78,0,.78])archWindow(castle,x,.8,-2.41,.25,.5);
  for(const side of [-1,1])for(let z=-1.8;z<-.1;z+=.5){box(.04,.36,.18,lamp,castle,side*1.42,.88,z);}
  for(const x of [-.95,.9]){cylinder(.16,.32,wood,harbor,x,.25,1.25,10);cylinder(.164,.025,patina,harbor,x,.17,1.25,10);cylinder(.164,.025,patina,harbor,x,.35,1.25,10);}
  for(let i=0;i<3;i++)cylinder(.055,.9,wood,harbor,-.9+i*.8,-.25,1.7);
  for(const z of [.75,1.45])for(let i=0;i<6;i++){cylinder(.025,.35,gold,harbor,-1.3+i*.52,.25,z);}line([[-1.3,.43,1.45],[0,.43,1.45],[1.3,.43,1.45]],.023,wood,harbor);
  line([[0,.4,-.7],[0,1.8,0],[0,.4,.8]],.015,gold,ship);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;mesh(new T.DodecahedronGeometry(.18,1),cliff,camp,Math.cos(a)*1.2,.15,Math.sin(a)*1.2);}
  // 港灣水面依碼頭輪廓保留，讓船隻有落點而不再形成矩形底板。
  const cove=mesh(new T.CircleGeometry(2.15,48),water,island,6.3,-.42,4.3);
  cove.rotation.x=-Math.PI/2;cove.scale.set(1.15,.68,1);cove.castShadow=false;
  const waveData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=(y*128+x)*4,v=125+Math.sin(y*.45+Math.sin(x*.16)*2)*20+rand()*12;waveData[p]=waveData[p+1]=waveData[p+2]=v;waveData[p+3]=255;}
  const waves=new T.DataTexture(waveData,128,128);waves.wrapS=waves.wrapT=T.RepeatWrapping;waves.repeat.set(4,4);waves.needsUpdate=true;water.bumpMap=waves;water.bumpScale=.065;water.roughness=.42;
  // 林地避開四個入口與中央路徑。
  // 森林以四個 InstancedMesh 批次繪製，保留密度但把數百次 draw call 壓成四次。
  const trees=[];
  for(let i=0;i<(constrained?90:170);i++){const x=-8+rand()*16,z=-3+rand()*8.5;if(sites.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<2)||Math.abs(x)<1||z>5.6)continue;trees.push({x,z,h:.4+rand()*.6,spin:i*.37});}
  const dummy=new T.Object3D(),trunks=new T.InstancedMesh(new T.CylinderGeometry(.032,.032,1,6),wood,trees.length),crownGeometry=new T.ConeGeometry(1,1,8),crowns=[0,1,2].map(()=>new T.InstancedMesh(crownGeometry,mat(0x33554d,0,.92),trees.length));
  trees.forEach(({x,z,h,spin},index)=>{
    dummy.position.set(x,.67+h*.25,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h*.65,1);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
    crowns.forEach((batch,tier)=>{const radius=.25*(1-tier*.23);dummy.position.set(x,.67+h*(.35+tier*.21),z);dummy.rotation.set(0,spin+tier*.7,0);dummy.scale.set(radius,h*.58,radius);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);batch.setColorAt(index,new T.Color().setHSL(.43+Math.sin(index)*.025,.23,.27+(index%5)*.04));});
  });
  [trunks,...crowns].forEach(batch=>{batch.castShadow=!constrained;batch.receiveShadow=true;batch.instanceMatrix.setUsage(T.StaticDrawUsage);batch.instanceMatrix.needsUpdate=true;island.add(batch);});
  // 岸邊碎岩以單次繪製增加不規則輪廓，不複製高面數模型。
  const rockCount=coords.length*3,rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),stone,rockCount);
  for(let i=0;i<rockCount;i++){
    const a=coords[Math.floor(i/3)],b=coords[(Math.floor(i/3)+1)%coords.length],t=(i%3)/3;
    dummy.position.set((a[0]+(b[0]-a[0])*t)*.97,.28,(a[1]+(b[1]-a[1])*t)*.97);
    dummy.rotation.set(i*.7,i*.4,i*.2);dummy.scale.set(.17+(i%3)*.06,.24,.21+(i%4)*.035);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;island.add(rocks);
  const routes=[],routeCurves=[];
  for(let i=0;i<3;i++){
    const a=sites[i],b=sites[i+1];
    const path=new T.CatmullRomCurve3([new T.Vector3(a[0],.86,a[1]),new T.Vector3((a[0]+b[0])*.5,.86,(a[1]+b[1])*.5+1),new T.Vector3(b[0],.86,b[1])]);
    const m=new T.MeshStandardMaterial({color:0x766848,emissive:0xdca65b,emissiveIntensity:.03});
    mesh(new T.TubeGeometry(path,40,.018,5,false),m);routes.push(m);routeCurves.push(path);
  }
  // 投影到同一相機的引路光，使用合成動畫，避免為光點持續重繪整座 3D 沙盤。
  const flow=document.createElement('div');flow.className='route-flow';flow.setAttribute('aria-hidden','true');
  flow.innerHTML='<svg xmlns="http://www.w3.org/2000/svg"><path class="route-halo"/><path class="route-current"/><path class="route-dashes"/><path class="route-tip"/></svg><span class="route-traveller"></span>';
  host.append(flow);
  const flowSvg=flow.querySelector('svg'),flowPaths=[...flow.querySelectorAll('path')],traveller=flow.querySelector('span');
  let flowVisible=false;
  const flowVisibility=new IntersectionObserver(entries=>{flowVisible=entries.some(e=>e.isIntersecting);syncFlow();});flowVisibility.observe(host);
  function syncFlow(){
    const mode=host.closest('.expedition-map')?.dataset.mode;
    flow.classList.toggle('is-paused',!flowVisible||document.hidden||mode!=='exploring');
    flow.classList.toggle('is-still',reduceMotion());
  }
  const flowMode=new MutationObserver(syncFlow);flowMode.observe(host.closest('.expedition-map'),{attributes:true,attributeFilter:['data-mode']});
  const flowPreference=new MutationObserver(syncFlow);flowPreference.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');motionQuery.addEventListener('change',syncFlow);
  document.addEventListener('visibilitychange',syncFlow);
  function projectFlow(){
    flow.hidden=active>=3||unavailable;
    if(flow.hidden)return;
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    flowSvg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    // 路線起訖留在地標外圍，光點不會穿過建築中心與文字標籤。
    const projected=[];
    for(let i=0;i<=40;i++){const p=routeCurves[active].getPoint(.16+i/40*.68).project(camera);projected.push([(p.x+1)*w/2,(1-p.y)*h/2]);}
    const d=projected.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    for(let i=0;i<3;i++)flowPaths[i].setAttribute('d',d);
    traveller.style.offsetPath=`path("${d}")`;
    const [x,y]=projected[40],[px,py]=projected[38],angle=Math.atan2(y-py,x-px),len=10;
    flowPaths[3].setAttribute('d',`M${x-len*Math.cos(angle-.55)},${y-len*Math.sin(angle-.55)} L${x},${y} L${x-len*Math.cos(angle+.55)},${y-len*Math.sin(angle+.55)}`);
    syncFlow();
  }
  const beacons=sites.map(([x,z])=>{const ring=mesh(new T.TorusGeometry(1.7,.032,8,64),lamp,island,x,.8,z);ring.rotation.x=-Math.PI/2;const light=new T.PointLight(0xffbd60,0,6,2);light.position.set(x,3,z);island.add(light);return {ring,light};});
  // 地標揭幕與相機各自管理，捲動不會中斷點擊後的靠近動作。
  groups.forEach(batchStaticMeshes);
  const revealGroups=groups.map(g=>{const wrap=new T.Group();wrap.position.copy(g.position);island.add(wrap);wrap.add(g);g.position.set(0,0,0);return wrap;});
  let active=0,hovered=-1,frame=0,settle,unavailable=false,arrival=-1;
  const look=new T.Vector3(0,0,0);
  const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduced');
  function illuminate(){beacons.forEach(({ring,light},i)=>{ring.visible=i===active||i===hovered;light.intensity=i===active?12:i===hovered?8:0;});}
  function cancelMotion(){cancelAnimationFrame(frame);settle?.();settle=null;}
  // 手動視角與劇情特寫分開保存；離開筆記時回到原先的觀看角度。
  let controlsEnabled=true, overview=null, renderQueued=0;
  const homePosition=new T.Vector3(3,22,25);
  const homePolar=new T.Spherical().setFromVector3(homePosition);
  function captureView(){return {position:camera.position.clone(),look:look.clone(),zoom:camera.zoom};}
  function moveCamera(index,close=false){
    cancelMotion();
    if(unavailable)return Promise.resolve();
    const start=performance.now(),from=captureView();
    const [sx,sz]=sites[index];
    const target=close&&index===1?{
      look:new T.Vector3(sx,1.4,sz),position:new T.Vector3(sx+3.8,6.2,sz+12),zoom:Math.min(4.3,3.1*host.clientWidth/host.clientHeight)
    }:close?{
      look:new T.Vector3(sx*.78,.6,sz*.78),
      position:new T.Vector3(sx*.78+3,22,sz*.78+25),zoom:1.48
    }:(overview||{position:homePosition,look:new T.Vector3(),zoom:1});
    return new Promise(resolve=>{
      settle=resolve;
      const animate=now=>{
        const p=reduceMotion()?1:Math.min(1,(now-start)/820),ease=p*p*p*(p*(p*6-15)+10);
        camera.position.lerpVectors(from.position,target.position,ease);look.lerpVectors(from.look,target.look,ease);
        camera.zoom=from.zoom+(target.zoom-from.zoom)*ease;camera.lookAt(look);camera.updateProjectionMatrix();render();
        if(p<1)frame=requestAnimationFrame(animate);else{settle=null;resolve();}
      };
      frame=requestAnimationFrame(animate);
    });
  }
  function requestRender(){if(!renderQueued)renderQueued=requestAnimationFrame(()=>{renderQueued=0;render();});}
  function orbit(dx=0,dy=0,zoom=0){
    if(!controlsEnabled||unavailable)return;
    cancelMotion();
    const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(look));
    spherical.theta=T.MathUtils.clamp(spherical.theta+dx,homePolar.theta-.42,homePolar.theta+.42);
    spherical.phi=T.MathUtils.clamp(spherical.phi+dy,homePolar.phi-.14,homePolar.phi+.12);
    camera.position.copy(look).add(new T.Vector3().setFromSpherical(spherical));
    camera.zoom=T.MathUtils.clamp(camera.zoom+zoom,.88,1.18);
    camera.lookAt(look);camera.updateProjectionMatrix();requestRender();
  }
  // 桌機拖曳；觸控使用明確的旋轉按鈕，保留單指垂直捲頁。
  const canvas=renderer.domElement;
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{
    if(!controlsEnabled||e.pointerType==='touch'||e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    orbit((drag.x-e.clientX)*.003,(drag.y-e.clientY)*.002);
    drag.x=e.clientX;drag.y=e.clientY;
  });
  function stopDrag(){drag=null;canvas.classList.remove('is-dragging');}
  canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
  function render(){if(unavailable)return;const started=performance.now();renderer.render(scene,camera);host.dataset.renderMs=(performance.now()-started).toFixed(1);host.dataset.calls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.renders=String(Number(host.dataset.renders||0)+1);projectFlow();const w=host.clientWidth,h=host.clientHeight;labels.forEach((label,i)=>{const [x,z]=sites[i];const point=new T.Vector3(x,.75,z+1.9).project(camera);label.style.left=((point.x+1)*50)+'%';label.style.top=((-point.y+1)*50)+'%';});}
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const halfWidth=Math.max(12.4,aspect*7.5);camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth/aspect;camera.bottom=-halfWidth/aspect;camera.updateProjectionMatrix();render();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();host.classList.add('has-relief');
  const textures=new Set([waves]);
  wall.color.set(0xe0d6bf);wall.metalness=.06;stone.color.set(0xafbfb7);stone.metalness=.04;cliff.color.set(0x78959d);grass.color.set(0x90a38c);grass.metalness=0;
  const loader=new T.TextureLoader(),textureLoads=new Map();
  function texture(material,key,path,repeat,color=false){
    const id=JSON.stringify([path,repeat,color]);
    if(!textureLoads.has(id))textureLoads.set(id,new Promise(resolve=>loader.load(webAsset(path),t=>{
      if(unavailable){t.dispose();resolve(null);return;}
      t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);if(color)t.colorSpace=T.SRGBColorSpace;textures.add(t);resolve(t);
    },undefined,()=>resolve(null))));
    textureLoads.get(id).then(t=>{if(!t||unavailable)return;material[key]=t;material.needsUpdate=true;requestRender();});
  }
  const asset='./3d/interior-candidates/';
  for(const material of [wall,stone,cliff]){
    texture(material,'map',asset+'rustic_stone_wall_02/rustic_stone_wall_02_diff_1k.jpg',[1,1],true);
    texture(material,'normalMap',asset+'rustic_stone_wall_02/rustic_stone_wall_02_nor_gl_1k.jpg',[1,1]);
    material.normalScale=new T.Vector2(.25,.25);
  }
  texture(grass,'map',asset+'stone_floor/stone_floor_diff_1k.jpg',[5,4],true);
  texture(grass,'normalMap',asset+'stone_floor/stone_floor_nor_gl_1k.jpg',[5,4]);grass.normalScale=new T.Vector2(.35,.35);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();unavailable=true;flow.hidden=true;cancelMotion();host.classList.remove('has-relief');labels.forEach(l=>{l.style.removeProperty('left');l.style.removeProperty('top');});});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;unavailable=true;cancelMotion();observer.disconnect();flowVisibility.disconnect();flowMode.disconnect();flowPreference.disconnect();motionQuery.removeEventListener('change',syncFlow);document.removeEventListener('visibilitychange',syncFlow);flow.remove();textures.forEach(t=>t.dispose());renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});});
  return {
    select(index){active=Math.max(0,Math.min(3,index));illuminate();routes.forEach((m,i)=>{m.emissiveIntensity=i===active?.65:i<active?.18:.02;m.color.set(i===active?0xc6a369:i<active?0x83714e:0x4c503e);});render();},
    preview(index){hovered=index;illuminate();render();},
    focus(index){if(!overview)overview=captureView();controlsEnabled=false;stopDrag();active=index;hovered=-1;illuminate();return moveCamera(active,true);},
    async restore(){await moveCamera(active);overview=null;controlsEnabled=true;},
    orbit,
    async reset(){if(!controlsEnabled)return;controlsEnabled=false;overview=null;await moveCamera(active);controlsEnabled=true;},
    arrive(progress){
      const next=reduceMotion()?1:Math.max(arrival,Math.min(1,progress));
      // 揭幕只需約 25 個視覺階段，避免高頻觸控捲動觸發每一幀完整 WebGL 重繪。
      if(next===arrival||(next<1&&arrival>=0&&next-arrival<.04))return;arrival=next;
      renderer.shadowMap.needsUpdate=true;
      revealGroups.forEach((g,i)=>{const p=Math.max(0,Math.min(1,(next-.12-i*.12)/.4));g.scale.y=.02+.98*p*p*(3-2*p);});
      render();
    }
  };
}
