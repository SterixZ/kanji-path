// A legacy item entry remains valid. New entries keep each skill independently.
export const SKILL_NAMES={recall:'General recall',meaning:'Meaning',reading:'Kana reading',kana:'Kana sound',cloze:'Sentence gap',writing:'Handwriting',listening:'Listening',context:'Sentence context'};
const forms={polite:'Polite present',politePast:'Polite past',politeNegative:'Polite negative',politeNegativePast:'Polite past negative',negative:'Plain negative',past:'Plain past',negativePast:'Plain past negative',te:'て-form'};
export const validSkill=skill=>Object.hasOwn(SKILL_NAMES,skill)||Object.hasOwn(forms,String(skill).replace(/^conjugation:/,''))&&String(skill).startsWith('conjugation:')||/^(?:dictation:[a-z0-9]{1,12}|comprehension:[0-9]{1,2})$/.test(skill);
export const skillLabel=skill=>SKILL_NAMES[skill]||(skill.startsWith('conjugation:')?'Conjugation · '+forms[skill.slice(12)]:skill.startsWith('dictation:')?'Sentence dictation':skill.startsWith('comprehension:')?'Reading comprehension · Q'+(Number(skill.slice(14))+1):skill);
export function stableHash(text){let hash=2166136261;for(const c of String(text))hash=Math.imul(hash^c.codePointAt(0),16777619);return (hash>>>0).toString(36)}
export function questionSkill(q){if(q.skill&&validSkill(q.skill))return q.skill;return q.type==='reading-comprehension'?'comprehension:'+q.id.split(':').at(-1):q.type==='conjugation'?'conjugation:'+q.form:q.type==='dictation'?'dictation:'+stableHash(q.answer):q.type==='listening'?'listening':Object.hasOwn(SKILL_NAMES,q.type)?q.type:'recall'}
const summary=skills=>{const entries=Object.values(skills),latest=entries.reduce((a,b)=>a.last>b.last?a:b);return {count:Math.min(100000,entries.reduce((n,e)=>n+e.count,0)),last:latest.last,source:latest.source,skills}};
export function updateMistake(profile,itemId,correct,source='practice',now=Date.now(),skill='recall'){
  if(!itemId||!validSkill(skill))return;
  profile.mistakes??={};const previous=profile.mistakes[itemId];
  if(skill==='recall'&&!previous?.skills){if(correct){delete profile.mistakes[itemId];return}profile.mistakes[itemId]={count:Math.min(100000,(previous?.count||0)+1),last:now,source};return}
  const skills={...(previous?.skills||(previous?{recall:{count:previous.count,last:previous.last,source:previous.source}}:{}))};
  if(correct)delete skills[skill];else skills[skill]={count:Math.min(100000,(skills[skill]?.count||0)+1),last:now,source};
  if(Object.keys(skills).length)profile.mistakes[itemId]=summary(skills);else delete profile.mistakes[itemId];
}
const validEntry=e=>e&&Number.isInteger(e.count)&&e.count>0&&e.count<=100000&&Number.isFinite(e.last)&&e.last>=0&&e.last<=8640000000000000&&['practice','test','mixed'].includes(e.source);
export function validateMistakes(value,validIds){
  const result={};
  for(const [id,entry] of Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{})){
    if(!validIds.has(id)||!validEntry(entry))continue;
    if(entry.skills){const skills={};for(const [skill,e] of Object.entries(entry.skills).slice(0,100))if(validSkill(skill)&&validEntry(e))skills[skill]={count:e.count,last:e.last,source:e.source};if(Object.keys(skills).length)result[id]=summary(skills)}
    else result[id]={count:entry.count,last:entry.last,source:entry.source};
  }return result;
}
export function migrateMistakes(profile,validIds){
  if(profile.mistakes!==undefined)return validateMistakes(profile.mistakes,validIds);
  const migrated={mistakes:{}};
  for(const event of [...(profile.history||[])].sort((a,b)=>a.at-b.at)){
    const [mode,...parts]=String(event.key).split(':'),id=parts.join(':');
    if(['flash','write','listen','context'].includes(mode)&&validIds.has(id)&&[0,3,4,5].includes(event.rating)&&Number.isFinite(event.at)&&event.at>=0&&event.at<=8640000000000000)updateMistake(migrated,id,event.rating!==0,'practice',event.at);
  }return migrated.mistakes;
}
export function mistakeItems(profile,items){return items.filter(item=>profile.mistakes?.[item.id]).sort((a,b)=>profile.mistakes[b.id].last-profile.mistakes[a.id].last)}
export function mistakeEntries(profile,items){return mistakeItems(profile,items).flatMap(item=>Object.entries(profile.mistakes[item.id].skills||{recall:profile.mistakes[item.id]}).map(([skill,entry])=>({item,skill,...entry}))).sort((a,b)=>b.last-a.last)}
