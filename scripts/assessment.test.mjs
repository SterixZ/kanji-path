import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {studiedMaterials,buildKnowledgeTest,gradeKnowledgeTest,validateTestHistory} from '../dist/assessment.js';
import {validateBackup,schedule} from '../dist/core.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const items=['kanji','kana','vocab','sentences'].flatMap(read),find=id=>items.find(item=>item.id===id);
const reviewed={reviews:1,reps:0};

test('only previously answered items enter the test, deduplicated across skills including lapses',()=>{
  const cards={'flash:日':reviewed,'write:日':reviewed,'flash:v-学校':{reviews:3},'listen:あ':{reviews:0},'context:s-0':reviewed,'flash:unknown':reviewed,'unknown:水':reviewed};
  assert.deepEqual(new Set(studiedMaterials(cards,items).map(item=>item.id)),new Set(['日','v-学校','s-0']));
  const questions=buildKnowledgeTest(cards,items,{count:20},()=>.8);
  assert.equal(questions.length,3);
  assert.deepEqual(new Set(questions.map(q=>q.itemId)),new Set(['日','v-学校','s-0']));
  assert.equal(buildKnowledgeTest({},items).length,0);
});

test('category and JLPT filters intersect practiced material and exclude ungraded items at a selected level',()=>{
  const n4=items.find(k=>!k.kind&&k.jlpt===4),ungraded=items.find(k=>!k.kind&&!k.jlpt);
  const cards={'flash:日':reviewed,['flash:'+n4.id]:reviewed,['flash:'+ungraded.id]:reviewed,'flash:v-学校':reviewed,'flash:あ':reviewed,'context:s-0':reviewed};
  assert.equal(studiedMaterials(cards,items,{category:'kanji',level:'4'})[0].id,n4.id);
  assert.equal(studiedMaterials(cards,items,{category:'kanji',level:'all'}).length,3);
  assert.deepEqual(studiedMaterials(cards,items,{category:'kana'}).map(k=>k.id),['あ']);
  assert.deepEqual(studiedMaterials(cards,items,{category:'sentences'}).map(k=>k.id),['s-0']);
  assert.ok(studiedMaterials(cards,items,{level:'5'}).every(k=>k.jlpt===5));
});

test('question generation caps length and produces distinct choices with exactly one scored answer',()=>{
  const cards=Object.fromEntries(items.filter(k=>!k.kind).slice(0,35).map(k=>['flash:'+k.id,reviewed]));
  const before=JSON.stringify(cards),questions=buildKnowledgeTest(cards,items,{count:1000},()=>.8);
  assert.equal(questions.length,20);
  assert.equal(new Set(questions.map(q=>q.id)).size,20);
  for(const q of questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.text)).size,4);assert.equal(q.options.filter(o=>o.id===q.correctChoice&&o.text===q.answer).length,1)}
  assert.equal(JSON.stringify(cards),before,'tests do not reschedule review cards');
});

test('vocabulary alternate readings cannot appear as wrong answers',()=>{
  const word=(id,reading,otherReadings=[])=>({id,char:id,reading,otherReadings,kind:'vocab',meanings:[id]});
  const pool=[word('四','し',['よん']),word('candidate','よん'),word('五','ご'),word('六','ろく'),word('七','なな')];
  const [q]=buildKnowledgeTest({'flash:四':reviewed},pool,{count:5},()=>0);
  assert.equal(q.type,'reading');assert.equal(q.answer,'し');assert.ok(!q.options.some(o=>o.text==='よん'));
  const target={id:'水',char:'水',meanings:['water','H2O']};
  const [meaning]=buildKnowledgeTest({'flash:水':reviewed},[target,{id:'same',char:'same',meanings:['water']},{id:'fire',char:'fire',meanings:['fire']}],{},()=>.8);
  assert.equal(meaning.options.length,2);assert.ok(!meaning.options.some(o=>o.text==='water'));
});

test('kana and sentence questions use the studied sound and cloze target',()=>{
  const cards={'flash:あ':reviewed,'context:s-0':reviewed},questions=buildKnowledgeTest(cards,items,{},()=>.8);
  const kana=questions.find(q=>q.itemId==='あ'),sentence=questions.find(q=>q.itemId==='s-0');
  assert.equal(kana.type,'kana');assert.equal(kana.answer,'a');
  assert.equal(sentence.type,'cloze');assert.equal(sentence.answer,find('s-0').target);
  assert.ok(sentence.prompt.includes('＿＿＿'));assert.ok(!sentence.prompt.includes(sentence.answer));
});

test('scoring counts skips, ignores duplicate submissions and exposes missed questions',()=>{
  const questions=buildKnowledgeTest({'flash:日':reviewed,'flash:あ':reviewed,'context:s-0':reviewed},items,{},()=>.8);
  const answers=[{questionId:questions[0].id,choice:questions[0].correctChoice},{questionId:questions[1].id,choice:'skip'},{questionId:questions[2].id,choice:questions[2].options.find(o=>o.id!==questions[2].correctChoice).id}];
  const score=gradeKnowledgeTest(questions,answers.concat({questionId:questions[0].id,choice:questions[0].correctChoice}));
  assert.equal(score.correct,1);assert.equal(score.total,3);assert.equal(score.answered,3);assert.equal(score.percent,33);assert.equal(score.missed.length,2);
  assert.equal(gradeKnowledgeTest(questions,questions.map(q=>({questionId:q.id,choice:q.correctChoice}))).percent,100);
  assert.equal(gradeKnowledgeTest(questions,[{questionId:questions[0].id,choice:'invalid'}]).answered,0);
});

test('backup restore retains separate learner scores and existing cards without requiring test history',()=>{
  const card=schedule({},4,0),score={at:1,total:5,correct:3,category:'kanji',level:'5'};
  const backup={version:1,profiles:[{id:'a',name:'A',cards:{'flash:日':card},history:[],tests:[score]},{id:'b',name:'B',cards:{},history:[]}]};
  const restored=validateBackup(backup,new Set(['日']));
  assert.deepEqual(restored[0].tests,[score]);assert.deepEqual(restored[0].cards,backup.profiles[0].cards);
  assert.deepEqual(restored[1].tests,[]);
  const many=Array.from({length:40},(_,at)=>({...score,at}));
  assert.equal(validateTestHistory(many).length,30);
  assert.equal(validateTestHistory(many)[0].at,10);
  assert.deepEqual(validateTestHistory([{...score,correct:6},{...score,total:0},{...score,category:'unknown'},{...score,at:Infinity},{...score,level:'6'},null]),[]);
});
