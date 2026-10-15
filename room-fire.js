import * as T from './assets/vendor/three.module.min.js';

// 營火：三片交錯的火舌（雜訊驅動的著色器，疊加發光）、往上飄的火星，以及跟著閃爍的火光。
// 取代原本的實心三角錐；需要房間在開啟時持續呼叫 tick(t) 才會動。
const flameVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const flameFragment=`
uniform float uTime;uniform float uSeed;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
 vec2 uv=vUv;float t=uTime*1.6+uSeed*7.;
 float y=uv.y;
 float w=mix(.42,.04,pow(y,.85));                       // 底寬頂尖
 float sway=(fbm(vec2(y*2.5-t*.6,uSeed*3.))-.5)*.32*y;  // 越高越飄
 float d=abs(uv.x-.5-sway)/w;
 float body=1.-smoothstep(.55,1.,d+ (fbm(vec2(uv.x*4.,y*3.-t*1.8))-.5)*.9);
 body*=smoothstep(0.,.08,y)*(1.-smoothstep(.62,1.,y+fbm(vec2(uv.x*6.,t))*.25));
 float core=1.-smoothstep(.0,.55,d+y*.9);
 vec3 c=mix(vec3(.95,.32,.05),vec3(1.,.72,.22),body*.8);
 c=mix(c,vec3(1.,.95,.75),core*.85);
 float a=clamp(body*1.15+core*.5,0.,1.);
 if(a<.02)discard;
 gl_FragColor=vec4(c*a*1.6,a);
}`;
export function createCampfire({at=[0,0,0],scale=1,light=null}){
 const group=new T.Group();group.position.set(...at);group.scale.setScalar(scale);
 const mats=[];
 for(let i=0;i<3;i++){
  const m=new T.ShaderMaterial({uniforms:{uTime:{value:0},uSeed:{value:i*1.37+.2}},vertexShader:flameVertex,fragmentShader:flameFragment,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
  const p=new T.Mesh(new T.PlaneGeometry(.95-i*.12,1.35-i*.15),m);p.position.y=(1.35-i*.15)/2-.02;p.rotation.y=i*Math.PI/3;p.renderOrder=5;group.add(p);mats.push(m);
 }
 // 火星：小光點從火堆往上飄、漸淡、再回到底部
 const N=70,pos=new Float32Array(N*3),seed=new Float32Array(N);
 for(let i=0;i<N;i++){seed[i]=Math.random();pos[i*3]=(Math.random()-.5)*.5;pos[i*3+1]=Math.random()*2.4;pos[i*3+2]=(Math.random()-.5)*.5;}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
 // 火星用圓形柔光貼圖（中心亮、外圈淡），不再是方塊點。
 const sparkTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const a=c.getContext('2d');const g=a.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,250,220,1)');g.addColorStop(.25,'rgba(255,200,110,.85)');g.addColorStop(.6,'rgba(255,120,40,.25)');g.addColorStop(1,'rgba(255,90,20,0)');a.fillStyle=g;a.fillRect(0,0,32,32);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
 const sparks=new T.Points(geo,new T.PointsMaterial({map:sparkTex,color:'#ffd08a',size:.07,transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sparks.renderOrder=6;group.add(sparks);
 // 地面上的暖色光暈
 const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const a=c.getContext('2d');const g=a.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,170,80,.75)');g.addColorStop(1,'rgba(255,120,40,0)');a.fillStyle=g;a.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
 const glow=new T.Mesh(new T.PlaneGeometry(3.2,3.2),new T.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.y=.02;group.add(glow);
 const base=light?light.intensity:0;
 let last=0;
 function tick(t){
  mats.forEach(m=>m.uniforms.uTime.value=t);
  const dt=Math.min(.05,t-last||0);last=t;const a=geo.attributes.position;
  for(let i=0;i<N;i++){let y=a.getY(i)+dt*(.55+seed[i]*.9);let x=a.getX(i)+Math.sin(t*2+seed[i]*20)*dt*.18;
   if(y>2.4){y=.15;x=(Math.random()-.5)*.45;a.setZ(i,(Math.random()-.5)*.45);}a.setX(i,x);a.setY(i,y);}
  a.needsUpdate=true;
  if(light)light.intensity=base*(.82+.12*Math.sin(t*9.1)+.08*Math.sin(t*23.7+1.3)+.05*Math.sin(t*3.3));
  glow.material.opacity=.85+.12*Math.sin(t*7.3);
 }
 return {group,tick,dispose(){glowTex.dispose();sparkTex.dispose();}};
}
