import {TEST_CATEGORIES,materialCategory} from './assessment.js';
import {mistakeEntries,skillLabel,updateMistake} from './mistakes.js';

export function createLearningPages({getProfile,getItems,getGrammar,esc,jp,icon,pageHeading,modal,head,examplesHTML,record,persist,render,navigate,practiceMistakes,practiceSkill=()=>{}}){
  let owner=null,level='5',search='',page=0,mistakePage=0;
  const ensureOwner=()=>{if(owner!==getProfile().id){owner=getProfile().id;level='5';search='';page=0;mistakePage=0}};
  const grammarItems=()=>getGrammar().filter(item=>(level==='all'||item.jlpt===Number(level))&&[item.char,item.roman,...item.meanings,item.formation,item.notes,...item.tags].some(text=>String(text).toLowerCase().includes(search.toLowerCase().trim())));
  const pagination=(current,total,attribute)=>total>1?`<div class="pagination"><button class="secondary" ${attribute}="-1" ${current===0?'disabled':''}>Previous</button><span>${current+1} of ${total}</span><button class="secondary" ${attribute}="1" ${current===total-1?'disabled':''}>Next</button></div>`:'';

  function grammarResults(){
    const list=grammarItems(),total=Math.ceil(list.length/18);page=Math.max(0,Math.min(page,total-1));
    return `<p class="count-label">${list.length} grammar points · levels are unofficial study estimates.</p><div class="grammar-grid">${list.slice(page*18,(page+1)*18).map(item=>`<button class="panel grammar-card" data-detail="${esc(item.id)}"><span class="grammar-card-top"><span class="tag">Est. N${item.jlpt}</span>${getProfile().cards['flash:'+item.id]?.reviews?'<span class="grammar-studied">Studied</span>':''}</span><span class="grammar-pattern" lang="ja">${esc(item.char)}</span><span class="grammar-meaning">${esc(item.meanings[0])}</span><span class="small muted">Formation, examples & notes ${icon('chevron')}</span></button>`).join('')}</div>${!list.length?'<div class="empty">No grammar matches. Try another level or search.</div>':''}${pagination(page,total,'data-grammar-page')}`;
  }
  function grammarView(){
    ensureOwner();
    const studied=getGrammar().filter(item=>getProfile().cards['flash:'+item.id]?.reviews).length;
    return `${pageHeading('Grammar lessons','Grammar lessons, formation rules, and examples from N5 to N1.')}<div class="notice green">${getGrammar().length} lessons included · ${studied} studied. Read a lesson, add it to your reviews, then test your recall.</div><div class="level-filters" aria-label="Grammar level">${[['all','All levels'],...[5,4,3,2,1].map(n=>[String(n),'N'+n])].map(([value,label])=>`<button data-grammar-level="${value}" class="${level===value?'active':''}" aria-pressed="${level===value}">${label}</button>`).join('')}</div><div class="toolbar"><div class="searchbox">${icon('search')}<input id="grammar-search" value="${esc(search)}" placeholder="Search a pattern, meaning, or formation…" aria-label="Search grammar"></div></div><div id="grammar-results">${grammarResults()}</div>`;
  }
  function openGrammar(id){
    const item=getGrammar().find(item=>item.id===id);if(!item)return;
    const studied=!!getProfile().cards['flash:'+id]?.reviews;
    modal(`${head('Grammar explorer',`Estimated JLPT N${item.jlpt}`)}<div class="modal-body grammar-lesson"><span class="tag">Est. N${item.jlpt}</span><h3 class="grammar-pattern" lang="ja">${esc(item.char)}</h3><p class="grammar-definition">${esc(item.meanings[0])}</p><section class="grammar-formation"><h3>How to form it</h3><p>${esc(item.formation)}</p></section>${item.notes?`<section class="grammar-notes"><h3>Usage & things to notice</h3><p>${esc(item.notes)}</p></section>`:''}${examplesHTML(item)}<div class="button-row"><button class="primary" data-grammar-studied="${esc(id)}" ${studied?'disabled':''}>${studied?'Added to your reviews':'Mark studied & add to reviews'} ${icon('check')}</button><button class="secondary" data-single="${esc(id)}" data-mode="flash">Practice recall ${icon('cards')}</button></div><p class="small muted">Marking a lesson studied makes it available in Test yourself. Practice recall to rate your memory and schedule the next review.</p><p class="usage-source">OpenJLPT contributors · <a href="./data/OPENJLPT-LICENSE.txt" target="_blank">CC BY-SA 4.0</a> · <a href="./data/grammar-meta.json" target="_blank">Dataset details</a></p></div>`);
  }
  function mistakesView(){
    ensureOwner();
    const profile=getProfile(),list=mistakeEntries(profile,getItems()),total=Math.ceil(list.length/24);mistakePage=Math.max(0,Math.min(mistakePage,total-1));
    return `${pageHeading('Mistake notebook','Retry the exact skill, sentence, or conjugation form that needs practice.')}<div class="notice">Answering a meaning does not clear a て-form or listening mistake. Each skill is tracked separately. Older general-recall entries are kept until you retry or remove them.</div><section class="panel notebook-summary"><div><h2>${list.length} skill${list.length===1?'':'s'} to revisit</h2><p class="small muted">Saved for ${esc(profile.name)}. Newest mistakes first.</p></div><button class="primary" data-notebook-practice="true" ${!list.length?'disabled':''}>Start mixed practice ${icon('arrow')}</button></section>${list.length?`<div class="notebook-list">${list.slice(mistakePage*24,(mistakePage+1)*24).map(({item,skill,count,last})=>`<article class="panel notebook-item"><div class="notebook-item-copy"><span class="tag">${esc(skillLabel(skill))}</span><button class="notebook-word" data-detail="${esc(item.id)}" lang="ja">${esc(item.char)}</button>${item.reading?`<p lang="ja" class="small muted">${esc(item.reading)}</p>`:''}<p>${esc(item.meanings.slice(0,2).join('; '))}</p><small class="muted">${esc(item.kind==='passage'?'Graded reading':TEST_CATEGORIES[materialCategory(item)])}${item.jlpt?' · Est. N'+item.jlpt:''} · ${count} mistake${count===1?'':'s'} · ${esc(new Date(last).toLocaleDateString('en',{month:'short',day:'numeric'}))}</small></div><div class="button-row"><button class="secondary" data-notebook-skill="${esc(skill)}" data-notebook-item="${esc(item.id)}">Retry this skill</button><button class="ghost" data-notebook-clear="${esc(item.id)}" data-notebook-clear-skill="${esc(skill)}" aria-label="Remove ${esc(skillLabel(skill))} mistake for ${esc(item.char)}">Remove</button></div></article>`).join('')}</div>${pagination(mistakePage,total,'data-notebook-page')}`:'<div class="panel empty"><h2>No unresolved mistakes</h2><p>Incorrect answers and practice ratings of Again will appear here.</p><button class="secondary" data-nav="test">Test yourself</button></div>'}`;
  }
  function handleInput(element){
    if(element.id!=='grammar-search')return false;
    search=element.value;page=0;document.querySelector('#grammar-results').innerHTML=grammarResults();return true;
  }
  function handleClick(dataset){
    ensureOwner();
    if(dataset.grammarLevel){level=['all','1','2','3','4','5'].includes(dataset.grammarLevel)?dataset.grammarLevel:'5';page=0;search='';navigate('grammar');return true}
    if(dataset.grammarPage){page+=Number(dataset.grammarPage);render();document.querySelector('#grammar-search')?.focus();return true}
    if(dataset.grammarStudied){const item=getGrammar().find(item=>item.id===dataset.grammarStudied);if(item&&!getProfile().cards['flash:'+item.id]?.reviews){record('flash',item,4,false);openGrammar(item.id)}return true}
    if(dataset.notebookSkill){practiceSkill(dataset.notebookItem,dataset.notebookSkill);return true}
    if(dataset.notebookClear){if(dataset.notebookClearSkill)updateMistake(getProfile(),dataset.notebookClear,true,'test',Date.now(),dataset.notebookClearSkill);else delete getProfile().mistakes[dataset.notebookClear];persist();render();return true}
    if(dataset.notebookPage){mistakePage+=Number(dataset.notebookPage);render();return true}
    if(dataset.notebookPractice){practiceMistakes();return true}
    return false;
  }
  return {grammarView,mistakesView,openGrammar,handleClick,handleInput};
}
