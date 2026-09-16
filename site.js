/* 網站共用互動：原生導覽、章節視差、內容篩選與本機需求單。 */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const mq=matchMedia('(prefers-reduced-motion: reduce)');let reduced=mq.matches;
try{const saved=sessionStorage.getItem('expedition-motion');if(saved!==null)reduced=saved==='reduced'}catch{}
let raf=0,movingUntil=0,scrollDirection=1,lastY=scrollY;
const chapters=$$('.world-chapter'),nav=$('.world-nav'),motion=$('.motion-toggle');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function applyMotion(){document.documentElement.classList.toggle('reduced',reduced);motion.textContent=reduced?'動態 OFF':'動態 ON';motion.setAttribute('aria-label',reduced?'恢復動態':'減少動態');motion.setAttribute('aria-pressed',String(reduced));schedule()}
motion.addEventListener('click',()=>{reduced=!reduced;try{sessionStorage.setItem('expedition-motion',reduced?'reduced':'full')}catch{}applyMotion()});
mq.addEventListener('change',e=>{reduced=e.matches;applyMotion()});
const menu=$('.menu-toggle'),mainNav=$('#main-nav');
function closeMenu(returnFocus=false){mainNav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='選單';document.body.classList.remove('menu-open');if(returnFocus)menu.focus()}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';mainNav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'關閉':'選單';document.body.classList.toggle('menu-open',open)});
mainNav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&mainNav.classList.contains('open'))closeMenu(true)});
addEventListener('resize',()=>{if(innerWidth>950)closeMenu();schedule()});
const chapterLinks=$$('.world-nav a');
function render(now){raf=0;const mobile=innerWidth<600;document.body.classList.toggle('scrolled',scrollY>30);const total=document.documentElement.scrollHeight-innerHeight;$('.reading-progress').style.width=(total>0?clamp(scrollY/total)*100:0)+'%';
 let current=-1;
 chapters.forEach((chapter,i)=>{const r=chapter.getBoundingClientRect(),window=chapter.querySelector('.scene-window'),visible=r.bottom>0&&r.top<innerHeight;window.classList.toggle('in-view',visible);window.classList.toggle('is-moving',visible&&!reduced&&now<movingUntil);if(!visible)return;
 const t=clamp(-r.top/Math.max(1,r.height-innerHeight));if(r.top<innerHeight*.55&&r.bottom>innerHeight*.55)current=i;
 const base=chapter.querySelector('.scene-art');base.style.transform=reduced?'none':`scale(${1.04+t*(i===0?.22:.09)}) translateY(${t*(i%2?-1.1:1.1)}%)`;
 window.style.setProperty('--haze-x',`${(t-.5)*(i%2?90:-90)}px`);window.style.setProperty('--path-offset',String(900-t*900));window.style.setProperty('--path-light',String(t));
 const directions=[-1,1,-1,1,1],d=directions[i],amount=reduced?0:t;const px=mobile?62:79,mx=mobile?82:89;
 window.style.setProperty('--cat-x',`${clamp(px+amount*d*(mobile?10:14),45,mobile?75:88)}%`);window.style.setProperty('--mei-x',`${clamp(mx+amount*d*(mobile?8:11),55,mobile?87:93)}%`);
 window.style.setProperty('--cat-scale',String(reduced?1:i===0?1-t*.2:1));window.style.setProperty('--cat-y',`${reduced?0:Math.sin(t*Math.PI)*-12}px`);window.style.setProperty('--mei-y',`${reduced?0:Math.sin(t*Math.PI)*-25}px`);
 window.style.setProperty('--copy-y',`${reduced?0:-t*12}px`);window.dataset.direction=String(scrollDirection);
 });
 chapterLinks.forEach((a,i)=>{if(i===current)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});if(nav)nav.classList.toggle('past-world',current===-1);
 if(!reduced&&!document.hidden&&now<movingUntil)raf=requestAnimationFrame(render);
}
function schedule(){if(!raf)raf=requestAnimationFrame(render)}
addEventListener('scroll',()=>{scrollDirection=scrollY>=lastY?1:-1;lastY=scrollY;movingUntil=performance.now()+1500;schedule()},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){movingUntil=0;if(raf)cancelAnimationFrame(raf);raf=0;$$('.is-moving').forEach(e=>e.classList.remove('is-moving'))}else schedule()});
function exclusive(buttonSelector,attribute,panelSelector,prefix){const buttons=$$(buttonSelector),panels=$$(panelSelector);buttons.forEach(button=>button.addEventListener('click',()=>{const id=button.getAttribute(attribute);buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));panels.forEach(p=>p.hidden=p.id!==prefix+id)}))}
exclusive('[data-member]','data-member','.member-profile','profile-');exclusive('[data-report]','data-report','.report-sheet','report-');
function openReportHash(){const id=location.hash.slice(1);if(!id.startsWith('report-'))return;const panel=document.getElementById(id),button=$$('[data-report]').find(b=>'report-'+b.dataset.report===id);if(!panel||!button)return;button.click();panel.scrollIntoView({block:'start',behavior:'instant'});}
openReportHash();addEventListener('hashchange',openReportHash);

const search=$('#search');let filter='全部';
function filterArticles(){const query=search.value.trim().toLocaleLowerCase();let count=0;$$('.library-grid .journal-card').forEach(card=>{const match=(filter==='全部'||card.dataset.category===filter)&&card.dataset.search.toLocaleLowerCase().includes(query);card.hidden=!match;if(match)count++});$('#result-count').textContent=`共 ${count} 卷${query?' · 搜尋「'+search.value.trim()+'」':''}`;$('#empty-state').hidden=count>0;schedule()}
if(search){search.addEventListener('input',filterArticles);$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filterArticles()}));$('#reset-search').addEventListener('click',()=>{filter='全部';search.value='';$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='全部')));filterArticles();search.focus()})}
$$('.copy-exercise').forEach(button=>button.addEventListener('click',async()=>{const text=$('#exercise-text').textContent,status=$('.copy-status');try{await navigator.clipboard.writeText(text);status.textContent='已複製，可以貼到自己的筆記。'}catch{status.textContent='瀏覽器未允許自動複製，請選取上方文字後手動複製。'}}));
$$('[data-service]').forEach(a=>a.addEventListener('click',()=>{$('#service').value=a.dataset.service}));
const form=$('#brief-form');if(form)form.addEventListener('submit',e=>{e.preventDefault();const goal=$('#goal');if(!goal.value.trim()){goal.setCustomValidity('請描述一件想完成的事。');goal.reportValidity();goal.addEventListener('input',()=>goal.setCustomValidity(''),{once:true});return}goal.setCustomValidity('');if(!form.reportValidity())return;
 const values=new FormData(form),text=`行銷遠征｜合作需求單\n\n方向：${values.get('service')}\n\n我想完成的事：\n${String(values.get('goal')).trim()}\n\n目前卡住的地方：\n${String(values.get('obstacle')).trim()||'尚待補充'}\n\n希望拿到的成果：\n${String(values.get('deliverable')).trim()||'尚待討論'}\n\n此檔案由瀏覽器在本機產生，尚未送出詢問。\n`;
 try{const blob=new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='行銷遠征-合作需求單.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('#brief-status').textContent='已產生需求單並啟動下載，請查看瀏覽器下載項目。這份需求尚未送出。'}catch{$('#brief-status').textContent='無法啟動下載，請先複製欄位內容保存，再重新嘗試。'}
});
applyMotion();addEventListener('load',schedule);
})();
