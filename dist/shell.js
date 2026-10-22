export const ROUTE_TITLES={home:'Study',learn:'Learning path',library:'Library',review:'Daily reviews',test:'Test yourself',more:'More',grammar:'Grammar lessons',mistakes:'Mistake notebook',progress:'Progress',settings:'Settings & learners'};
export const PHONE_TABS=[['home','home','Study'],['review','review','Reviews'],['library','grid','Library'],['test','target','Tests'],['more','menu','More']];
export function resolveRoute(value){const route=String(value||'').replace(/^#/,'');return Object.hasOwn(ROUTE_TITLES,route)?route:'home'}
export function activePhoneTab(value){const route=resolveRoute(value);return route==='learn'?'home':['grammar','mistakes','progress','settings'].includes(route)?'more':route}

export function shellHTML({view,learner,due,streak,online,storageOK,content,esc,icon}){
  const route=resolveRoute(view),active=activePhoneTab(route);
  const desktop=[['home','home','Study'],['learn','book','Learning path'],['review','review','Daily reviews'],['library','grid','Library'],['test','target','Test yourself'],['grammar','text','Grammar lessons'],['mistakes','book','Mistake notebook'],['progress','chart','Progress']];
  const badge=due?`<span class="badge">${due>99?'99+':due}</span>`:'';
  const profileButton=`<button class="avatar" data-action="profiles" aria-label="Switch learner">${esc(learner.name.slice(0,1).toUpperCase())}</button>`;
  return `<button class="skip-link" data-action="focus-main">Skip to content</button><div class="layout">
    <aside class="sidebar"><div class="brand"><span class="brand-mark" lang="ja">道</span><span><strong>Kanji Path</strong><small>Japanese study</small></span></div>
    <nav class="nav" aria-label="Desktop navigation">${desktop.map(([id,glyph,title])=>`<button data-nav="${id}" class="${route===id?'active':''}" ${route===id?'aria-current="page"':''}>${icon(glyph)}<span>${title}</span>${id==='review'?badge:''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><nav class="nav"><button data-nav="settings" class="${route==='settings'?'active':''}" ${route==='settings'?'aria-current="page"':''}>${icon('settings')}Settings & learners</button></nav><button class="profile" data-action="profiles"><span class="avatar">${esc(learner.name.slice(0,1).toUpperCase())}</span><span>${esc(learner.name)}<small>Switch learner</small></span>${icon('chevron')}</button></div></aside>
    <main class="main" id="main-content" tabindex="-1"><header class="topbar"><div class="mobile-brand"><span class="brand-mark" lang="ja">道</span><strong>Kanji Path</strong></div><div class="crumb">${ROUTE_TITLES[route]}</div><div class="top-actions"><span class="status-dot">${online?'Saved on this device':'Offline'}</span><span class="streak">${icon('flame')}${streak} day${streak===1?'':'s'}</span>${profileButton}</div></header>
    <div class="page">${!storageOK?'<div class="notice" role="alert">Browser storage is unavailable. Export your progress in Settings before leaving.</div>':''}${content}<footer class="footer"><span>Progress is stored on this device.</span><button data-action="sources">Data & credits ${icon('chevron')}</button></footer></div></main>
    <nav class="bottom-nav" aria-label="Phone navigation">${PHONE_TABS.map(([id,glyph,title])=>`<button data-nav="${id}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''} ${id==='review'&&due?`aria-label="Reviews, ${due} due"`:''}><span class="bottom-nav-icon">${icon(glyph)}${id==='review'?badge:''}</span><span>${title}</span></button>`).join('')}</nav>
  </div>`;
}
