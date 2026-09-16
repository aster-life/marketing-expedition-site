const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const keys=[
 [0,[-.627,-25],[0,17,-85]],
 [.18,[0,-85],[0,20,-94]],
 [.29,[0,-89],[.2,20,-104]],
 [.40,[-.7,-98],[1.2,20,-112]],
 [.49,[-1.4,-103.3],[1.2,19.3,-112]],
 [.78,[-5.3,-108.3],[1.2,18.6,-112]],
 [.88,[-5.3,-108.3],[1.2,18.6,-112]],
 [1,[2.7,-123],[6.3,19.2,-131]]
];
export function hallCamera(p){
 p=Math.max(0,Math.min(1,p));
 const i=Math.max(0,keys.findIndex((k,j)=>j<keys.length-1&&p<=keys[j+1][0]));
 const a=keys[i],b=keys[i+1],t=smooth((p-a[0])/(b[0]-a[0]));
 const mix=(x,y)=>x+(y-x)*t,x=mix(a[1][0],b[1][0]),z=mix(a[1][1],b[1][1]);
 const rise=z>-68?Math.max(0,-z*.075):Math.min(15.8,5.1+(-68-z)*.45);
 const eye=3.2-.9*smooth(p/.18);
 return {position:[x,rise+eye,z],look:a[2].map((v,j)=>mix(v,b[2][j]))};
}
