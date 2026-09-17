import * as T from './assets/vendor/three.module.min.js';

// 展品上的圖文是本機繪製的說明；完整可讀正文仍保留在旁側 HTML。
export function createHarborPaper(kind,title='',lines=[]){
 const c=document.createElement('canvas');c.width=900;c.height=1164;const ctx=c.getContext('2d');
 const dark=kind==='report';ctx.fillStyle=dark?'#152a31':'#d9c7a1';ctx.fillRect(0,0,900,1164);
 let seed=641;for(let i=0;i<16000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%900;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%1164;ctx.fillStyle=i%2?'#ffffff08':'#241b170c';ctx.fillRect(x,y,1+(i%3),1);}
 ctx.strokeStyle=dark?'#aa926140':'#91784766';ctx.lineWidth=2;ctx.strokeRect(29,29,842,1106);ctx.strokeRect(39,39,822,1086);
 const text=(value,x,y,size,color=dark?'#e3d4b6':'#18211e')=>{ctx.fillStyle=color;ctx.font=`${dark?400:600} ${size}px "Microsoft JhengHei",serif`;ctx.fillText(value,x,y);};
 const line=(x,y,x2,y2)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
 if(kind==='report'){
  text('FIELD NOTE   /   03',72,102,27,'#c1a26b');
  text('第一次來，',72,190,60);text('就知道往哪裡走。',72,270,60);
  text('首頁入口觀察 · 手作品牌情境',76,327,28,'#9aaeb2');
  ctx.strokeStyle='#ad9568';ctx.lineWidth=2;ctx.strokeRect(76,375,475,253);
  line(76,412,551,412);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(98+i*18,393,3,0,7);ctx.stroke();}
  text('說清楚，提供什麼',102,466,29);text('讓需要的人找到下一步',102,510,23,'#9aaeb2');
  ctx.fillStyle='#a58d56';ctx.fillRect(101,550,198,43);text('了解客製流程',120,580,23,'#11242c');
  line(309,571,615,571);line(615,571,615,451);text('清楚的入口',634,457,25,'#d8ba79');
  const rows=[['01','發現','第一次來的人，不確定從哪裡開始。'],['02','建議','先說明服務，再給出明確的下一步。'],['03','核對','請新訪客說出他理解的服務與入口。']];
  rows.forEach(([n,h,d],i)=>{const y=722+i*114;text(n,76,y,38,'#c1a26b');text(h,158,y,35);text(d,158,y+44,26,'#a8b8b8');ctx.strokeStyle='#a58d5644';line(76,y+66,824,y+66);});
  text('虛構情境・教學示範',76,1090,27,'#b69c6e');
 }else if(kind==='route'){
  text('WORKING MAP   /   02',73,110,27,'#8c6b3b');text('從想法，到確認稿',73,210,49);
  ctx.strokeStyle='#8c6b3b';ctx.lineWidth=3;line(163,325,163,854);
  [['整理需求','先說清楚想完成什麼'],['確認方向','核對內容與待確認資訊'],['完成交付','留下可接手的成果']].forEach(([h,d],i)=>{
   const y=354+i*232;ctx.fillStyle='#d9c7a1';ctx.beginPath();ctx.arc(163,y,32,0,7);ctx.fill();ctx.stroke();text(String(i+1),151,y+13,34);text(h,230,y+10,44);text(d,230,y+70,30);
  });text('待確認：交期、費用、範圍',80,990,32);text('虛構情境・教學示範',80,1090,27,'#8c6b3b');
 }else{
  text('EXPEDITION   /   FIELD NOTES',73,110,25,'#8c6b3b');text(title,73,224,62);
  ctx.strokeStyle='#ad9766';line(73,262,827,262);
  lines.forEach((value,i)=>text(value,78,365+i*97,i===0||i===3?42:36));
  ctx.strokeStyle='#ad976688';for(let y=403;y<930;y+=97)line(76,y,824,y);
  text('虛構情境・教學示範',78,1085,28,'#8c6b3b');
 }
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}
