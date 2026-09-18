// 保留取景節點，以連續斜率穿過門檻；各座標保持單調，避免曲線越過牆面。
export function createCameraJourney(nodes){
 const times=nodes.map(n=>n.at);
 function channel(key,axis){
  const values=nodes.map(n=>n[key][axis]),slopes=values.slice(1).map((v,i)=>(v-values[i])/(times[i+1]-times[i]));
  const tangents=values.map((_,i)=>{
   if(i===0||i===values.length-1)return 0;
   const before=slopes[i-1],after=slopes[i];
   if(before*after<=0)return 0;
   const left=times[i]-times[i-1],right=times[i+1]-times[i],a=2*right+left,b=right+2*left;
   return (a+b)/(a/before+b/after);
  });
  return (i,t)=>{
   const span=times[i+1]-times[i],u=(t-times[i])/span,u2=u*u,u3=u2*u;
   return (2*u3-3*u2+1)*values[i]+(u3-2*u2+u)*span*tangents[i]+(-2*u3+3*u2)*values[i+1]+(u3-u2)*span*tangents[i+1];
  };
 }
 const positions=[0,1,2].map(i=>channel('position',i)),targets=[0,1,2].map(i=>channel('target',i));
 return progress=>{
  const t=Math.min(1,Math.max(0,progress));let i=0;
  while(i<nodes.length-2&&t>=times[i+1])i++;
  return {position:positions.map(f=>f(i,t)),target:targets.map(f=>f(i,t)),phase:['exterior','threshold','interior'][i]};
 };
}
