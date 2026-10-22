import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conjugate,conjugationWords,buildConjugationTest,dictationSentences,buildDictationTest,readingQuestions,checkLanguageAnswer,gradeLanguageTest,matchesDictation,normalizeDictation,CONJUGATION_FORMS} from '../dist/language-tests.js';
import {createLanguageTestPage} from '../dist/language-test-page.js';
import {furiganaTokens,validateBackup,schedule} from '../dist/core.js';
import {validateTestHistory} from '../dist/assessment.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const words=read('vocab'),classes=read('conjugation').classes,reading=read('reading'),items=[...words,...read('sentences')];
const word=(char,kana)=>words.find(w=>w.char===char&&(!kana||w.reading===kana));

test('godan sound changes and important irregular verbs produce their standard forms',()=>{
  const cases=[['かう','v5u','negative','かわない'],['かく','v5k','te','かいて'],['およぐ','v5g','past','およいだ'],['はなす','v5s','te','はなして'],['まつ','v5t','past','まった'],['しぬ','v5n','te','しんで'],['あそぶ','v5b','past','あそんだ'],['のむ','v5m','te','のんで'],['かえる','v5r','negative','かえらない'],['いく','v5k-s','te','いって'],['行く','v5k-s','past','行った'],['ある','v5r-i','negative','ない'],['ある','v5r-i','negativePast','なかった'],['問う','v5u-s','te','問うて'],['くる','vk','negative','こない'],['来る','vk','politePast','来ました'],['する','vs-i','te','して'],['値する','vs-i','past','値した']];
  for(const [text,tag,form,expected] of cases)assert.ok(conjugate(text,tag,form).includes(expected),`${text} ${form}`);
});
test('ichidan and adjectives cover all supported forms including いい and な alternatives',()=>{
  assert.deepEqual(Object.keys(CONJUGATION_FORMS).map(form=>conjugate('たべる','v1',form)[0]),['たべます','たべました','たべません','たべませんでした','たべない','たべた','たべなかった','たべて']);
  assert.equal(conjugate('高い','adj-i','te')[0],'高くて');assert.equal(conjugate('いい','adj-ix','past')[0],'よかった');assert.equal(conjugate('いい','adj-ix','polite')[0],'いいです');
  assert.equal(conjugate('かわいい','adj-i','negative')[0],'かわいくない');
  assert.ok(conjugate('静か','adj-na','negative').includes('静かじゃない'));assert.ok(conjugate('静か','adj-na','negative').includes('静かではない'));assert.equal(conjugate('きれい','adj-na','te')[0],'きれいで');
});
test('conjugation uses known dictionary classes, filters levels and studied words, and caps questions',()=>{
  assert.equal(Object.keys(classes).length,1981);
  for(const n of [5,4,3,2,1])assert.ok(conjugationWords({},words,classes,{level:String(n)}).length>0);
  const eat=word('食べる'),cards={['flash:'+eat.id]:{reviews:1}},before=JSON.stringify(cards);
  const [q]=buildConjugationTest(cards,words,classes,{source:'studied',level:'5',form:'te'});
  assert.equal(q.itemId,eat.id);assert.equal(q.answer,'たべて');assert.ok(checkLanguageAnswer(q,{text:'食べて'}));assert.ok(checkLanguageAnswer(q,{text:'タベテ'}));assert.equal(checkLanguageAnswer(q,{text:'たべた'}),false);
  assert.equal(JSON.stringify(cards),before);assert.equal(buildConjugationTest({},words,classes,{source:'studied'}).length,0);
  assert.equal(buildConjugationTest({},words,classes,{count:20,level:'all'}).length,20);
  assert.ok(conjugationWords({},words,classes,{group:'adjectives'}).every(w=>classes[w.id].startsWith('adj-')));
  for(const w of words.filter(w=>classes[w.id]))for(const form of Object.keys(CONJUGATION_FORMS))assert.ok(conjugate(w.reading,classes[w.id],form)[0],`${w.char} ${form}`);
});
test('graded passages cover all levels with complete furigana, useful glossaries and uniquely scored questions',()=>{
  assert.equal(reading.length,10);assert.equal(new Set(reading.map(p=>p.id)).size,10);
  for(const n of [5,4,3,2,1])assert.equal(reading.filter(p=>p.level===n).length,2);
  for(const p of reading){
    assert.equal(p.license,'CC0-1.0');assert.ok(p.translation&&p.title);assert.ok(p.text.length>100);
    const tokens=furiganaTokens(p.text);assert.ok(!tokens.some(t=>!t.reading&&/\p{Script=Han}/u.test(t.text)),'unannotated kanji in '+p.id);
    for(const g of p.glossary){assert.ok(g.reading&&g.meaning);assert.ok(tokens.some(t=>t.text===g.term),g.term)}
    const qs=readingQuestions(p,()=>.8);assert.equal(qs.length,3);
    assert.equal(new Set(qs.map(q=>q.id)).size,3);
    for(const q of qs){assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.text)).size,4);assert.equal(q.options.find(o=>o.id===q.correctChoice).text,q.answer);assert.ok(q.explanation)}
    assert.equal(gradeLanguageTest(qs,qs.map(q=>({questionId:q.id,choice:q.correctChoice}))).percent,100);
  }
});
test('dictation requires complete readings, deduplicates sentences and retains attribution',()=>{
  for(const n of [5,4,3,2,1]){
    const pool=dictationSentences({},items,{level:String(n)});assert.ok(pool.length>=20,'N'+n);
    assert.equal(new Set(pool.map(q=>normalizeDictation(q.answer))).size,pool.length);
    for(const q of pool){assert.ok(!/\p{Script=Han}/u.test(q.reading));assert.equal(q.prompt,'');assert.ok(q.translation);assert.ok(checkLanguageAnswer(q,{text:q.answer}));assert.ok(checkLanguageAnswer(q,{text:q.reading}));if(q.source==='Tatoeba')assert.ok(Number.isInteger(q.tatoebaId))}
  }
  const school=word('学校'),pool=dictationSentences({['flash:'+school.id]:{reviews:1}},items,{source:'studied',level:'all'});
  assert.ok(pool.length);assert.ok(pool.every(q=>q.itemId===school.id));
  assert.equal(buildDictationTest({},items,{count:5}).length,5);
  assert.equal(buildDictationTest({},items,{source:'studied'}).length,0);
});
test('dictation grading accepts mixed kanji/kana and punctuation variants while preserving spelling distinctions',()=>{
  const q={acceptedAnswers:['私は学生です。','わたしはがくせいです。'],segments:furiganaTokens('{私|わたし}は{学生|がくせい}です。')};
  for(const value of ['私は学生です','わたしは学生です。','私は がくせいです！','ワタシハガクセイデス'])assert.ok(matchesDictation(q,value),value);
  for(const value of ['私は先生です','わたしががくせいです',''])assert.equal(matchesDictation(q,value),false,value);
  assert.notEqual(normalizeDictation('おばさん'),normalizeDictation('おばあさん'));
});
test('new score types round-trip in existing backups without altering earlier scores or review cards',()=>{
  const score={at:1,total:3,correct:2,category:'reading',level:'1'},old={...score,category:'kanji'},card=schedule({},4,0),id=word('食べる').id;
  const backup={version:1,profiles:[{id:'a',name:'A',cards:{['flash:'+id]:card},history:[],tests:[old,score,{...score,category:'dictation'},{...score,category:'conjugation'}]}]};
  const [restored]=validateBackup(backup,new Set(items.map(i=>i.id)));assert.deepEqual(restored.tests,backup.profiles[0].tests);assert.deepEqual(restored.cards,backup.profiles[0].cards);
  assert.deepEqual(validateTestHistory([{...score,category:'injected'},{...score,total:0}]),[]);
});
test('reading quiz saves scores once, retries misses, and isolates learners',()=>{
  globalThis.document={querySelector:()=>null};globalThis.window={scrollTo:()=>{}};
  let profile={id:'a',name:'A',cards:{},mistakes:{},tests:[]},saves=0;
  const page=createLanguageTestPage({getProfile:()=>profile,getItems:()=>items,getMaterials:()=>({classes,reading}),esc:String,icon:()=>'',pageHeading:()=>'',persist:()=>saves++,render:()=>{}});
  page.setMode('reading');page.view();page.handleClick({languageAction:'start'});
  page.handleClick({languageChoice:'skip'});page.handleClick({languageChoice:'answer-0'});page.handleClick({languageAction:'next'});
  for(let n=0;n<2;n++){page.handleClick({languageChoice:'answer-0'});page.handleClick({languageAction:'next'})}
  page.handleClick({languageAction:'next'});assert.equal(profile.tests.length,1);assert.equal(profile.tests[0].correct,2);assert.equal(saves,1);
  page.handleClick({languageAction:'retry'});page.handleClick({languageChoice:'answer-0'});page.handleClick({languageAction:'next'});assert.equal(profile.tests[1].correct,1);
  profile={id:'b',name:'B',cards:{},mistakes:{},tests:[]};assert.match(page.view(),/Choose a passage/);assert.deepEqual(profile.tests,[]);
});
test('dictation gates answers on completed playback and ignores callbacks after exit',()=>{
  globalThis.document={querySelector:()=>null};globalThis.window={scrollTo:()=>{}};
  const profile={id:'a',name:'A',cards:{},mistakes:{},tests:[]};let callbacks,available=false;
  const page=createLanguageTestPage({getProfile:()=>profile,getItems:()=>items,getMaterials:()=>({classes,reading}),esc:String,icon:()=>'',pageHeading:()=>'',persist:()=>{},render:()=>{},hasVoice:()=>available,speak:(text,options)=>{callbacks=options;return true}});
  page.setMode('dictation');page.handleClick({languageAction:'start'});assert.match(page.view(),/No Japanese voice/);
  available=true;page.handleClick({languageAction:'start'});page.handleClick({languageChoice:'skip'});assert.deepEqual(profile.mistakes,{});
  page.handleClick({languageAction:'listen'});assert.match(page.view(),/Playing/);callbacks.onEnd();page.handleClick({languageChoice:'skip'});assert.equal(Object.keys(profile.mistakes).length,1);
  page.handleClick({languageAction:'next'});page.handleClick({languageAction:'listen'});page.handleClick({languageAction:'exit'});callbacks.onEnd();assert.match(page.view(),/Build your test/);assert.equal(profile.tests.length,0);
});
