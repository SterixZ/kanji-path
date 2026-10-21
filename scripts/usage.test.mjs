import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canWrite,lessonSteps,availableReviews,furiganaTokens,sentenceSpeech,strokeArrow,schedule,validateBackup} from '../dist/core.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const words=load('vocab'),strokes=load('strokes');

test('vocabulary skips writing even when its spelling has a kanji stroke diagram',()=>{
  const word=words.find(w=>w.char==='水'&&w.kind==='vocab');
  const kanji={id:'水',char:'水'},kana={id:'あ',char:'あ',kind:'hiragana'};
  assert.ok(strokes[word.char]?.length);
  for(const vocab of words){
    assert.equal(canWrite(vocab,strokes),false);
    assert.deepEqual(lessonSteps(vocab,strokes),['explore','guided-listen','flash']);
  }
  for(const character of [kanji,kana]){
    assert.equal(canWrite(character,strokes),true);
    assert.deepEqual(lessonSteps(character,strokes),['explore','guided-listen','write','flash']);
  }
});

test('retired vocabulary handwriting reviews stay in backups but leave the daily queue',()=>{
  const word=words.find(w=>w.char==='水'),kanji={id:'水',char:'水'};
  const card=schedule({},4,0),cards={['write:'+word.id]:card,['flash:'+word.id]:card,'write:水':card};
  const items=new Map([word,kanji].map(w=>[w.id,w]));
  const restored=validateBackup({version:1,profiles:[{id:'old',name:'Learner',cards,history:[]}]},new Set(items.keys()))[0];
  assert.deepEqual(restored.cards,cards);
  assert.deepEqual(availableReviews(restored.cards,items,strokes,86400001).map(([key])=>key),['flash:'+word.id,'write:水']);
});

test('sentence examples have translations, reading tokens and source attribution',()=>{
  const meta=load('vocab-meta');
  assert.ok(words.filter(w=>w.examples.length).length>=7250);
  assert.equal(words.filter(w=>w.examples.length).length,meta.withExamples);
  assert.equal(words.reduce((n,w)=>n+w.examples.length,0),meta.exampleCount);
  for(const word of words)for(const example of word.examples){
    assert.ok(example.ja&&example.en&&sentenceSpeech(example));
    if(example.source==='Tatoeba')assert.ok(Number.isInteger(example.tatoeba_id)&&example.tatoeba_id>0);
    else assert.ok(example.source==='Kanji Path'&&/^s-\d+$/.test(example.sourceId));
    if(example.furigana)assert.equal(furiganaTokens(example.furigana).map(t=>t.text).join(''),example.ja);
  }
  for(const spelling of ['明日','一日','五日','一昨日','火曜日'])assert.ok(words.find(w=>w.char===spelling).examples.length,spelling);
});

test('furigana remains text and speech uses readings rather than markup',()=>{
  assert.deepEqual(furiganaTokens('毎日{水|みず}を{飲|の}みます。'),[{text:'毎日'},{text:'水',reading:'みず'},{text:'を'},{text:'飲',reading:'の'},{text:'みます。'}]);
  assert.equal(sentenceSpeech({ja:'水を飲みます。',furigana:'{水|みず}を{飲|の}みます。'}),'みずをのみます。');
  assert.equal(sentenceSpeech({ja:'水を飲みます。',reading:'みずをのみます。'}),'みずをのみます。');
  assert.deepEqual(furiganaTokens('<script>alert(1)</script>{語|ご}'),[{text:'<script>alert(1)</script>'},{text:'語',reading:'ご'}]);
  assert.equal(sentenceSpeech({ja:'こんにちは。'}),'こんにちは。');
});

test('stroke arrows follow forward direction and curved paths without nonfinite coordinates',()=>{
  assert.equal(strokeArrow([[0,0],[100,0]]).angle,0);
  assert.equal(strokeArrow([[0,0],[0,100]]).angle,90);
  assert.equal(Math.abs(strokeArrow([[100,0],[0,0]]).angle),180);
  assert.equal(strokeArrow([[0,0],[100,0],[100,100]],.75).angle,90);
  for(const fraction of [0,1,-1,2,NaN])assert.ok(Object.values(strokeArrow([[0,0],[50,0],[50,70]],fraction)).every(Number.isFinite));
  assert.equal(strokeArrow([]),null);
  assert.equal(strokeArrow([[1,1],[1,1]]),null);
});
