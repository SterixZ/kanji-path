import {validSkill,questionSkill} from './mistakes.js';
export const PROGRESS_SKILLS={vocab:'Vocabulary',conjugation:'Conjugation',reading:'Graded reading',listening:'Listening & dictation'};
const categories=['kanji','kana','vocab','sentences','grammar','reading'];
export function validateAttempts(value,validIds){return (Array.isArray(value)?value:[]).slice(-2000).filter(a=>a&&typeof a.itemId==='string'&&(validIds.has(a.itemId)||/^read-n[1-5]-[a-z0-9-]+$/.test(a.itemId))&&(validSkill(a.skill)||/^comprehension:[0-9]{1,2}$/.test(a.skill))&&categories.includes(a.category)&&[null,1,2,3,4,5].includes(a.level)&&typeof a.correct==='boolean'&&Number.isFinite(a.at)&&a.at>=0&&a.at<=8640000000000000).map(a=>({itemId:a.itemId,skill:a.skill,category:a.category,level:a.level,correct:a.correct,at:a.at,origin:a.origin==='practice'?'practice':'test'}))}
export function recordAttempt(profile,{itemId,skill,category,level,correct,origin='test'},now=Date.now()){
  if(!itemId)return;
  profile.attempts=[...(profile.attempts||[]),{itemId,skill,category,level:[1,2,3,4,5].includes(Number(level))?Number(level):null,correct:!!correct,at:now,origin:origin==='practice'?'practice':'test'}].slice(-2000);
}
export function trackQuestion(profile,q,item,correct){
  const reading=q.type==='reading-comprehension';
  recordAttempt(profile,{itemId:reading?q.passageId:item?.id||q.itemId,skill:reading?'comprehension:'+q.id.split(':').at(-1):questionSkill(q),category:reading?'reading':item?.kind==='vocab'?'vocab':item?.kind==='sentence'?'sentences':item?.kind==='grammar'?'grammar':['hiragana','katakana'].includes(item?.kind)?'kana':'kanji',level:q.level||q.passage?.level||item?.jlpt,correct,origin:q.reviewMode?'practice':'test'});
}
const group=a=>a.skill.startsWith('conjugation:')?'conjugation':a.skill==='listening'||a.skill.startsWith('dictation:')?'listening':a.category==='reading'?'reading':a.category==='vocab'&&['meaning','reading','recall'].includes(a.skill)?'vocab':null;
export function progressByLevel(profile){
  return [5,4,3,2,1].map(level=>({level,skills:Object.entries(PROGRESS_SKILLS).map(([skill,label])=>{
    const attempts=(profile.attempts||[]).filter(a=>a.level===level&&group(a)===skill).sort((a,b)=>a.at-b.at),recent=attempts.slice(-10),previous=attempts.slice(-20,-10);
    const percent=a=>a.length?Math.round(a.filter(x=>x.correct).length/a.length*100):null;
    const history=(profile.tests||[]).filter(t=>String(t.level)===String(level)&&(skill==='vocab'?t.category==='vocab':skill==='listening'?t.category==='dictation':t.category===skill)).slice(-5);
    return {skill,label,answered:attempts.length,targets:new Set(attempts.map(a=>a.itemId+':'+a.skill)).size,accuracy:percent(recent),trend:previous.length===10&&recent.length===10?percent(recent)-percent(previous):null,scores:history.map(t=>Math.round(t.correct/t.total*100))};
  })}));
}
