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
    if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',open:false,value:'',style:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){focused=id},querySelector(){return null},querySelectorAll(){return []}});
    return nodes.get(id);
  }
  const app=node('app'),modal=node('modal');node('toast');
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
  await click({nav:'library'});await click({detail:'v-学校'});
  assert.equal(modal.open,true);assert.ok(classes.has('modal-open'));assert.match(modal.innerHTML,/Word explorer/);
  await click({action:'close'});assert.equal(modal.open,false);assert.ok(!classes.has('modal-open'));
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
