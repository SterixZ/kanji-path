import {availableReviews} from './core.js';
import {buildKnowledgeTest,shuffleQuestions} from './assessment.js';
import {buildConjugationTest,dictationSentences,readingQuestions} from './language-tests.js';
import {mistakeEntries,questionSkill} from './mistakes.js';
export function listeningQuestion(item,items,random=Math.random){
  const normalize=text=>String(text||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[.\-\s]/g,'');
  const pronunciation=i=>i.reading||i.on?.[0]||i.kun?.[0]?.replace(/[.-]/g,'')||i.char;
  const target=new Set([pronunciation(item),...(item.otherReadings||[])].map(normalize));
  const pool=items.filter(i=>i.kind===item.kind&&i.id!==item.id&&![pronunciation(i),...(i.otherReadings||[])].some(text=>target.has(normalize(text))));
  const candidates=shuffleQuestions(pool.filter(i=>i.jlpt===item.jlpt),random).concat(shuffleQuestions(pool.filter(i=>i.jlpt!==item.jlpt),random)),texts=[item.char];
  for(const other of candidates)if(other.char&&!texts.includes(other.char)){texts.push(other.char);if(texts.length===4)break}
  if(texts.length<2)return null;
  const options=shuffleQuestions(texts,random).map((text,index)=>({id:'sound-'+index,text}));
  return {id:'listening:'+item.id,itemId:item.id,level:item.jlpt,type:'listening',format:'choice',title:'Listen, then choose the word you heard.',prompt:'',reading:'',audio:item.reading||item.on?.[0]||item.kun?.[0]?.replace(/[.-]/g,'')||item.char,answer:item.char,options,correctChoice:options.find(o=>o.text===item.char).id,explanation:item.meanings.join('; ')};
}
export function mistakeQuestion(entry,profile,items,material,random=Math.random){
  const {item,skill}=entry;
  if(skill.startsWith('comprehension:')){const passage=material.reading.find(p=>p.id===item.id),q=passage&&readingQuestions(passage,random)[Number(skill.slice(14))];return q?{...q,passage}:null}
  if(skill.startsWith('conjugation:'))return buildConjugationTest(profile.cards,[item],material.classes,{level:'all',form:skill.slice(12),count:5},random)[0];
  if(skill.startsWith('dictation:'))return dictationSentences(profile.cards,[item],{level:'all'}).find(q=>questionSkill(q)===skill);
  if(skill==='listening')return listeningQuestion(item,items,random);
  return buildKnowledgeTest(profile.cards,items,{itemIds:[item.id],format:item.kind==='grammar'?'choice':'typed',vocabTask:skill==='reading'?'reading':'meaning',count:1},random)[0];
}
export function buildMixedSession(profile,items,material,{voice=false,level=5,now=Date.now()}={},random=Math.random){
  const result=[],seen=new Set(),itemMap=new Map(items.map(i=>[i.id,i]));
  const add=(q,extra={})=>{if(!q||seen.has(q.type+':'+q.itemId+':'+(q.form||q.id)))return;seen.add(q.type+':'+q.itemId+':'+(q.form||q.id));result.push({...q,...extra})};
  const due=availableReviews(profile.cards,itemMap,material.strokes||{},now).filter(([key])=>!key.startsWith('write:')&&(voice||!key.startsWith('listen:'))).slice(0,2);
  for(const [key] of due){const [reviewMode,...parts]=key.split(':'),item=itemMap.get(parts.join(':'));
    const q=reviewMode==='listen'?listeningQuestion(item,items,random):buildKnowledgeTest(profile.cards,items,{itemIds:[item.id],count:1},random)[0];add(q,{reviewMode,section:'Due review'});
  }
  const weak=mistakeEntries(profile,items).filter(e=>e.skill.startsWith('conjugation:')).slice(0,2);
  for(const entry of weak)add(mistakeQuestion(entry,profile,items,material,random),{section:'Weak conjugation'});
  if(result.filter(q=>q.type==='conjugation').length<2){const pool=buildConjugationTest(profile.cards,items,material.classes,{level:String(level),count:5},random);for(const q of pool){if(result.filter(x=>x.type==='conjugation').length>=2)break;add(q,{section:'Conjugation'})}}
  if(voice){const weakAudio=mistakeEntries(profile,items).find(e=>e.skill.startsWith('dictation:')||e.skill==='listening');if(weakAudio)add(mistakeQuestion(weakAudio,profile,items,material,random),{section:'Listening'});
    for(const item of shuffleQuestions(items.filter(i=>i.kind==='vocab'&&i.jlpt===Number(level)),random)){if(result.filter(q=>['dictation','listening'].includes(q.type)&&!q.reviewMode).length>=2)break;add(listeningQuestion(item,items,random),{section:'Listening'})}
  }
  const passages=material.reading.filter(p=>p.level===Number(level)),attempts=profile.attempts||[];
  passages.sort((a,b)=>attempts.filter(t=>t.itemId===a.id).length-attempts.filter(t=>t.itemId===b.id).length);
  if(passages[0])for(const q of readingQuestions(passages[0],random).slice(0,2))add(q,{passage:passages[0],section:'Reading'});
  return result.slice(0,8).map((q,i)=>({...q,id:'mixed:'+i+':'+q.id}));
}
