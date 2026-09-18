import {createGalleryInteraction} from './gallery-interaction.js?v=performance-2';
import {createMistTransition} from './mist-transition.js?v=2';
const $=s=>document.querySelector(s),video=$('#opening-film'),journey=$('#atlas');
const intro=$('.film-intro'),ending=$('.film-ending'),play=$('#film-play'),sound=$('#film-sound'),status=$('#film-status'),host=$('#forest-space');
const reduced=()=>document.documentElement.classList.contains('reduced'),clamp=v=>Math.max(0,Math.min(1,v));
let target=0,frame=0,manual=false,lastReduced=reduced(),world=null,worldFailed=false,worldPromise=null,skipUntil=0;
const curtain=$('.film-curtain'),mist=createMistTransition(curtain);
const galleryInteraction=createGalleryInteraction($('.film-stage'),schedule);
const hallCopy=document.createElement('div');hallCopy.className='hall-copy';hallCopy.hidden=true;
hallCopy.innerHTML='<span class="eyebrow">第二幕 / THE EXPEDITION HOUSE</span><h2></h2><p></p><a class="text-link" href="team.html" hidden>認識遠征隊 <span>↗</span></a>';
$('.film-stage').append(hallCopy);
const galleryCopy=document.createElement('div');galleryCopy.className='hall-copy gallery-copy';galleryCopy.hidden=true;
galleryCopy.innerHTML='<span class="eyebrow">第三幕 / THE ATLAS GALLERY</span><h2></h2><p></p><a class="text-link" href="works.html">翻閱成果示範 <span>↗</span></a>';
$('.film-stage').append(galleryCopy);
const galleryBeats=[
 [0,.33,'想法，在這裡留下形狀。','走進成果星圖館，看見一份交付如何幫助下一步。','works.html'],
 [.33,.55,'先看清楚，再開始。','網站診斷示範：從入口問題，走到可核對的改善建議。','works.html#report-diagnosis'],
 [.55,.74,'讓內容有自己的目的。','內容提案示範：把讀者的困擾，整理成能採取行動的內容。','works.html#report-content'],
 [.74,.93,'把重要的決定，說清楚。','決策摘要示範：首選、代價與追蹤方式，一起攤開。','works.html#report-decision'],
 [.93,1.01,'帶走方法，繼續遠征。','以上為虛構情境的交付示範，並非客戶實績。','knowledge.html']
];
const hallBeats=[
 [.19,.31,'你做決策，','讓專業一起前進。'],
 [.36,.49,'遠征，在此集結。','這裡，是想法開始協作的地方。'],
 [.51,.61,'先釐清問題。','秘書整理交辦與待決事項，讓目標有清楚的起點。'],
 [.63,.73,'讓專業接力。','搜尋、內容與廣告，沿著同一個目標形成方案。'],
 [.76,.88,'讓成果指引下一步。','核對成效，回看方案。重要的決定，始終留在你手上。'],
 [.93,1.01,'光，指向下一站。','帶著清楚的方向，看看想法留下的成果。']
];
function fallback(){worldFailed=true;host.hidden=true;status.textContent='此裝置無法顯示立體空間；保留影片終點，可繼續探索內容。';schedule();}
// 載入幕先建立大型 3D 場景；捲動只控制已準備完成的鏡頭。
function ensureWorld(){
 if(world||worldFailed||worldPromise)return worldPromise;
 host.dataset.loading='true';
 worldPromise=import('./forest-world.js?v=visibility-15').then(async({createForest})=>{
  world=await createForest(host,fallback,{onProgress:({stage,value,label})=>{
   const range=stage==='interior'?[68,88]:[30,68];
   loadingProgress(range[0]+(range[1]-range[0])*value,label);
  }});world.setGalleryVideo(galleryInteraction.video);
  host.setAttribute('aria-label','沿森林石階進入遠征本部；中央地圖桌、典籍與成果展館隨捲動依序展開');host.dataset.scene='forest-headquarters-gallery';delete host.dataset.loading;schedule();return world;
 }).catch(error=>{console.warn('立體遠征場景暫時無法載入。',error);fallback();});
 return worldPromise;
}
// 捲動位置是唯一時間來源；停止捲動後不繼續播放。
function seek(){if(reduced()||!Number.isFinite(video.duration)||video.seeking)return;const time=Math.min(target*video.duration,Math.max(0,video.duration-.04));if(Math.abs(video.currentTime-time)>.025)video.currentTime=time;}
// 地圖與筆記佔滿畫面時，前面三幕停止送出繪圖與影片 seek；返回可見區仍由原捲動位置還原。
function draw(){frame=0;const rect=journey.getBoundingClientRect();document.body.classList.toggle('past-entry',rect.bottom<innerHeight*.4);if(document.hidden||document.body.classList.contains('journal-open')||rect.bottom<=0||rect.top>=innerHeight){video.pause();galleryInteraction.video.pause();return;}const travel=Math.max(0,-rect.top/Math.max(1,innerHeight*5.2)),p=clamp(travel),actTwo=clamp(travel-.95),galleryProgress=clamp((travel-1.95)/1.1);if(!reduced()&&Date.now()>skipUntil&&((p>.07&&travel<1.95)||location.hash==='#gallery-transition'))ensureWorld();const galleryState=galleryInteraction.render(galleryProgress,!reduced()&&!!world),actThree=galleryState.scene;const stage=journey.querySelector('.film-stage'),expand=reduced()?0:(galleryState.pose?.passage??0),fullHeight=stage.clientWidth*9/16,stageHeight=innerHeight+(fullHeight-innerHeight)*expand;stage.style.height=stageHeight+'px';stage.style.top=(-Math.max(0,stageHeight-innerHeight)*clamp((galleryProgress-.78)/.16))+'px';document.body.classList.toggle('past-entry',rect.bottom<innerHeight*.4);play.hidden=!reduced();sound.hidden=!reduced();host.hidden=true;hallCopy.hidden=true;galleryCopy.hidden=true;
 if(reduced()){video.hidden=false;video.style.opacity='1';curtain.style.opacity='0';intro.hidden=manual;ending.hidden=true;$('#film-cue').textContent='已減少動態，可自行播放或直接探索。';return;}
 video.pause();video.muted=true;target=clamp(p/.43);seek();intro.hidden=target>.13;intro.style.opacity=String(1-clamp(target/.13));
 const atEnd=Number.isFinite(video.duration)&&video.currentTime>=video.duration-.12;
 // 在最濃的水霧中交接畫面，霧層跟著捲動前進與退回。
 const ready=(atEnd||video.dataset.tailReady==='true')&&world&&!worldFailed;
 const inWorld=!!(p>=.445&&ready),blend=inWorld?clamp((p-.445)/.022):0;
 host.hidden=!inWorld;video.hidden=blend===1;video.style.opacity='1';host.style.opacity=String(blend);
 mist.render(ready?clamp((p-.425)/.07):0);
 if(inWorld)world.render(clamp((p-.467)/.483),actTwo,actThree,galleryState.pose);
 const textProgress=clamp((p-.86)/.04)*(1-clamp((travel-.92)/.03));ending.hidden=!(inWorld&&p>.86&&travel<.95);ending.style.opacity=String(textProgress);ending.style.visibility='visible';
 const beat=hallBeats.find(b=>actTwo>=b[0]&&actTwo<=b[1]);
 if(inWorld&&beat&&actThree===0){hallCopy.hidden=false;hallCopy.querySelector('h2').textContent=beat[2];hallCopy.querySelector('p').textContent=beat[3];hallCopy.querySelector('a').hidden=actTwo<.76||actTwo>.88;hallCopy.style.opacity=String(Math.min(clamp((actTwo-beat[0])/.015),clamp((beat[1]-actTwo)/.015)));}
 if(inWorld&&actThree>0&&(galleryProgress<.16||galleryProgress>.96)){const g=galleryBeats.find(b=>actThree>=b[0]&&actThree<=b[1]);if(g){galleryCopy.hidden=false;galleryCopy.querySelector('h2').textContent=g[2];galleryCopy.querySelector('p').textContent=g[3];galleryCopy.querySelector('a').href=g[4];galleryCopy.querySelector('a').firstChild.textContent=actThree>.93?'翻開知識典藏 ':'翻閱成果示範 ';}}
 journey.style.setProperty('--film-progress',String(clamp(travel/3.05)));
 $('#film-cue').textContent=galleryProgress>=.55&&galleryProgress<.92?'循著星光，發現新的可能。':actThree>0?'沿著光，走進下一個空間。':actTwo>0?(actTwo<.3?'沿著最後石階，走入遠征本部。':actTwo<.88?'向下捲動 · 讓本部逐步亮起':'穿過側廊，繼續探索隊伍、成果與方法。'):inWorld?(p<.7?'沿著石階，走向森林深處。':'抬頭，看見瀑布之上的城邦。'):'向下捲動前進 · 向上捲動回看';}

