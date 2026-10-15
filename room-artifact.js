// 房間近景的「實物」內容：書頁上印的就是這份資料；同一份內容另以隱藏文字提供給螢幕閱讀器。
// 內容是示範情境，紙上明確標示「示範」，不代表已承接的真實案件。
export const artifacts={
 brief:{
  kind:'交辦單',tag:'示範交辦單',
  title:'下個月新品上市，想在 IG 發三篇貼文。',
  note:'你只說了這一句。秘書把它整理成下面這張單子，團隊照著分工。',
  sections:[
   {h:'先講清楚要什麼',rows:[['目標','讓既有客人知道新品，並導到官網預購頁'],['讀者','已追蹤的熟客，不是第一次認識你的人'],['交付','3 篇貼文（文案＋圖片方向），上市前一週排好']]},
   {h:'誰接手、交回什麼',team:[['內容行銷專家','寫三篇的角度與文案','3 份草稿，每篇附一句「為什麼這樣寫」'],['SEO 專家','檢查預購頁找不找得到','頁面標題與描述的修改建議'],['成效分析專家','先定好「怎樣算有效」','上市後兩週要看的 2 個數字']]},
   {h:'留給你決定',checks:['三篇的順序：先講功能、先講使用情境，還是先講優惠？','要不要加一點廣告？金額由你核准，沒點頭就不花。']}
  ],
  foot:'第 1 週交草稿 → 第 2 週你確認 → 上市前一週排程'
 }
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plain={
 roster:'角色名冊：秘書（幕僚長）交回一份待決清單，附首選、理由與代價；SEO 專家交回問題依據與修改的優先順序；內容行銷專家交回有明確讀者與下一步的內容草稿；廣告投放專家交回測試假設、素材方向與停止條件；成效分析專家交回分開事實、推論與缺口的分析摘要。',
 review:'示範報告節錄（決策摘要）：這週只需要先決定一件事——先改善首頁入口，還是先增加發文數量。首選是先釐清首頁入口，因為新內容把人帶進來後才有清楚的下一步。代價是本週社群產量可能較少；若客人完全不經過網站，排序要重新評估。決策後記錄改動日期，觀察入口點擊與後續詢問。'
};
export function artifactText(key){
 if(plain[key]){const el=document.createElement('p');el.className='room-artifact-sr';el.textContent=plain[key];return el;}
 const a=artifacts[key];if(!a)return null;
 const el=document.createElement('section');el.className='room-artifact-sr';el.setAttribute('aria-label',a.tag);
 el.innerHTML=`<h3>${esc(a.tag)}：你說「${esc(a.title)}」</h3><p>${esc(a.note)}</p>${a.sections.map(s=>`<h4>${esc(s.h)}</h4><ul>${(s.rows||[]).map(([k,v])=>`<li>${esc(k)}：${esc(v)}</li>`).join('')}${(s.team||[]).map(([w,x,b])=>`<li>${esc(w)}：${esc(x)}；交回${esc(b)}</li>`).join('')}${(s.checks||[]).map(c=>`<li>待你決定：${esc(c)}</li>`).join('')}</ul>`).join('')}<p>${esc(a.foot)}</p>`;
 return el;
}
