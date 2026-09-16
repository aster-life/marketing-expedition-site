/* 頂端感應導覽：滑鼠、觸控與鍵盤共用同一組連結。 */
(()=>{
 const header=document.querySelector('.home .site-header');
 if(!header)return;
 const trigger=document.createElement('button');
 trigger.className='nav-reveal-trigger';trigger.type='button';trigger.textContent='選單';
 trigger.setAttribute('aria-label','顯示主要選單');trigger.setAttribute('aria-expanded','false');
 header.id='reveal-header';trigger.setAttribute('aria-controls',header.id);
 header.before(trigger);
 const compact=matchMedia('(max-width:950px), (hover:none)');
 let timer;
 function show(){clearTimeout(timer);document.body.classList.add('nav-visible');trigger.setAttribute('aria-expanded','true');}
 function hide(){clearTimeout(timer);document.body.classList.remove('nav-visible');trigger.setAttribute('aria-expanded','false');}
 function scheduleHide(){clearTimeout(timer);timer=setTimeout(()=>{if(!header.contains(document.activeElement)&&!document.body.classList.contains('menu-open'))hide();},650);}
 document.addEventListener('mousemove',e=>{

  if(e.clientY<=16)show();
  else if(!header.contains(e.target)&&e.target!==trigger)scheduleHide();
 },{passive:true});
 header.addEventListener('pointerenter',show);
 header.addEventListener('pointerleave',scheduleHide);
 header.addEventListener('focusin',show);
 header.addEventListener('focusout',scheduleHide);
 trigger.addEventListener('click',()=>{
  show();
  if(compact.matches){const toggle=header.querySelector('.menu-toggle');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();toggle.focus();}
  else header.querySelector('a').focus();
 });
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(header.contains(document.activeElement))trigger.focus();hide();}});
 document.addEventListener('click',e=>{if(!header.contains(e.target)&&e.target!==trigger&&!document.body.classList.contains('menu-open'))hide();});
 document.body.classList.add('nav-reveal-ready');
})();
