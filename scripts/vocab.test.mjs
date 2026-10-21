import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterVocabulary,schedule,validateBackup} from '../dist/core.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const words=read('../dist/data/vocab.json');
const original=read('./vocab-core.json');
const meta=read('../dist/data/vocab-meta.json');

test('all five vocabulary levels contain complete searchable cards',()=>{
  assert.equal(words.length,7824);
  const expected={5:674,4:630,3:1659,2:1778,1:3070};
  const normalize=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
  assert.equal(new Set(words.map(w=>w.id)).size,words.length);
  assert.equal(new Set(words.map(w=>w.char+'|'+normalize(w.reading))).size,words.length);
  for(const [level,count] of Object.entries(expected)){
    const list=filterVocabulary(words,'n'+level);
    assert.equal(list.length,count);
    assert.equal(list.length,meta.levels['N'+level]);
    assert.ok(list.every(w=>w.kind==='vocab'&&w.char&&w.reading&&w.meanings.length&&w.meanings.every(m=>typeof m==='string'&&m.trim())&&w.source==='OpenJLPT'));
    const sample=list[0];
    for(const query of [sample.char,sample.reading,sample.roman,sample.meanings[0]]){
      const results=filterVocabulary(words,'n'+level,query);
      assert.ok(results.some(w=>w.id===sample.id),query);
      assert.ok(results.every(w=>w.jlpt===Number(level)));
    }
  }
  assert.equal(words.filter(w=>w.jlpt).length,7811);
  assert.equal(filterVocabulary(words,'n5','NO-SUCH-WORD-123').length,0);
  assert.equal(filterVocabulary(words,'n5','  TABERU  ').find(w=>w.char==='食べる').id,'v-食べる');
  assert.ok(words.filter(w=>w.char==='私').length>=3,'keep separate homograph readings');
});

test('original cards, topics and saved progress survive vocabulary expansion',()=>{
  assert.equal(original.length,127);
  assert.equal(filterVocabulary(words,'core').length,127);
  for(const old of original){
    const current=words.find(w=>w.id===old.id);
    for(const key of ['char','reading','meanings','topic'])assert.deepEqual(current[key],old[key],old.id);
    assert.ok(filterVocabulary(words,old.topic).some(w=>w.id===old.id));
  }
  const cards=Object.fromEntries(original.flatMap(w=>['flash','listen'].map(mode=>[mode+':'+w.id,schedule({},4,Date.UTC(2026,9,21))])));
  const backup={version:1,profiles:[{id:'legacy',name:'Existing learner',cards,history:[]}]};
  assert.deepEqual(validateBackup(backup,new Set(words.map(w=>w.id)))[0].cards,cards);
});
