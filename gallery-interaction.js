const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const filmRoot='assets/film/gallery-invitation/star-reveal-1/';
export const galleryMedia={src:filmRoot+'web-1080p-fastseek.mp4',poster:filmRoot+'actual-start.jpg'};

// 沿前廳轉角接入角色影片，星象儀只在影片中首次揭示。
export function galleryTimeline(progress){
 const p=clamp(progress);
 if(p<.36)return {scene:p/.36*.66,pose:null,film:0,opacity:0};
 const t=smooth((p-.36)/.28);
 // 開門後繼續穿過固定的門框，避免影片運鏡前進時門扇仍黏在畫面兩側。
 const passage=smooth((p-.64)/.14);
 const pose={position:[12.2+1.8*t,18.5+.8*t,-157-8.2*t-5*passage],look:[14,18.5+.8*t,-174],fov:42,framing:passage,portal:true,portalProgress:t,passage,doorOpen:smooth((p-.54)/.065)};
 if(p<.64)return {scene:.66+.19*t,pose,film:clamp((p-.54)/.40),opacity:0};
 if(p<.94)return {scene:.85,pose,film:clamp((p-.54)/.40),opacity:0};
 return {scene:.85,pose,film:1,opacity:0};
}

export function createGalleryInteraction(stage,schedule,{pillar}={}){
 const film=document.createElement('video');
 film.id='gallery-film';film.muted=true;film.playsInline=true;film.preload='none';film.hidden=true;
 film.setAttribute('aria-label','跟著胖幼與美鈴走向星象儀，美鈴扶著桌緣，一起看見光球亮起');
 film.poster=galleryMedia.poster;
 stage.append(film);
 let failed=false,requested=false,decoded=false,decodedTime=0;

 const rememberFrame=()=>{if(film.readyState>=2&&!film.seeking){decoded=true;decodedTime=film.currentTime;}};
 film.addEventListener('loadeddata',rememberFrame);
 film.addEventListener('seeked',rememberFrame);
 const replay=document.createElement('a');replay.textContent='有聲重看 ↗';replay.href=galleryMedia.src;replay.target='_blank';replay.rel='noopener';replay.hidden=true;
 stage.querySelector('.film-bottom').append(replay);
 for(const event of ['loadeddata','loadedmetadata','seeked'])film.addEventListener(event,schedule);
 film.addEventListener('error',()=>{failed=true;schedule();});
 return {
  video:film,
  render(progress,enabled){
   const state=galleryTimeline(progress);
   stage.classList.toggle('gallery-framed',enabled&&!!state.pose);
   film.pause();film.hidden=true;replay.hidden=true;stage.classList.remove('gallery-performing');
   if(!enabled){pillar?.render(null);return state;}
   if(progress>.20&&!requested){requested=true;film.src=galleryMedia.src;film.preload='auto';film.load();}
   if(failed){pillar?.render(null);return {...state,opacity:0};}
   const duration=film.duration,desired=Number.isFinite(duration)?Math.min(state.film*duration,duration-.045):0;
   if(Number.isFinite(duration)&&!film.seeking&&Math.abs(film.currentTime-desired)>.026)film.currentTime=desired;
   // 未解碼完尾幀時保留影片，避免快速捲動直接穿越交接點。
   // currentTime 在提出 seek 時就改變，不能代表那個畫面已經解碼完成。
   // 快捲或回捲時，先等目標畫面解碼；不能把 currentTime 指派成功當成畫面已就緒。
   const pendingFrame=!decoded||film.seeking||Math.abs(decodedTime-desired)>.13;
   let pillarPhase=state.pillar??null;
   if(progress>=.58&&progress<.62&&!decoded)pillarPhase=.5;
   if(progress>=.92&&progress<.96&&pendingFrame)pillarPhase=.5;
   if(state.opacity===1&&!decoded)pillarPhase=.5;
   pillar?.render(pillarPhase);
   const opacity=state.opacity;
   // seek 期間 readyState 會暫降；維持上一個已解碼畫面，避免露出背後的空場景。
   film.hidden=opacity<.001||!decoded;film.style.opacity=String(opacity);
   replay.hidden=progress<.58||progress>.96;
   stage.classList.toggle('gallery-performing',!!state.pose?.portal);
   film.hidden=true;
   stage.dataset.galleryFilmProgress=state.film.toFixed(3);
   stage.dataset.galleryPillar=pillarPhase===null?'none':pillarPhase.toFixed(3);
   return state;
  }
 };
}