function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
video.addEventListener('seeked',schedule);video.addEventListener('loadeddata',schedule);video.addEventListener('loadedmetadata',schedule);video.addEventListener('error',()=>{status.textContent='影片載入失敗，仍可直接探索網站內容。';});
play.addEventListener('click',async()=>{if(!reduced())return;if(!video.paused){video.pause();manual=false;play.textContent='繼續播放';return;}try{if(video.ended)video.currentTime=0;await video.play();manual=true;intro.hidden=true;play.textContent='暫停播放';}catch{status.textContent='影片暫時無法播放，可直接探索下方內容。';}});
sound.addEventListener('click',()=>{if(!reduced())return;video.muted=!video.muted;sound.setAttribute('aria-pressed',String(!video.muted));sound.textContent=video.muted?'音效 OFF':'音效 ON';});
video.addEventListener('ended',()=>{if(reduced()){manual=false;play.textContent='重新播放';}});
$('#film-skip').addEventListener('click',()=>{skipUntil=Date.now()+2000;video.pause();manual=false;play.textContent='播放開場';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();manual=false;play.textContent='播放開場';}else schedule();});
addEventListener('scroll',()=>{if(reduced()&&journey.getBoundingClientRect().bottom<0){video.pause();manual=false;}schedule();},{passive:true});addEventListener('resize',schedule);
new MutationObserver(()=>{if(lastReduced!==reduced()){lastReduced=reduced();video.pause();manual=false;intro.style.opacity='1';play.textContent='播放開場';}schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});schedule();

