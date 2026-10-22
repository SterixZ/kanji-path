// Exercise actual app rendering and event wiring without a browser, network,
// installed voices, or access to any real learner's localStorage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {schedule} from '../dist/core.js';

test('the app opens More, retains old progress, and connects navigation, dialogs and all test modes',async()=>{
  const events=new Map(),windowEvents=new Map(),nodes=new Map();let focused='';
  const classes=new Set();
  function node(id){
    if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',open:false,value:'',style:{},classList:{add(){},remove(){}},listeners:new Map(),addEventListener(name,fn){this.listeners.set(name,fn)},showModal(){this.open=true},close(){this.open=false},focus(){focused=id},querySelector(){return null},querySelectorAll(){return []}});
    return nodes.get(id);
  }
  const app=node('app'),modal=node('modal'),confirmation=node('session-exit');node('toast');
  const find=selector=>{
    if(selector==='.page-heading h1')return node('heading');
    if(selector.startsWith('#')){
      const id=selector.slice(1).split(/[:\s]/)[0];
      return nodes.has(id)||app.innerHTML.includes(`id="${id}"`)?node(id):null;
    }
    return null;
  };
  globalThis.document={querySelector:find,querySelectorAll:()=>[],body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},addEventListener:(name,fn)=>events.set(name,fn)};
  globalThis.location={hash:'#more'};
  globalThis.window={addEventListener:(name,fn)=>windowEvents.set(name,fn),scrollTo(){},speechSynthesis:{getVoices:()=>[{lang:'ja-JP',name:'Test voice',voiceURI:'test',localService:true}],addEventListener(){},cancel(){},speak(utterance){window.lastSpeech=utterance}}};
  globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  const card=schedule({},4,0),original={id:'original',name:'Existing learner',cards:{'flash:日':card},history:[],tests:[{at:1,total:3,correct:2,category:'reading',level:'5'}],mistakes:{},goal:10,created:1};
  const storage=new Map([['kanji-path-v1',JSON.stringify({version:1,active:'original',profiles:[original],lenient:true,speed:.8,voice:''})]]);
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../dist/'+String(url).replace(/^\.\//,''),import.meta.url),'utf8'))});
  await import('../dist/app.js');
  for(let attempt=0;attempt<100&&!app.innerHTML.includes('Study tools, progress, and settings.');attempt++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.match(app.innerHTML,/Study tools, progress, and settings\./);
  const click=dataset=>events.get('click')({target:{closest:()=>({dataset,disabled:false})}});
  for(const [view,title] of [['home','Study'],['learn','Learning path'],['library','Library'],['review','Daily reviews'],['grammar','Grammar lessons'],['mistakes','Mistake notebook'],['progress','Progress'],['settings','Settings & learners'],['more','More']]){
    await click({nav:view});assert.equal(location.hash,view);
    assert.ok(app.innerHTML.includes(`<h1 tabindex="-1">${title.replaceAll('&','&amp;')}</h1>`),view);
    assert.equal(focused,'heading');
  }
  await click({nav:'library'});
  const kanji=JSON.parse(await fs.readFile(new URL('../dist/data/kanji.json',import.meta.url),'utf8'));
  assert.match(app.innerHTML,/aria-label="Kanji levels"/);
  const expectedLevels=['all','n5','n4','n3','n2','n1'];
  assert.deepEqual([...app.innerHTML.matchAll(/data-library-level="([^"]+)"/g)].map(match=>match[1]),expectedLevels);
  for(const n of [5,4,3,2,1]){
    await click({libraryLevel:'n'+n});
    assert.ok(app.innerHTML.includes(`data-library-level="n${n}" aria-pressed="true"`));
    assert.ok(app.innerHTML.includes(`<option value="n${n}" selected`),'dropdown follows level button');
    const results=node('library-results').innerHTML;
    assert.ok(results.includes(`${kanji.filter(k=>k.jlpt===n).length.toLocaleString()} kanji`));
    for(const [,id] of results.matchAll(/data-detail="([^"]+)"/g))assert.equal(kanji.find(k=>k.id===id)?.jlpt,n);
  }
  await events.get('change')({target:{id:'library-filter',value:'g1'}});
  assert.ok(!app.innerHTML.includes('aria-pressed="true"'),'school grades do not highlight a JLPT level');
  assert.ok(app.innerHTML.includes('<option value="g1" selected'));
  await events.get('change')({target:{id:'library-filter',value:'n5'}});
  assert.ok(app.innerHTML.includes('data-library-level="n5" aria-pressed="true"'),'level buttons follow dropdown');
  await click({libraryLevel:'all'});
  assert.ok(node('library-results').innerHTML.includes(`${kanji.length.toLocaleString()} kanji`),'All kanji includes ungraded characters');
  await click({tab:'vocab'});
  assert.match(app.innerHTML,/aria-label="Vocabulary levels"/);
  await click({libraryLevel:'n4'});
  assert.ok(app.innerHTML.includes('data-library-level="n4" aria-pressed="true"'));
  assert.match(node('library-results').innerHTML,/Est\. N4/);
  await click({detail:'v-学校'});
  assert.equal(modal.open,true);assert.ok(classes.has('modal-open'));assert.match(modal.innerHTML,/Word explorer/);
  await click({action:'close'});assert.equal(modal.open,false);assert.ok(!classes.has('modal-open'));
  await click({action:'start-lesson'});
  await click({action:'next-step'});
  const lessonHTML=modal.innerHTML;modal.scrollTop=180;
  await click({action:'exit-session'});
  assert.equal(confirmation.open,true);assert.equal(modal.open,true);
  assert.equal(modal.innerHTML,lessonHTML);assert.equal(modal.scrollTop,180,'confirmation does not move the lesson');
  await click({action:'resume-session'});
  assert.equal(confirmation.open,false);assert.equal(modal.innerHTML,lessonHTML);
  await click({action:'exit-session'});
  let cancelled=false;confirmation.listeners.get('cancel')({preventDefault(){cancelled=true}});
  assert.equal(cancelled,true);assert.equal(confirmation.open,false);assert.equal(modal.open,true,'Escape resumes the lesson');
  await click({action:'exit-session'});await click({action:'finish-session'});
  assert.equal(confirmation.open,false);assert.equal(modal.open,false);assert.ok(!classes.has('modal-open'));
  await click({nav:'home'});assert.match(app.innerHTML,/data-daily-mixed/);
  await click({dailyMixed:'true'});assert.equal(location.hash,'test');assert.match(app.innerHTML,/Daily mixed session/);
  await click({languageAction:'exit'});
  await click({nav:'progress'});assert.match(app.innerHTML,/Progress by level &amp; skill|Progress by level & skill/);
  await click({progressLevel:'1'});assert.ok(app.innerHTML.includes('data-progress-level="1" aria-pressed="true"'));
  await click({nav:'test'});
  for(const mode of ['conjugation','reading','dictation','knowledge']){
    await click({testKind:mode});assert.ok(app.innerHTML.includes(`data-test-kind="${mode}" class="active"`),mode);
  }
  await click({testKind:'dictation'});await click({languageAction:'start'});
  assert.match(app.innerHTML,/Play the sentence to unlock the answer box/);
  await click({languageAction:'listen'});
  assert.ok(window.lastSpeech?.text);assert.ok(!app.innerHTML.includes(window.lastSpeech.text),'transcript stays hidden while listening');
  window.lastSpeech.onend();
  assert.match(app.innerHTML,/Type what you heard/);assert.ok(!app.innerHTML.includes(window.lastSpeech.text),'transcript stays hidden before submission');
  await click({nav:'more'});
  const persisted=JSON.parse(storage.get('kanji-path-v1'));
  assert.equal(storage.size,1);assert.equal(persisted.active,original.id);assert.equal(persisted.profiles[0].name,original.name);
  assert.deepEqual(persisted.profiles[0].cards,original.cards);assert.deepEqual(persisted.profiles[0].tests,original.tests);assert.deepEqual(persisted.profiles[0].history,[]);
});
