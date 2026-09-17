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
  let manualSelection=false;
  let world;
  const journal = document.querySelector('.expedition-journal');
  let mode='exploring';
  let transition=0;
  const quiet=()=>reduced.matches||document.documentElement.classList.contains('reduced');
  function setMode(next){
    mode=next;root.dataset.mode=next;
    root.inert=next!=='exploring';
    document.body.dataset.mapMode=next;
    journal?.setAttribute('aria-busy',String(next==='approaching'));
    if(journal)journal.querySelector('.journal-spread').inert=next==='approaching'||next==='closing';
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
    if(!manualSelection)show(Math.min(3, Math.floor(position().progress * 4)));
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }
  stops.forEach((button,index)=>button.addEventListener('click',()=>openRegion(index,button)));
  // 鍵盤直接探索地標時，讓同一地標的介紹同步顯示。
  locations.forEach((link, index) => link.addEventListener('focus', () => {if(mode==='exploring')show(index);}));
  const notes = [
    { title: '遠征本部', subject: 'AI 團隊', image: 'guild', lead: '每一段旅程，都從一次交辦開始。', detail: '在這裡，認識團隊的角色與專長，看一個目標如何經過分工、協作與核對，成為能交付的成果。', href: 'team.html', action: '走進遠征本部' },
    { title: '星港展廳', subject: '作品與成果', image: 'harbor', lead: '想法靠岸的地方，留下了作品。', detail: '點選牆上的網站作品、桌上的提案手稿或右側診斷筆記，走近看看細節，再打開每件展品背後的問題與做法。', href: 'works.html', action: '打開作品展廳' },
    { title: '典籍山谷', subject: '實作筆記', image: 'archive', lead: '走過的路，寫成下一次出發的線索。', detail: '翻閱 AI、內容創作與工作流程的筆記。從一次清楚的交辦、一份會議紀錄，到可以自己試用的小練習。', href: 'knowledge.html', action: '翻閱實作筆記' },
    { title: '營火之地', subject: '關於 Aster', image: 'room', lead: '停下腳步，認識點起這盞燈的人。', detail: '我是 Aster。這裡記錄我對 AI、行銷與創作的探索，以及我為什麼想建立一支能一起把事情做完的 AI 團隊。', href: 'about.html', action: '認識 Aster' }
  ];
  let returnFocus;
  locations.forEach((button,index)=>{
    button.addEventListener('pointerenter',()=>{if(mode==='exploring')world?.preview(index);});
    button.addEventListener('pointerleave',()=>{if(mode==='exploring')world?.preview(-1);});
  });
  const discoveries=[
    ['認識各角色的專長與分工','看目標如何整理成清楚的交辦','找到適合一起完成工作的隊伍'],
    ['探索網站、影片與 3D 的整合','閱讀作品的問題、做法與取捨','打開報告與交付的情境示範'],
    ['翻閱 AI 協作與創作方法','挑選交辦、會議與寫作練習','帶走能在工作中試用的範本'],
    ['認識 Aster 的經歷與觀點','了解一人公司與 AI 團隊的起點','從共同的問題開始交流']
  ];
  const discoveriesList=journal.querySelector('#journal-discoveries');
  const nextButton=journal.querySelector('#journal-next');
  let roomHost,roomSlot;
  function leaveHarbor(){roomSlot?.room?.suspend();journal.classList.remove('is-harbor-room');}
  function exhibitNote(exhibit){
    if(mode!=='reading')return;
    journal.querySelector('#journal-kicker').textContent=exhibit.subject;
    journal.querySelector('#journal-title').textContent=exhibit.title;
    journal.querySelector('#journal-lead').textContent=exhibit.lead;
    journal.querySelector('#journal-detail').textContent=exhibit.detail;
    discoveriesList.replaceChildren(...exhibit.discoveries.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    const enter=journal.querySelector('#journal-enter');enter.href=exhibit.href;enter.firstChild.textContent=exhibit.action+' ';
    journal.querySelector('.journal-spread').scrollTop=0;
  }
  function prepareRoom(index){
    if(roomSlot?.index===index&&!roomSlot.failed)return roomSlot.promise;
    const old=roomSlot;
    if(old){old.retired=true;old.room?.dispose();old.host.remove();}
    roomHost=document.createElement('div');roomHost.className='harbor-room-host';roomHost.dataset.ready='false';journal.append(roomHost);
    const slot={index,host:roomHost,retired:false,room:null};roomSlot=slot;
    const callbacks={index,quiet,onSelect:exhibit=>{if(roomSlot===slot)exhibitNote(exhibit);},onOverview:()=>{if(mode==='reading'&&active===index)fillNote(index);}};
    const module=index===1?import('./harbor-room.js?v=room-performance-1'):import('./region-room.js?v=room-performance-1');
    slot.promise=module.then(api=>index===1?api.createHarborRoom(slot.host,callbacks):api.createRegionRoom(slot.host,callbacks)).then(room=>{
      if(slot.retired){room.dispose();throw new Error('已離開此區域');}
      slot.room=room;return room;
    }).catch(error=>{slot.failed=true;throw error;});
    return slot.promise;
  }
  function fillNote(index){
    const note=notes[index];
    journal.querySelector('#journal-image').src=`assets/world/${note.image}.png`;
    journal.querySelector('#journal-image').alt=`${note.title}的場景插畫`;
    journal.querySelector('#journal-coordinate').textContent=`地點 0${index+1} / ${note.title}`;
    journal.querySelector('#journal-kicker').textContent=`探索筆記 0${index+1} / ${note.subject}`;
    journal.querySelector('#journal-title').textContent=note.title;
    journal.querySelector('#journal-lead').textContent=note.lead;
    journal.querySelector('#journal-detail').textContent=note.detail;
    discoveriesList.replaceChildren(...discoveries[index].map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    const enter=journal.querySelector('#journal-enter');enter.href=note.href;enter.firstChild.textContent=note.action+' ';
    journal.querySelector('.journal-page-number').textContent=`FIELD NOTES / 0${index+1} — 04`;
    nextButton.textContent=index===3?'完成探索・返回全圖 ↗':`下一站：${notes[index+1].title} →`;
    journal.scrollTop=0;
    journal.querySelector('.journal-spread').scrollTop=0;
  }
  async function openRegion(index,trigger){
    if(mode!=='exploring'&&mode!=='reading')return;
    const ticket=++transition;
    leaveHarbor();
    if(mode==='exploring'){
      returnFocus=trigger||locations[index];
      window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY,behavior:'instant'});
    }
    manualSelection=true;show(index);setMode('approaching');
    document.body.classList.add('journal-open');world?.arrive(1);
    nextButton.disabled=true;
    // 靠近外觀時同步準備室內；成功或失敗都先收妥，避免取消後的未處理拒絕。
    const roomPreparation=prepareRoom(index).then(room=>({room}),error=>({error}));
    try{await world?.focus(index);}catch(error){console.warn('地圖運鏡未完成，仍可閱讀筆記。',error);}
    if(ticket!==transition)return;
    fillNote(index);
    returnFocus=locations[index];
    if(!journal.open)journal.showModal();
    {
      journal.classList.add('is-harbor-room');
      try{
        const prepared=await roomPreparation;
        if(ticket!==transition)return;
        if(prepared.error)throw prepared.error;
        const room=prepared.room;
        await room.enter();
        if(ticket!==transition)return;
      }catch(error){
        if(ticket!==transition)return;
        console.error(notes[index].title+'未能載入。',error);
        roomHost.replaceChildren();
        const message=document.createElement('p');message.className='harbor-room-status';message.setAttribute('role','status');message.textContent='空間載入未完成。你仍可閱讀筆記，或返回地圖後重新進入。';roomHost.append(message);
      }
    }
      setMode('reading');nextButton.disabled=false;
      journal.querySelector('.journal-close').focus({preventScroll:true});
      // 進場版型恢復後才重設閱讀位置，避免下一站沿用上一區底部。
      journal.scrollTop=0;
      journal.querySelector('.journal-spread').scrollTop=0;
  }
  locations.forEach((button,index)=>button.addEventListener('click',()=>openRegion(index,button)));
  nextButton.addEventListener('click',()=>{if(mode!=='reading')return;if(active===3)closeJournal();else openRegion(active+1);});
  const controls=document.createElement('div');controls.className='map-view-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','地圖視角');
  controls.innerHTML='<span>拖曳地圖，換個角度</span><button type="button" data-view="left" aria-label="向左旋轉地圖">↶</button><button type="button" data-view="right" aria-label="向右旋轉地圖">↷</button><button type="button" data-view="in" aria-label="放大地圖">＋</button><button type="button" data-view="out" aria-label="縮小地圖">−</button><button type="button" data-view="reset" aria-label="重設地圖視角">⌖</button>';
  stage.append(controls);
  controls.addEventListener('click',event=>{
    const command=event.target.closest('[data-view]')?.dataset.view;
    if(!command||mode!=='exploring')return;
    if(command==='reset')world?.reset();
    else world?.orbit(command==='left'?-.12:command==='right'?.12:0,0,command==='in'?.08:command==='out'?-.08:0);
  });
  async function returnToMap(){
    if(mode==='exploring'||mode==='returning')return;
    ++transition;
    leaveHarbor();
    setMode('returning');
    try{await world?.restore();}finally{
      document.body.classList.remove('journal-open');
      setMode('exploring');
      returnFocus?.focus({preventScroll:true});
    }
  }
  async function closeJournal(){
    if(mode!=='reading'&&mode!=='approaching')return;
    if(!journal.open){returnToMap();return;}
    ++transition;
    roomSlot?.room?.suspend();
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
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode==='approaching'&&!journal.open){event.preventDefault();returnToMap();}});
  // 進場幕期間先完成立體地圖，使用者開始捲動時不再臨時建立 WebGL 場景。
  let worldPromise;
  function prepareWorld(){
    if(worldPromise)return worldPromise;
    worldPromise=import('./expedition-relief.js?v=map-performance-1').then(({ createRelief }) => {
      world = createRelief(terrain, locations);
      world.arrive(Math.max(0,Math.min(1,(innerHeight-root.getBoundingClientRect().top)/(innerHeight*.75))));
      if(mode==='reading'||mode==='approaching')world.focus(active);else world.select(active);
      requestAnimationFrame(()=>terrain.classList.remove('is-relief-loading'));
      schedule();
      dispatchEvent(new CustomEvent('expedition:loading-progress',{detail:{value:100,label:'遠征準備完成'}}));
      dispatchEvent(new CustomEvent('expedition:ready'));
    }).catch(error => {
      terrain.classList.add('is-relief-unavailable');
      console.error('立體地圖無法載入。', error);
      dispatchEvent(new CustomEvent('expedition:ready'));
    });
    return worldPromise;
  }
  addEventListener('expedition:act-ready',prepareWorld,{once:true});
  window.addEventListener('scroll',()=>{if(mode==='exploring')manualSelection=false;schedule();},{passive:true});
  window.addEventListener('resize',()=>{
    if(mode!=='exploring')window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY,behavior:'instant'});
    schedule();
  },{passive:true});
  reduced.addEventListener('change', schedule);
  update();
}
