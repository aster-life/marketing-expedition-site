// 使用原生頁面捲動；離開地圖後繼續瀏覽，不攔截滾輪與觸控。
const root = document.querySelector('.expedition-map');
if (root) {
  const stage = root.querySelector('.expedition-stage');
  const terrain = root.querySelector('.expedition-terrain');
  const stories = [...root.querySelectorAll('[data-story]')];
  const stops = [...root.querySelectorAll('[data-stop]')];
  const locations = [...root.querySelectorAll('[data-region]')];
  const sites = [...root.querySelectorAll('[data-site]')];
  const routes = [...root.querySelectorAll('[data-route]')];
  const count = root.querySelector('.expedition-count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shifts = [['1%', '1%'], ['-1%', '-1%'], ['-1%', '1%'], ['1%', '-1%']];
  let active = -1;
  let queued = false;
  let world;
  let mode='exploring';
  let transition=0;
  const quiet=()=>reduced.matches||document.documentElement.classList.contains('reduced');
  function setMode(next){
    mode=next;root.dataset.mode=next;
    root.inert=next!=='exploring';
    root.setAttribute('aria-busy',String(next==='approaching'||next==='returning'));
  }
  setMode('exploring');
  root.classList.add('is-enhanced');

  function show(index) {
    if (index === active) return;
    active = index;
    world?.select(index);
    stories.forEach((story, i) => { story.hidden = i !== index; });
    stops.forEach((stop, i) => stop.setAttribute('aria-pressed', String(i === index)));
    locations.forEach((link, i) => link.classList.toggle('is-active', i === index));
    sites.forEach((site, i) => site.classList.toggle('is-active', i === index));
    routes.forEach((route, i) => route.classList.toggle('is-travelled', i < index));
    count.textContent = `0${index + 1} — 04`;
    const move = reduced.matches || document.documentElement.classList.contains('reduced') ? ['0', '0'] : shifts[index];
    terrain.style.setProperty('--map-x', move[0]);
    terrain.style.setProperty('--map-y', move[1]);
  }

  function position() {
    const rect = root.getBoundingClientRect();
    const travel = Math.max(1, root.offsetHeight - stage.offsetHeight);
    return { top: rect.top + window.scrollY, travel, progress: Math.max(0, Math.min(1, -rect.top / travel)) };
  }

  function update() {
    queued = false;
    const arrival=Math.max(0,Math.min(1,(innerHeight-root.getBoundingClientRect().top)/(innerHeight*.75)));
    root.style.setProperty('--atlas-arrival',arrival);
    world?.arrive(arrival);
    if(mode!=='exploring')return;
    show(Math.min(3, Math.floor(position().progress * 4)));
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }
  stops.forEach((button, index) => button.addEventListener('click', () => {
    if(mode!=='exploring')return;
    const { top, travel } = position();
    // 停在每段中間，避免邊界四捨五入造成來回閃動。
    window.scrollTo({ top: top + travel * (index === 0 ? 0 : (index + .3) / 4), behavior: reduced.matches || document.documentElement.classList.contains('reduced') ? 'instant' : 'smooth' });
  }));
  // 鍵盤直接探索地標時，讓同一地標的介紹同步顯示。
  locations.forEach((link, index) => link.addEventListener('focus', () => {if(mode==='exploring')show(index);}));
  const journal = document.querySelector('.expedition-journal');
  const notes = [
    { title: '遠征本部', subject: 'AI 團隊', image: 'guild', lead: '每一段旅程，都從一次交辦開始。', detail: '在這裡，認識團隊的角色與專長，看一個目標如何經過分工、協作與核對，成為能交付的成果。', href: 'team.html', action: '走進遠征本部' },
    { title: '星港展廳', subject: '作品與成果', image: 'harbor', lead: '想法靠岸的地方，留下了作品。', detail: '從你正在瀏覽的網站開始，看看影片、3D 與內容如何組合，也翻閱作品背後的問題、取捨與實作過程。', href: 'works.html', action: '打開作品展廳' },
    { title: '典籍山谷', subject: '實作筆記', image: 'archive', lead: '走過的路，寫成下一次出發的線索。', detail: '翻閱 AI、內容創作與工作流程的筆記。從一次清楚的交辦、一份會議紀錄，到可以自己試用的小練習。', href: 'knowledge.html', action: '翻閱實作筆記' },
    { title: '營火之地', subject: '關於 Aster', image: 'room', lead: '停下腳步，認識點起這盞燈的人。', detail: '我是 Aster。這裡記錄我對 AI、行銷與創作的探索，以及我為什麼想建立一支能一起把事情做完的 AI 團隊。', href: 'about.html', action: '認識 Aster' }
  ];
  let returnFocus;
  locations.forEach((button,index)=>{
    button.addEventListener('pointerenter',()=>{if(mode==='exploring')world?.preview(index);});
    button.addEventListener('pointerleave',()=>{if(mode==='exploring')world?.preview(-1);});
  });
  locations.forEach((button, index) => button.addEventListener('click', async () => {
    if(mode!=='exploring')return;
    const ticket=++transition;
    show(index);
    setMode('approaching');
    document.body.classList.add('journal-open');
    world?.arrive(1);
    const note = notes[index];
    returnFocus = button;
    journal.querySelector('#journal-image').src = `assets/world/${note.image}.png`;
    journal.querySelector('#journal-image').alt = `${note.title}的場景插畫`;
    journal.querySelector('#journal-coordinate').textContent = `地點 0${index + 1} / ${note.title}`;
    journal.querySelector('#journal-kicker').textContent = `探索筆記 0${index + 1} / ${note.subject}`;
    journal.querySelector('#journal-title').textContent = note.title;
    journal.querySelector('#journal-lead').textContent = note.lead;
    journal.querySelector('#journal-detail').textContent = note.detail;
    const enter = journal.querySelector('#journal-enter');
    enter.href = note.href;
    enter.firstChild.textContent = note.action + ' ';
    journal.querySelector('.journal-page-number').textContent = `BEYOND THE ATLAS — 0${index + 1}`;
    // 先讓相機帶路，再揭開圖文；快速連點只接受第一次。
    try{await world?.focus(index);}catch(error){console.warn('地圖運鏡未完成，仍可閱讀筆記。',error);}
    if(ticket!==transition)return;
    journal.classList.remove('is-closing');
    journal.showModal();
    setMode('reading');
  }));
  async function returnToMap(){
    if(mode==='exploring'||mode==='returning')return;
    ++transition;
    setMode('returning');
    try{await world?.restore();}finally{
      document.body.classList.remove('journal-open');
      setMode('exploring');
      returnFocus?.focus({preventScroll:true});
    }
  }
  async function closeJournal(){
    if(mode!=='reading')return;
    setMode('closing');
    if(!quiet()){
      const animation=journal.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:180,easing:'ease-in',fill:'forwards'});
      try{await animation.finished;}catch{}
      journal.close();animation.cancel();
    }else journal.close();
  }
  journal.querySelector('.journal-close').addEventListener('click',closeJournal);
  journal.addEventListener('click',event=>{if(event.target===journal)closeJournal();});
  journal.addEventListener('cancel',event=>{event.preventDefault();closeJournal();});
  journal.addEventListener('close',returnToMap);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode==='approaching'){event.preventDefault();returnToMap();}});
  // 只有地圖進入附近視野才載入立體場景；載入前維持暗場，避免舊平面圖閃現。
  const loader = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    loader.disconnect();
    import('./expedition-relief.js?v=performance-1').then(({ createRelief }) => {
      world = createRelief(terrain, locations);
      world.arrive(Math.max(0,Math.min(1,(innerHeight-root.getBoundingClientRect().top)/(innerHeight*.75))));
      if(mode==='reading'||mode==='approaching')world.focus(active);else world.select(active);
      requestAnimationFrame(()=>terrain.classList.remove('is-relief-loading'));
      schedule();
    }).catch(error => {
      terrain.classList.add('is-relief-unavailable');
      console.error('立體地圖無法載入。', error);
    });
  }, { rootMargin: '500px' });
  loader.observe(root);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reduced.addEventListener('change', schedule);
  update();
}