const loadingProgress=(value,label)=>dispatchEvent(new CustomEvent('expedition:loading-progress',{detail:{value,label}}));
const mediaReady=media=>new Promise(resolve=>{
 if(media.readyState>=3)return resolve();
 const timer=setTimeout(done,10000);
 function done(){clearTimeout(timer);media.removeEventListener('canplay',done);media.removeEventListener('error',done);resolve();}
 media.addEventListener('canplay',done,{once:true});media.addEventListener('error',done,{once:true});media.load();
});
const seekReady=(media,time,timeout=6000)=>new Promise(resolve=>{
 const timer=setTimeout(done,timeout);
 function done(){clearTimeout(timer);media.removeEventListener('seeked',done);resolve();}
 media.addEventListener('seeked',done,{once:true});media.currentTime=time;
});
async function primeOpeningTail(){
 await mediaReady(video);
 if(!Number.isFinite(video.duration)||video.duration<=0)return;
 await seekReady(video,Math.max(0,video.duration-.06));
 video.dataset.tailReady='true';
 await seekReady(video,0,2500);
}
async function warmWorld(preparedWorld){
 if(!preparedWorld)return;
 const wasHidden=host.hidden;
 host.hidden=false;host.style.visibility='hidden';
 preparedWorld.render(0,0,0,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 host.dataset.warmed='true';
 loadingProgress(92,'正在預熱成果星圖館');
 // 只走會切換主要可見物件的代表畫面；避免為相近鏡位反覆送出數百萬個三角形。
 preparedWorld.render(1,1,.45,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 preparedWorld.render(1,1,.08,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 loadingProgress(94,'正在準備本部燈光與金屬反射');
 // 先完成室內反射與室外燈光退出後的材質版本，再預熱穿門重疊畫面。
 // 否則第一次走到 .36 / .48 才會同步編譯、擷取反射，阻塞捲動。
 preparedWorld.render(1,.49,0,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 preparedWorld.render(1,.38,0,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 loadingProgress(95,'正在預熱遠征本部入口');
 // 最後預熱第一次進門的重疊畫面，讓本部資源保持在近期 GPU 狀態。
 preparedWorld.render(1,.225,0,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 preparedWorld.render(.52,0,0,null);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 // 載入幕仍可見時完成代表畫面的 GPU 佇列。
 preparedWorld.flushGpu?.();
 preparedWorld.render(0,0,0,null);
 host.hidden=wasHidden;host.style.removeProperty('visibility');host.dataset.interiorWarmed='true';host.dataset.galleryWarmed='true';
}
async function prepareExperience(){
 loadingProgress(10,'準備第一道光');
 const openingReady=primeOpeningTail().then(()=>loadingProgress(22,'開場影像已就緒'));
 const galleryReady=galleryInteraction.prepare().then(()=>loadingProgress(28,'星圖館影像已就緒'));
 const preparedWorld=await ensureWorld();
 loadingProgress(68,'正在建立遠征場景');
 await Promise.allSettled([openingReady,galleryReady,preparedWorld?.prepareInterior?.()]);
 loadingProgress(90,'正在預熱森林鏡頭');
 await warmWorld(preparedWorld);
 loadingProgress(98,'立體空間已就緒');
 dispatchEvent(new CustomEvent('expedition:act-ready'));
}
prepareExperience().catch(error=>{console.warn('部分遠征內容仍在背景準備。',error);dispatchEvent(new CustomEvent('expedition:act-ready'));});

// 審閱接點：定位在揭開石柱之前，不直接跳過入場。
if(location.hash==='#gallery-transition')requestAnimationFrame(()=>{scrollTo(0,innerHeight*5.2*(1.95+.53*1.1));schedule();});
