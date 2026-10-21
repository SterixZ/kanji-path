import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildKnowledgeTest,gradeKnowledgeTest,isCorrectAnswer,studiedMaterials} from '../dist/assessment.js';
import {updateMistake,validateMistakes,migrateMistakes,mistakeItems} from '../dist/mistakes.js';
import {validateBackup,schedule,canWrite,furiganaTokens} from '../dist/core.js';
import {createTestPage} from '../dist/test-page.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url),'utf8'));
const grammar=read('grammar'),all=['kanji','kana','vocab','sentences'].flatMap(read).concat(grammar);
const strokes=read('strokes');
const ids=new Set(all.map(item=>item.id)),reviewed={reviews:1};
const word={id:'word',kind:'vocab',char:'学校',reading:'がっこう',otherReadings:['ガクコウ'],meanings:['school','academy'],jlpt:5};

test('grammar snapshot has all five levels, unique stable IDs, formation rules and attributed examples',()=>{
  assert.equal(grammar.length,526);assert.equal(ids.size,all.length);
  assert.deepEqual([5,4,3,2,1].map(n=>grammar.filter(g=>g.jlpt===n).length),[81,98,101,123,123]);
  for(const g of grammar){
    assert.ok(g.id.startsWith('g-n'+g.jlpt+'-'));assert.equal(g.kind,'grammar');
    assert.ok(g.char&&g.meanings.length&&g.formation&&g.examples.length>=2);assert.equal(g.source,'OpenJLPT');
    assert.equal(canWrite(g,strokes),false);
    for(const e of g.examples){assert.ok(e.ja&&e.en);if(e.furigana)assert.equal(furiganaTokens(e.furigana).map(t=>t.text).join(''),e.ja)}
  }
});

test('typed word readings support kana variants and alternate readings without leaking the answer',()=>{
  const [q]=buildKnowledgeTest({'flash:word':reviewed},[word],{format:'typed'},()=>.8);
  assert.equal(q.type,'reading');assert.equal(q.reading,'');assert.equal(q.hint,'');assert.deepEqual(q.options,[]);
  for(const text of ['がっこう','ガッコウ',' がっこう ','ガクコウ'])assert.ok(isCorrectAnswer(q,{text}),text);
  for(const text of ['gakkou','がっこ','school',''])assert.equal(isCorrectAnswer(q,{text}),false,text);
  assert.equal(isCorrectAnswer(q,{choice:'skip'}),false);
});

test('typed meanings accept a bundled gloss and normalize case, punctuation and infinitive markers',()=>{
  const [q]=buildKnowledgeTest({'flash:word':reviewed},[word],{format:'typed',vocabTask:'meaning'});
  for(const text of ['School',' academy. ','SCHOOL'])assert.ok(isCorrectAnswer(q,{text}));
  assert.equal(isCorrectAnswer(q,{text:'education'}),false);
  const verb={...word,id:'eat',meanings:['to eat (a meal)']};
  const [v]=buildKnowledgeTest({'flash:eat':reviewed},[verb],{format:'typed',vocabTask:'meaning'});
  assert.ok(isCorrectAnswer(v,{text:'eat'}));
});

test('typed tests support kanji, kana and sentence targets and exclude grammar',()=>{
  const choices=[all.find(i=>i.id==='水'),all.find(i=>i.id==='し'),all.find(i=>i.id==='s-0'),grammar[0]];
  const cards=Object.fromEntries(choices.map(i=>['flash:'+i.id,reviewed]));
  const questions=buildKnowledgeTest(cards,choices,{format:'typed'},()=>.8);
  assert.equal(questions.length,3);assert.ok(!questions.some(q=>q.itemId===grammar[0].id));
  const kana=questions.find(q=>q.itemId==='し');assert.ok(isCorrectAnswer(kana,{text:'shi'}));assert.ok(isCorrectAnswer(kana,{text:'si'}));
  const cloze=questions.find(q=>q.type==='cloze');assert.ok(cloze.prompt.includes('＿＿＿'));assert.ok(isCorrectAnswer(cloze,{text:cloze.answer}));
  const answers=questions.map(q=>({questionId:q.id,text:q.answer}));assert.equal(gradeKnowledgeTest(questions,answers).percent,100);
  assert.equal(gradeKnowledgeTest(questions,[{questionId:questions[0].id,text:'wrong'},...answers]).correct,2,'first submission wins');
});

