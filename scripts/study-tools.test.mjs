import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {updateMistake,questionSkill,mistakeEntries,validateMistakes} from '../dist/mistakes.js';
import {alignCorrection,correctionFor,correctionHTML} from '../dist/corrections.js';
import {recordAttempt,progressByLevel} from '../dist/progress.js';
import {buildMixedSession,mistakeQuestion,listeningQuestion} from '../dist/mixed-session.js';
import {createReadAlong,passageSentences} from '../dist/shadowing.js';
import {createLanguageTestPage} from '../dist/language-test-page.js';
import {createTestPage} from '../dist/test-page.js';
import {validateBackup,schedule} from '../dist/core.js';
import {buildConjugationTest,dictationSentences} from '../dist/language-tests.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const words=read('vocab'),reading=read('reading'),items=['kanji','kana','vocab','sentences','grammar'].flatMap(read),ids=new Set(items.map(i=>i.id));
const material={classes:read('conjugation').classes,reading,strokes:read('strokes')},eat=words.find(w=>w.char==='食べる');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profile=()=>({id:'a',name:'A',cards:{},history:[],tests:[],mistakes:{},attempts:[]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function browserMocks(){globalThis.document={querySelector:()=>null};globalThis.window={scrollTo(){}}}

test('a meaning answer cannot erase conjugation forms, listening or exact-sentence mistakes',()=>{
 const p=profile();updateMistake(p,eat.id,false,'test',1,'conjugation:te');updateMistake(p,eat.id,false,'test',2,'conjugation:past');updateMistake(p,eat.id,false,'test',3,'listening');
 updateMistake(p,eat.id,true,'test',4,'meaning');assert.equal(mistakeEntries(p,items).length,3);
 updateMistake(p,eat.id,true,'test',5,'conjugation:te');assert.equal(mistakeEntries(p,items).length,2);assert.ok(p.mistakes[eat.id].skills['conjugation:past']);
 const old={...p.mistakes[eat.id]};updateMistake(p,eat.id,false,'test',6,'made-up');assert.deepEqual(p.mistakes[eat.id],old);
 const [restored]=validateBackup({version:1,profiles:[p]},ids);assert.deepEqual(restored.mistakes,p.mistakes);
 const bad=structuredClone(p.mistakes);bad[eat.id].skills['__bad__']={count:1,last:1,source:'test'};assert.ok(!validateMistakes(bad,ids)[eat.id].skills.__bad__);
});

test('notebook retries recover the precise verb form and sentence independently of pool order',()=>{
 const p=profile(),q=mistakeQuestion({item:eat,skill:'conjugation:te'},p,items,material,()=>.8);assert.equal(q.form,'te');assert.equal(q.answer,'たべて');
 const sentences=dictationSentences({},words,{level:'5'}),original=sentences[0],item=items.find(i=>i.id===original.itemId),skill=questionSkill(original);
 const recovered=mistakeQuestion({item,skill},p,[...items].reverse(),material);assert.equal(recovered.answer,original.answer);assert.equal(questionSkill(recovered),skill);
 const different=sentences.find(s=>s.itemId===original.itemId&&s.answer!==original.answer);if(different)assert.notEqual(questionSkill(different),skill);
});

test('corrections show missing kana, changed particles, extra text and wrong endings with safe markup',()=>{
 assert.ok(alignCorrection('おばさん','おばあさん').edits.some(e=>e.type==='missing'&&e.expected==='あ'));
 assert.ok(alignCorrection('わたしが','わたしは').edits.some(e=>e.type==='change'&&e.actual==='が'&&e.expected==='は'));
 assert.ok(alignCorrection('たべたよ','たべた').edits.some(e=>e.type==='extra'&&e.actual==='よ'));
 const q={answer:'食べて',acceptedAnswers:['食べて','たべて']};assert.equal(correctionFor(q,'たべた').expected,'たべて');assert.match(correctionHTML(q,{text:'たべた'},esc),/<del>た<\/del>/);assert.match(correctionHTML(q,{text:'たべた'},esc),/<mark>て<\/mark>/);
 assert.equal(alignCorrection('タベテ。','たべて').distance,0);
 const html=correctionHTML({answer:'<script>'},{text:'<img>'},esc);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img>'));
 assert.equal(correctionHTML(q,{choice:'skip'},esc),'');
});

test('daily mix combines due reviews, exact weak forms, listening and reading without mutating progress',()=>{
 const p=profile();p.cards['flash:'+eat.id]=schedule({},4,0);p.cards['write:日']=schedule({},4,0);updateMistake(p,eat.id,false,'test',1,'conjugation:te');
 const before=JSON.stringify(p),plan=buildMixedSession(p,items,material,{voice:true,now:Date.now()},()=>.8);
 assert.ok(plan.length<=8&&plan.length>=6);assert.ok(plan.some(q=>q.reviewMode==='flash'));assert.ok(!plan.some(q=>q.reviewMode==='write'));
 assert.ok(plan.some(q=>q.form==='te'&&q.itemId===eat.id));assert.ok(plan.some(q=>q.type==='listening'));assert.ok(plan.some(q=>q.passage));assert.equal(new Set(plan.map(q=>q.id)).size,plan.length);assert.equal(JSON.stringify(p),before);
 const offline=buildMixedSession(profile(),items,material,{voice:false},()=>.8);assert.ok(!offline.some(q=>['dictation','listening'].includes(q.type)));assert.ok(offline.some(q=>q.passage));
});

test('mixed-session UI saves one score, schedules each due card once and keeps audio answers gated',()=>{
 browserMocks();const p=profile();p.cards['flash:'+eat.id]=schedule({},4,0);let callbacks,reviews=0;
 const originalRandom=Math.random;Math.random=()=>.8;
 try{
  const expected=buildMixedSession(p,items,material,{voice:true},()=>.8);
  const page=createLanguageTestPage({getProfile:()=>p,getItems:()=>items,getMaterials:()=>material,esc,icon:()=>'',pageHeading:(t)=>t,persist(){},render(){},hasVoice:()=>true,speak:(text,opts)=>{callbacks=opts;return true},recordReview:()=>reviews++});
  page.startMixed();
  for(const q of expected){
   if(['dictation','listening'].includes(q.type)){page.handleClick({languageChoice:q.correctChoice||'skip'});assert.ok(!page.view().includes('Answer: <span'));page.handleClick({languageAction:'listen'});callbacks.onEnd()}
   if(q.format==='typed')page.handleSubmit({id:'language-answer-form',querySelector:()=>({value:q.answer})},{preventDefault(){}});else page.handleClick({languageChoice:q.correctChoice});
   page.handleClick({languageChoice:q.correctChoice||'skip'});page.handleClick({languageAction:'next'});
  }
  assert.equal(p.tests.length,1);assert.equal(p.tests[0].category,'mixed');assert.equal(p.tests[0].correct,expected.length);assert.equal(p.attempts.length,expected.length);assert.equal(reviews,expected.filter(q=>q.reviewMode).length);
  page.handleClick({languageAction:'next'});assert.equal(p.tests.length,1);
 }finally{Math.random=originalRandom}
});

test('knowledge UI success preserves a failed te-form and precise retry clears only that form',()=>{
 browserMocks();const p=profile();p.cards['flash:'+eat.id]={reviews:1};updateMistake(p,eat.id,false,'test',1,'conjugation:te');
 const page=createTestPage({getProfile:()=>p,getItems:()=>items,getMaterials:()=>material,esc,jp:esc,icon:()=>'',pageHeading:()=>'',persist(){},render(){},navigate(){},hasVoice:()=>true});
 page.handleChange({id:'test-format',value:'typed'});page.handleChange({id:'test-vocab-task',value:'meaning'});page.handleClick({testAction:'start'});
 page.handleSubmit({id:'typed-answer-form',querySelector:()=>({value:eat.meanings[0]})},{preventDefault(){}});assert.ok(p.mistakes[eat.id].skills['conjugation:te']);
 assert.equal(page.openMistakes(eat.id,'conjugation:te'),true);page.handleSubmit({id:'language-answer-form',querySelector:()=>({value:'たべて'})},{preventDefault(){}});assert.equal(p.mistakes[eat.id],undefined);
});

test('level progress keeps skill trends and backup attempts separate while rejecting malformed events',()=>{
 const p=profile();for(let i=0;i<20;i++)recordAttempt(p,{itemId:eat.id,category:'vocab',skill:'conjugation:te',level:5,correct:i>=10},i);
 recordAttempt(p,{itemId:eat.id,category:'vocab',skill:'meaning',level:4,correct:false},22);
 const n5=progressByLevel(p).find(g=>g.level===5);assert.equal(n5.skills.find(s=>s.skill==='conjugation').accuracy,100);assert.equal(n5.skills.find(s=>s.skill==='conjugation').trend,100);assert.equal(n5.skills.find(s=>s.skill==='vocab').answered,0);
 const [copy]=validateBackup({version:1,profiles:[p]},ids);assert.deepEqual(copy.attempts,p.attempts);
 p.attempts.push({...p.attempts[0],correct:'yes'}, {...p.attempts[0],itemId:'injected'}, {...p.attempts[0],at:Infinity});assert.equal(validateBackup({version:1,profiles:[p]},ids)[0].attempts.length,21);
 assert.deepEqual(validateBackup({version:1,profiles:[{...profile(),attempts:undefined}]},ids)[0].attempts,[]);
});

test('read-along uses complete sentence readings, sequences playback and ignores stale audio',()=>{
 const sentences=passageSentences(reading[0]);assert.ok(sentences.length>2);assert.ok(sentences.every(s=>!/[{}|\p{Script=Han}]/u.test(s.reading)));
 let callback,spoken=[],learner='a';const page=createReadAlong({speak:(text,opts)=>{spoken.push(text);callback=opts;return true},stopSpeech(){},hasVoice:()=>true,render(){},getOwner:()=>learner});
 page.setPassage(reading[0]);page.handleClick({shadow:'all'});callback.onEnd();assert.equal(spoken.length,2);assert.match(page.html(esc),/Sentence 2 of/);
 const stale=callback;page.dispose();stale.onEnd();assert.equal(spoken.length,2);
 page.setPassage(reading[0]);page.handleClick({shadow:'next'});page.handleClick({shadow:'all'});assert.equal(spoken.at(-1),sentences[0].reading);page.dispose();
});

test('recording starts only on request, stops tracks and revokes playback URLs on exit',async()=>{
 let requests=0,stops=0,created=0,revoked=0;
 class Recorder{constructor(){this.state='inactive';this.mimeType='audio/webm'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'])});queueMicrotask(()=>this.onstop?.())}}
 const env={navigator:{mediaDevices:{getUserMedia:async()=>{requests++;return {getTracks:()=>[{stop(){stops++}}]}}}},MediaRecorder:Recorder,URL:{createObjectURL(){created++;return 'blob:test'},revokeObjectURL(){revoked++}}};
 const page=createReadAlong({speak:()=>true,stopSpeech(){},hasVoice:()=>true,render(){},getOwner:()=> 'a',env});page.setPassage(reading[0]);assert.equal(requests,0);
 page.handleClick({shadow:'record'});await tick();assert.equal(requests,1);assert.match(page.html(esc),/Stop recording/);page.handleClick({shadow:'record'});await tick();assert.equal(stops,1);assert.equal(created,1);assert.match(page.html(esc),/<audio controls/);page.dispose();assert.equal(revoked,1);
});

test('leaving during a microphone prompt and denied permissions do not leak streams or recordings',async()=>{
 let resolvePermission,stops=0;const env={navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>resolvePermission=resolve)}},MediaRecorder:class{},URL:{revokeObjectURL(){},createObjectURL(){throw Error('unexpected recording')}}};
 const page=createReadAlong({speak:()=>true,stopSpeech(){},hasVoice:()=>true,render(){},getOwner:()=> 'a',env});page.setPassage(reading[0]);page.handleClick({shadow:'record'});page.dispose();resolvePermission({getTracks:()=>[{stop(){stops++}}]});await tick();assert.equal(stops,1);
 env.navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'})};page.setPassage(reading[0]);page.handleClick({shadow:'record'});await tick();assert.match(page.html(esc),/permission was not granted/);page.dispose();
});

test('every level includes new dialogue, notice or message and article content, all cached offline',()=>{
 for(const level of [5,4,3,2,1]){const passages=reading.filter(p=>p.level===level);assert.equal(passages.length,5);assert.ok(passages.some(p=>p.genre==='Dialogue'));assert.ok(passages.some(p=>['Message','Notice'].includes(p.genre)));assert.ok(passages.some(p=>/article/i.test(p.genre||'')))}
 const sw=fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');for(const name of ['progress.js','corrections.js','mixed-session.js','shadowing.js'])assert.ok(sw.includes(`'./${name}'`));
});


test('reading-comprehension mistakes retry the same question and survive backups',()=>{
 browserMocks();const p=profile(),passage=reading[0],virtual={id:passage.id,char:passage.title,kind:'passage',jlpt:passage.level,meanings:['Reading comprehension']},pool=[...items,virtual];
 const page=createLanguageTestPage({getProfile:()=>p,getItems:()=>pool,getMaterials:()=>material,esc,icon:()=>'',pageHeading:()=>'',persist(){},render(){}});
 page.setMode('reading');page.view();page.handleClick({languageAction:'start'});page.handleClick({languageChoice:'skip'});
 assert.ok(p.mistakes[passage.id].skills['comprehension:0']);
 updateMistake(p,passage.id,false,'test',2,'comprehension:1');
 assert.equal(page.openMistake(passage.id,'comprehension:0'),true);page.handleClick({languageChoice:'answer-0'});
 assert.ok(!p.mistakes[passage.id].skills['comprehension:0']);assert.ok(p.mistakes[passage.id].skills['comprehension:1']);
 const copy=validateBackup({version:1,profiles:[p]},new Set([...ids,passage.id]))[0];assert.deepEqual(copy.mistakes,p.mistakes);
 assert.equal(mistakeQuestion({item:virtual,skill:'comprehension:1'},p,pool,material).title,passage.questions[1].prompt);
});

test('listening choices cannot mark an identical pronunciation as a wrong answer',()=>{
 const target={id:'a',kind:'vocab',char:'橋',reading:'はし',meanings:['bridge'],jlpt:5},homophone={...target,id:'b',char:'箸',meanings:['chopsticks']},other={...target,id:'c',char:'猫',reading:'ねこ',meanings:['cat']};
 const q=listeningQuestion(target,[target,homophone,other],()=>.8);assert.ok(q);assert.equal(q.options.length,2);assert.ok(!q.options.some(o=>o.text==='箸'));
});
