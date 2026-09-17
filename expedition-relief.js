import * as T from './assets/vendor/three.module.min.js';

// 獨立的小型地形場景；不修改前三幕的 renderer、相機或素材。
export function createRelief(host, labels) {
  const constrained=matchMedia('(max-width: 700px)').matches||(navigator.deviceMemory&&navigator.deviceMemory<=4);
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: !constrained, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, constrained?1:1.25));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'relief-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  host.prepend(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-15,15,10,-10,.1,100);
  camera.position.set(3,22,25); camera.lookAt(0,0,0);
  const island = new T.Group();scene.add(island);
  const mat = (color, metalness=0, roughness=.8) => new T.MeshStandardMaterial({color,metalness,roughness});
  const stone=mat(0x384b4c,.25), wall=mat(0x837151,.5), roof=mat(0x1b353c,.5), gold=mat(0xcda25d,.7,.32), wood=mat(0x604c37), cliff=mat(0x1d343a), grass=mat(0x263b34,.15), snow=mat(0x646e60,.2), water=mat(0x163d4b,.55,.3);
  const lamp = new T.MeshStandardMaterial({color:0xffd187,emissive:0xffaa44,emissiveIntensity:2});
  function mesh(geometry,material,parent=island,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,m,p,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);}
  function cylinder(r,h,m,p,x=0,y=0,z=0,n=12){return mesh(new T.CylinderGeometry(r,r,h,n),m,p,x,y,z);}
  function cone(r,h,m,p,x=0,y=0,z=0,n=6){return mesh(new T.ConeGeometry(r,h,n),m,p,x,y,z);}
  scene.add(new T.HemisphereLight(0xb9d6e1,0x273426,1.3));
  const sun = new T.DirectionalLight(0xffd69a,3.3); sun.position.set(-9,17,8);sun.castShadow=true;sun.shadow.mapSize.set(constrained?512:1024,constrained?512:1024);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14});sun.shadow.normalBias=.05;sun.shadow.bias=-.0002;scene.add(sun);
  const rim=new T.DirectionalLight(0x7eafdb,1.5);rim.position.set(10,8,-12);scene.add(rim);
  // 石質底座、金屬包邊與有厚度的海岸。
  // 圓角展盤與抬高的連續收邊，讓後緣呈現實體厚度。
  function trayShape(w,d,r){
    const s=new T.Shape(),x=-w/2,z=-d/2;
    s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);
    s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
    s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);
    s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
  }
  function tray(w,d,r,depth,y,material){
    const g=new T.ExtrudeGeometry(trayShape(w,d,r),{depth,bevelEnabled:true,bevelSize:.07,bevelThickness:.05,bevelSegments:3,curveSegments:12});
    g.rotateX(-Math.PI/2);return mesh(g,material,island,0,y,0);
  }
  tray(24,17,.8,.5,-1.5,cliff);
  tray(24,17,.8,.1,-1,gold);
  tray(23.68,16.68,.7,.08,-.89,water);
  const rimShape=trayShape(24,17,.8);
  rimShape.holes.push(trayShape(23.64,16.64,.65));
  const rimGeo=new T.ExtrudeGeometry(rimShape,{depth:.15,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,curveSegments:12});
  rimGeo.rotateX(-Math.PI/2);mesh(rimGeo,gold,island,0,-.83,0);
  const coords=[[-10,-1],[-9,-5],[-6,-6],[-4,-7],[-1,-6.3],[2,-7],[4,-5.9],[7,-6],[8,-4],[9,-2],[8.5,0],[10,2],[8,3.5],[5.5,4],[6,5.5],[3,6.5],[0,6],[-2,7],[-5,6.3],[-7,5],[-7.5,3],[-9,2]];
  function land(scale,depth,y,material){const shape=new T.Shape();coords.forEach(([x,z],i)=>i?shape.lineTo(x*scale,-z*scale):shape.moveTo(x*scale,-z*scale));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.12});g.rotateX(-Math.PI/2);return mesh(g,material,island,0,y,0);}
  land(1,1,-.75,cliff);land(.98,.16,.26,stone);land(.96,.12,.47,grass);
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
    const c=new T.Color().lerpColors(new T.Color(0x283c37),new T.Color(0x77817a),Math.min(1,h/2.7));ridgeColors.push(c.r,c.g,c.b);
  }
  ridgeGeo.setAttribute('color',new T.Float32BufferAttribute(ridgeColors,3));ridgeGeo.computeVertexNormals();
  const ridgeMaterial=new T.MeshStandardMaterial({vertexColors:true,color:0x819394,roughness:.92,metalness:.08});mesh(ridgeGeo,ridgeMaterial,island,0,.5,-4.6);
  const sites=[[-6,0], [6,2.8], [5,-3.7], [-3.4,4.6]];
  const groups=sites.map(([x,z])=>{const g=new T.Group();g.position.set(x,.68,z);island.add(g);cylinder(1.55,.14,stone,g,0,0,0,32);return g;});
  function tower(p,x,z,h){cylinder(.4,h,wall,p,x,h/2,z);cylinder(.46,.13,gold,p,x,h-.1,z);cone(.65,.9,roof,p,x,h+.37,z,8);box(.11,.3,.04,lamp,p,x,h*.65,z+.405);cylinder(.025,.6,gold,p,x,h+1,z);box(.38,.17,.02,gold,p,x+.18,h+1.15,z);}
  const castle=groups[0];box(1.75,1.5,1.2,wall,castle,0,.75,0);box(1.86,.12,1.3,gold,castle,0,1.51,0);for(const x of [-.9,.9])for(const z of [-.6,.6])tower(castle,x,z,2.15);tower(castle,0,-.2,2.8);box(.4,.85,.04,roof,castle,0,.5,.63);for(let i=0;i<4;i++)box(.7+i*.15,.13, .28,stone,castle,0,.3-i*.08,.85+i*.22);
  const harbor=groups[1];for(let i=0;i<3;i++){const x=-.9+i*.8;box(.65,.8,.85,wall,harbor,x,.42,-.2);const r=cone(.64,.5,roof,harbor,x,1.06,-.2,4);r.rotation.y=Math.PI/4;box(.15,.23,.03,lamp,harbor,x,.5,.245);}
  for(let i=0;i<8;i++)box(2.9,.08,.13,wood,harbor,0,.05,.6+i*.17);
  const ship=new T.Group();harbor.add(ship);ship.position.set(1.6,-.65,1.4);const hull=mesh(new T.SphereGeometry(.65,12,6),wood,ship);hull.scale.set(.5,.35,1.5);cylinder(.035,2,gold,ship,0,.8,0);const sail=mesh(new T.PlaneGeometry(.85,1.15),wall,ship,.4,1,0);sail.material=wall.clone();sail.material.side=T.DoubleSide;sail.rotation.y=-.35;
  const library=groups[2];box(2.3,.18,1.6,stone,library,0,.12,0);box(2,.13,1.4,gold,library,0,.28,0);box(1.8,1.2,.8,wall,library,0,.9,-.3);for(let i=0;i<5;i++){cylinder(.1,1.25,wall,library,-.85+i*.42,.96,.5);cylinder(.15,.13,gold,library,-.85+i*.42,1.54,.5);}box(2.15,.15,1.4,gold,library,0,1.66,0);const pediment=cone(1.53,.64,roof,library,0,2,0,4);pediment.scale.z=.65;pediment.rotation.y=Math.PI/4;for(let i=0;i<3;i++)box(2.1+i*.15,.1,.25,stone,library,0,.22-i*.07,.85+i*.2);
  const camp=groups[3];const tent=cone(1.1,1.4,wall,camp,-.3,.78,0,4);tent.rotation.y=Math.PI/4;box(.34,.52,.06,wood,camp,-.3,.3,.77);const fire=cone(.25,.66,lamp,camp,.95,.5,.5,7);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(new T.DodecahedronGeometry(.12),stone,camp,.95+Math.cos(a)*.34,.12,.5+Math.sin(a)*.34);}const log=box(.7,.14,.14,wood,camp,.95,.15,.5);log.rotation.y=.6;
  // 石砌基座、拱窗、屋頂稜線與碼頭結構，讓四區有各自的工藝細節。
  function line(points,r,material,parent=island){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,20,r,6,false),material,parent);}
  function archWindow(parent,x,y,z,w=.2,h=.38){
    box(w,h,.028,roof,parent,x,y,z);
    line([[x-w/2,y-h/2,z+.02],[x-w/2,y+h*.18,z+.02],[x,y+h*.65,z+.02],[x+w/2,y+h*.18,z+.02],[x+w/2,y-h/2,z+.02]],.018,gold,parent);
    box(.025,h,.035,gold,parent,x,y,z+.04);box(w,.025,.035,gold,parent,x,y-.03,z+.04);
  }
  for(const x of [-.9,.9])for(const z of [-.6,.6]){
    for(let k=1;k<6;k++){const band=mesh(new T.TorusGeometry(.405,.018,4,24),stone,castle,x,k*.3,z);band.rotation.x=Math.PI/2;}
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;line([[x+Math.cos(a)*.62,2.19,z+Math.sin(a)*.62],[x,2.96,z]],.012,gold,castle);}
    for(const a of [0,Math.PI/2,Math.PI]){const pane=new T.Group();pane.position.set(x,1.2,z);pane.rotation.y=a;castle.add(pane);archWindow(pane,0,0,.413,.16,.38);}
  }
  for(const x of [-.6,.6])archWindow(castle,x,.92,.625,.22,.45);
  for(let k=0;k<10;k++){const x=-1.05+k*.23;box(.11,.17,.15,stone,castle,x,1.63,.64);}
  for(let i=0;i<3;i++){const x=-.9+i*.8;archWindow(harbor,x,.49,.248,.2,.31);for(let t=0;t<4;t++)box(.65,.016,.86,roof,harbor,x,.66+t*.08,-.2);cylinder(.055,.9,wood,harbor,x,-.25,1.7);}
  for(const z of [.75,1.45])for(let i=0;i<6;i++){cylinder(.025,.35,gold,harbor,-1.3+i*.52,.25,z);}line([[-1.3,.43,1.45],[0,.43,1.45],[1.3,.43,1.45]],.023,wood,harbor);
  line([[0,.4,-.7],[0,1.8,0],[0,.4,.8]],.015,gold,ship);
  for(let i=0;i<5;i++){const x=-.85+i*.42;for(let j=0;j<6;j++){const a=j/6*Math.PI*2;cylinder(.018,1.12,stone,library,x+Math.cos(a)*.102,.96,.5+Math.sin(a)*.102,5);}}
  for(const x of [-.6,0,.6])archWindow(library,x,.94,.115,.22,.54);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;mesh(new T.DodecahedronGeometry(.18,1),cliff,camp,Math.cos(a)*1.2,.15,Math.sin(a)*1.2);}
  // 盤緣羅盤、固定鉚釘與厚實的展品底座。
  cylinder(7.8,.35,cliff,island,0,-1.7,0,64);cylinder(7.85,.055,gold,island,0,-1.51,0,64);
  for(const z of [-8,8])for(let x=-11;x<=11;x+=.7){mesh(new T.SphereGeometry(.045,6,4),gold,island,x,-.87,z);}
  for(let j=0;j<3;j++){const r=mesh(new T.TorusGeometry(.55+j*.18,.012,5,64),gold,island,9.8,-.77,6.5);r.rotation.x=-Math.PI/2;}
  for(let j=0;j<8;j++){const a=j/8*Math.PI*2;line([[9.8,-.76,6.5],[9.8+Math.cos(a)*.94,-.76,6.5+Math.sin(a)*.94]],.009,gold);}
  const waveData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const p=(y*128+x)*4,v=125+Math.sin(y*.45+Math.sin(x*.16)*2)*20+rand()*12;waveData[p]=waveData[p+1]=waveData[p+2]=v;waveData[p+3]=255;}
  const waves=new T.DataTexture(waveData,128,128);waves.wrapS=waves.wrapT=T.RepeatWrapping;waves.repeat.set(4,4);waves.needsUpdate=true;water.bumpMap=waves;water.bumpScale=.065;water.roughness=.42;
  // 林地避開四個入口與中央路徑。
  for(let i=0;i<(constrained?110:190);i++){const x=-8+rand()*16,z=-3+rand()*8.5;if(sites.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<2)||Math.abs(x)<1||z>5.6)continue;
    const h=.4+rand()*.6;const foliage=new T.Group();foliage.position.set(x,.67,z);island.add(foliage);
    cylinder(.032,h*.65,wood,foliage,0,h*.25,0,6);
    for(let tier=0;tier<3;tier++){const crown=cone(.25*(1-tier*.23),h*.58,roof,foliage,0,h*(.35+tier*.21),0,8);crown.rotation.y=i*.37+tier*.7;}
  }
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
  // 海面上的金色方位刻線。
  for(let i=0;i<20;i++)box(.025,.015,.12+(i%5===0?.12:0),gold,island,-10+i, -.77,7.8);
  // 地標揭幕與相機各自管理，捲動不會中斷點擊後的靠近動作。
  const revealGroups=groups.map(g=>{const wrap=new T.Group();wrap.position.copy(g.position);island.add(wrap);wrap.add(g);g.position.set(0,0,0);return wrap;});
  let active=0,hovered=-1,frame=0,settle,unavailable=false,arrival=-1;
  const look=new T.Vector3(0,0,0);
  const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduced');
  function illuminate(){beacons.forEach(({ring,light},i)=>{ring.visible=i===active||i===hovered;light.intensity=i===active?12:i===hovered?8:0;});}
  function cancelMotion(){cancelAnimationFrame(frame);settle?.();settle=null;}
  function moveCamera(index,close=false){
    cancelMotion();
    if(unavailable)return Promise.resolve();
    const from=groups.map(g=>g.scale.x),start=performance.now(),fromCamera=camera.position.clone(),fromLook=look.clone(),fromZoom=camera.zoom;
    const [sx,sz]=sites[index],toLook=new T.Vector3(close?sx*.42:0,close?.6:0,close?sz*.3:0);
    const toCamera=new T.Vector3(3+sx*.18+(close?sx*.25:0),close?20:22,close?23:25),zoom=close?1.14:1;
    return new Promise(resolve=>{
      settle=resolve;
      const animate=now=>{
        const p=reduceMotion()?1:Math.min(1,(now-start)/(close?560:440)),ease=p*p*(3-2*p);
        groups.forEach((g,i)=>g.scale.setScalar(from[i]+((i===index?1.06:1)-from[i])*ease));
        camera.position.lerpVectors(fromCamera,toCamera,ease);look.lerpVectors(fromLook,toLook,ease);
        camera.zoom=fromZoom+(zoom-fromZoom)*ease;camera.lookAt(look);camera.updateProjectionMatrix();render();
        if(p<1)frame=requestAnimationFrame(animate);else{settle=null;resolve();}
      };
      frame=requestAnimationFrame(animate);
    });
  }
  function render(){if(unavailable)return;renderer.render(scene,camera);projectFlow();const w=host.clientWidth,h=host.clientHeight;labels.forEach((label,i)=>{const [x,z]=sites[i];const point=new T.Vector3(x,.75,z+1.9).project(camera);label.style.left=((point.x+1)*50)+'%';label.style.top=((-point.y+1)*50)+'%';});}
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;camera.left=-15;camera.right=15;camera.top=15/aspect;camera.bottom=-15/aspect;camera.updateProjectionMatrix();render();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();host.classList.add('has-relief');
  const textures=new Set([waves]);
  wall.color.set(0xb4afa4);wall.metalness=.22;stone.color.set(0x83938e);cliff.color.set(0x48616c);grass.color.set(0x52634f);
  const loader=new T.TextureLoader();
  function texture(material,key,path,repeat,color=false){loader.load(path,t=>{if(unavailable){t.dispose();return;}t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);if(color)t.colorSpace=T.SRGBColorSpace;textures.add(t);material[key]=t;material.needsUpdate=true;render();},undefined,()=>{});}
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
    select(index){active=Math.max(0,Math.min(3,index));illuminate();routes.forEach((m,i)=>{m.emissiveIntensity=i===active?.65:i<active?.18:.02;m.color.set(i===active?0xc6a369:i<active?0x83714e:0x4c503e);});return moveCamera(active);},
    preview(index){hovered=index;illuminate();render();},
    focus(index){active=index;hovered=-1;illuminate();return moveCamera(active,true);},
    restore(){return moveCamera(active);},
    arrive(progress){
      const next=reduceMotion()?1:Math.max(arrival,Math.min(1,progress));
      if(next===arrival)return;arrival=next;
      revealGroups.forEach((g,i)=>{const p=Math.max(0,Math.min(1,(next-.12-i*.12)/.4));g.scale.y=.02+.98*p*p*(3-2*p);});
      render();
    }
  };
}