test('grammar becomes testable only after study; mistake filters constrain question targets',()=>{
  const cards={['flash:'+grammar[0].id]:reviewed};
  assert.equal(studiedMaterials(cards,all,{category:'grammar'}).length,1);
  assert.equal(buildKnowledgeTest({},all,{category:'grammar'}).length,0);
  const [q]=buildKnowledgeTest(cards,all,{category:'grammar'});
  assert.equal(q.itemId,grammar[0].id);assert.equal(q.type,'meaning');assert.equal(q.options.length,4);
  const mixed={...cards,'flash:水':reviewed};
  const filtered=buildKnowledgeTest(mixed,all,{itemIds:['水']});
  assert.deepEqual(filtered.map(q=>q.itemId),['水']);
  assert.deepEqual(buildKnowledgeTest({},all,{itemIds:['水','unknown']}).map(q=>q.itemId),['水'],'retained notebook history can outlive a review card');
  assert.equal(canWrite({...grammar[0],char:'日'},strokes),false);
});

test('mistakes count repeated failures, sort newest first, and clear on success without affecting another learner',()=>{
  const a={mistakes:{}},b={mistakes:{}};
  updateMistake(a,'水',false,'test',1);updateMistake(a,'水',false,'practice',2);updateMistake(a,'日',false,'test',3);
  assert.equal(a.mistakes['水'].count,2);assert.equal(a.mistakes['水'].source,'practice');
  assert.deepEqual(mistakeItems(a,all).map(i=>i.id),['日','水']);assert.deepEqual(b.mistakes,{});
  updateMistake(a,'水',true);assert.equal(a.mistakes['水'],undefined);assert.ok(a.mistakes['日']);
});

test('old backups migrate unresolved failures; explicit notebook state and grammar progress round-trip',()=>{
  const history=[{key:'flash:水',rating:0,at:2},{key:'flash:日',rating:0,at:1},{key:'listen:日',rating:4,at:3},{key:'flash:unknown',rating:0,at:4}];
  assert.deepEqual(Object.keys(migrateMistakes({history},ids)),['水']);
  assert.deepEqual(migrateMistakes({history,mistakes:{}},ids),{});
  const bad={水:{count:0,last:1,source:'test'},日:{count:1,last:Infinity,source:'test'},unknown:{count:1,last:1,source:'test'}};
  assert.deepEqual(validateMistakes(bad,ids),{});
  const card=schedule({},4,0),mistakes={水:{count:2,last:10,source:'test'}};
  const backup={version:1,profiles:[{id:'a',name:'A',cards:{['flash:'+grammar[0].id]:card},history,tests:[],mistakes},{id:'b',name:'B',cards:{},history:[]}]};
  const restored=validateBackup(backup,ids);assert.deepEqual(restored[0].mistakes,mistakes);assert.deepEqual(restored[0].cards,backup.profiles[0].cards);assert.deepEqual(restored[1].mistakes,{});
});

test('quiz UI saves mistakes immediately, ignores duplicate answers, scores typed answers and isolates learners',()=>{
  globalThis.document={querySelector:()=>null};globalThis.window={scrollTo:()=>{}};
  let active={id:'a',name:'A',cards:{'flash:word':reviewed},tests:[],mistakes:{}},saves=0;
  const page=createTestPage({getProfile:()=>active,getItems:()=>[word],esc:String,jp:String,icon:()=>'',pageHeading:()=>'',persist:()=>saves++,render:()=>{},navigate:()=>{}});
  page.handleChange({id:'test-format',value:'typed'});page.handleClick({testAction:'start'});
  const submit=text=>page.handleSubmit({id:'typed-answer-form',querySelector:()=>({value:text})},{preventDefault(){}});
  submit('wrong');submit('がっこう');assert.equal(active.mistakes.word.count,1);assert.equal(saves,1);
  page.handleClick({testAction:'next'});assert.equal(active.tests[0].correct,0);assert.equal(active.tests[0].total,1);
  page.handleClick({testAction:'retry'});submit('ガッコウ');page.handleClick({testAction:'next'});
  assert.equal(active.tests[1].correct,1);assert.deepEqual(active.mistakes,{});
  active={id:'b',name:'B',cards:{},tests:[],mistakes:{}};
  assert.match(page.view(),/Complete a lesson/);assert.deepEqual(active.tests,[]);
});
