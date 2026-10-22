export const TEST_CATEGORIES={all:'All studied material',kanji:'Kanji',vocab:'Vocabulary',kana:'Kana',sentences:'Sentences',grammar:'Grammar'};
export const TEST_LABELS={...TEST_CATEGORIES,mixed:'Daily mixed session',conjugation:'Conjugation practice',reading:'Graded reading',dictation:'Sentence dictation'};
export const materialCategory=item=>!item.kind?'kanji':item.kind==='vocab'?'vocab':['hiragana','katakana'].includes(item.kind)?'kana':item.kind==='sentence'?'sentences':item.kind==='grammar'?'grammar':null;

export function studiedMaterials(cards,items,{category='all',level='all',itemIds=null}={}){
  const studied=new Set(Object.entries(cards||{}).filter(([key,card])=>['flash','write','listen','context'].includes(key.split(':')[0])&&Number(card?.reviews)>0).map(([key])=>key.split(':').slice(1).join(':')));
  // Validated notebook entries also prove an item was answered, including old
  // backups whose retained history outlives the corresponding review card.
  if(itemIds)for(const id of itemIds)studied.add(id);
  return items.filter(item=>studied.has(item.id)&&(!itemIds||itemIds.includes(item.id))&&materialCategory(item)&&(category==='all'||materialCategory(item)===category)&&(level==='all'||item.jlpt===Number(level)));
}

export function shuffleQuestions(list,random=Math.random){
  const result=[...list];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.min(.999999,Math.max(0,random()))*(i+1));[result[i],result[j]]=[result[j],result[i]]}
  return result;
}

const normalize=text=>String(text||'').toLowerCase().normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[.\-\s]/g,'');
const meanings=item=>(item.meanings||[]).flatMap(m=>m.split(';')).map(m=>normalize(m.trim())).filter(Boolean);
const readings=item=>[item.reading,...(item.otherReadings||[])].map(normalize).filter(Boolean);
const label=(item,type)=>type==='cloze'?item.target:type==='reading'?item.reading:type==='kana'?item.roman:item.meanings?.slice(0,2).join('; ');

export function buildKnowledgeTest(cards,items,{category='all',level='all',count=10,format='choice',vocabTask='reading',itemIds=null}={},random=Math.random){
  const limit=Number.isInteger(Number(count))?Math.min(20,Math.max(1,Number(count))):10;
  const targets=shuffleQuestions(studiedMaterials(cards,items,{category,level,itemIds}).filter(item=>format!=='typed'||item.kind!=='grammar'),random);
  const questions=[];
  for(const item of targets){
    const group=materialCategory(item);
    const type=group==='sentences'?'cloze':group==='kana'?'kana':group==='vocab'&&(format==='typed'?vocabTask!=='meaning':random()<.5)?'reading':'meaning';
    const answer=label(item,type);if(!answer)continue;
    if(format==='typed'){
      const acceptedAnswers=type==='reading'?[item.reading,...(item.otherReadings||[])]:type==='meaning'?item.meanings.flatMap(m=>m.split(';')):type==='kana'?[item.roman]:[item.target];
      questions.push({id:item.id,itemId:item.id,type,format:'typed',answer,acceptedAnswers:acceptedAnswers.filter(Boolean),options:[],
        title:type==='reading'?'Type this word’s reading in kana.':type==='meaning'?'Type an English meaning.':type==='kana'?'Type this kana’s sound in romaji.':'Type the missing Japanese word.',
        prompt:type==='cloze'?item.char.replace(item.target,'＿＿＿'):item.char,
        hint:type==='cloze'?item.meanings?.[0]||'':'',reading:''});
      if(questions.length===limit)break;
      continue;
    }
    const validAnswers=new Set(type==='reading'?readings(item):type==='meaning'?meanings(item):[normalize(answer)]);
    const pool=items.filter(other=>other.id!==item.id&&materialCategory(other)===group&&(group!=='kana'||other.kind===item.kind));
    const candidates=shuffleQuestions(pool.filter(other=>other.jlpt===item.jlpt),random).concat(shuffleQuestions(pool.filter(other=>other.jlpt!==item.jlpt),random));
    const labels=[answer],seen=new Set([normalize(answer)]);
    for(const candidate of candidates){
      const value=label(candidate,type);if(!value||seen.has(normalize(value)))continue;
      const accepted=type==='reading'?readings(candidate):type==='meaning'?meanings(candidate):[normalize(value)];
      if(accepted.some(value=>validAnswers.has(value)))continue;
      labels.push(value);seen.add(normalize(value));if(labels.length===4)break;
    }
    if(labels.length<2)continue;
    const options=shuffleQuestions(labels,random).map((text,i)=>({id:'choice-'+i,text}));
    questions.push({id:item.id,itemId:item.id,type,
      title:type==='cloze'?'Choose the missing word.':type==='reading'?'How is this word read?':type==='kana'?'Which sound does this kana represent?':'Choose the meaning.',
      prompt:type==='cloze'?item.char.replace(item.target,'＿＿＿'):item.char,
      hint:type==='cloze'||type==='reading'?item.meanings?.[0]||'':'',
      reading:group==='vocab'&&type==='meaning'?item.reading:'',
      answer,options,correctChoice:options.find(option=>option.text===answer).id});
    if(questions.length===limit)break;
  }
  return questions;
}

export function normalizeTypedAnswer(value,type){
  let text=String(value??'').normalize('NFKC').trim().toLowerCase();
  if(type==='reading'||type==='cloze')return text.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/\s+/g,'');
  if(type==='kana')return text.replace(/\s+/g,'').replace(/shi/g,'si').replace(/chi/g,'ti').replace(/tsu/g,'tu').replace(/fu/g,'hu').replace(/ji/g,'zi');
  return text.replace(/\([^)]*\)/g,'').replace(/^to\s+/,'').replace(/[.!?]+$/,'').replace(/\s+/g,' ').trim();
}

export function isCorrectAnswer(question,answer){
  if(!answer||answer.choice==='skip')return false;
  if(question.format!=='typed')return answer.choice===question.correctChoice;
  const text=normalizeTypedAnswer(answer.text,question.type);
  return !!text&&question.acceptedAnswers.some(expected=>normalizeTypedAnswer(expected,question.type)===text);
}

export function gradeKnowledgeTest(questions,answers){
  let correct=0,answered=0;const missed=[];
  for(const question of questions){
    const answer=answers.find(answer=>answer.questionId===question.id&&(answer.choice==='skip'||(question.format==='typed'?typeof answer.text==='string':question.options.some(option=>option.id===answer.choice))));
    if(answer){answered++;if(isCorrectAnswer(question,answer)){correct++;continue}}
    missed.push(question);
  }
  return {correct,total:questions.length,answered,percent:questions.length?Math.round(correct/questions.length*100):0,missed};
}

export function validateTestHistory(history){
  return (Array.isArray(history)?history:[]).filter(result=>result&&Number.isFinite(result.at)&&result.at>=0&&result.at<=8640000000000000&&Number.isInteger(result.total)&&result.total>0&&result.total<=20&&Number.isInteger(result.correct)&&result.correct>=0&&result.correct<=result.total&&Object.hasOwn(TEST_LABELS,result.category)&&['all','1','2','3','4','5'].includes(String(result.level))).slice(-30).map(result=>({at:result.at,total:result.total,correct:result.correct,category:result.category,level:String(result.level)}));
}
