// 水霧的位置與濃度只由捲動決定，反向捲動會沿原路退回。
export function createMistTransition(host){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');host.append(canvas);
 canvas.style.cssText='width:100%;height:100%;display:block';
 const clamp=x=>Math.max(0,Math.min(1,x));
 return {render(progress){
  const p=clamp(progress),density=Math.sin(p*Math.PI);
  host.style.opacity=p<=0||p>=1?'0':'1';
  if(density<.001)return;
  const w=innerWidth,h=innerHeight;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.clearRect(0,0,w,h);
  const veil=ctx.createLinearGradient(0,0,w,h);
  veil.addColorStop(0,`rgba(50,82,119,${density*.55})`);
  veil.addColorStop(.5,`rgba(83,116,151,${density*.65})`);
  veil.addColorStop(1,`rgba(28,56,85,${density*.58})`);
  ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
  for(let i=0;i<14;i++){
   const direction=i%2?1:-1;
   const x=((i*.618)%1)*w+direction*(p-.5)*w*.8;
   const y=((i*.381+.17)%1)*h-(p-.5)*h*.2;
   const r=Math.max(w,h)*(.17+(i%5)*.035)*(1+p*.5);
   const fog=ctx.createRadialGradient(x,y,0,x,y,r);
   fog.addColorStop(0,`rgba(143,174,201,${density*(.22+(i%3)*.06)})`);
   fog.addColorStop(.6,`rgba(99,140,179,${density*.10})`);
   fog.addColorStop(1,'rgba(70,111,155,0)');
   ctx.fillStyle=fog;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
 }};
}
