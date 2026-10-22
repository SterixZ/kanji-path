import {shuffleQuestions,studiedMaterials,normalizeTypedAnswer,isCorrectAnswer} from './assessment.js';
import {furiganaTokens,sentenceSpeech} from './core.js';

export const LANGUAGE_MODES={mixed:'Daily mixed session',conjugation:'Conjugation practice',reading:'Graded reading',dictation:'Sentence dictation'};
export const CONJUGATION_FORMS={polite:'Polite present',politePast:'Polite past',politeNegative:'Polite negative',politeNegativePast:'Polite past negative',negative:'Plain negative',past:'Plain past',negativePast:'Plain past negative',te:'て-form'};
export const CLASS_NAMES={'v1':'Ichidan verb','v1-s':'Ichidan verb','vs-i':'する verb',vk:'来る verb','adj-i':'い-adjective','adj-ix':'いい adjective','adj-na':'な-adjective'};
export const conjugationClass=tag=>CLASS_NAMES[tag]||'Godan verb';
export function conjugationRule(tag,form){
  if(tag==='vk')return '来る is irregular: the reading changes to き before ます, た, and て, and to こ before ない.';
  if(tag==='vs-i')return 'For する verbs, replace する with the requested form: します, しました, しません, しませんでした, しない, した, しなかった, or して.';
  if(tag==='adj-ix')return 'いい uses よい as its base before negative, past, and て endings. Its polite present form remains いいです.';
  if(tag==='adj-i')return 'For い-adjectives, keep い before です; otherwise replace the final い with くない, かった, くなかった, or くて. Polite negative forms also allow くありません.';
  if(tag==='adj-na')return 'For な-adjectives, add です / でした for polite forms, だった for plain past, ではない (or じゃない) for plain negative, ではなかった for plain past negative, and で for the て-form.';
  if(tag==='v1'||tag==='v1-s')return 'For ichidan verbs, remove the final る and add ます, ました, ません, ませんでした, ない, た, なかった, or て for the requested form.';
  if(tag==='v5r-i'&&['negative','negativePast'].includes(form))return 'ある is exceptional in plain negative forms: ない and なかった.';
  if(['past','te'].includes(form))return tag==='v5k-s'?'行く is exceptional: its plain past is 行った (いった) and its て-form is 行って (いって).':tag==='v5u-s'?'These verbs retain う before た / て: 問う → 問うた / 問うて, 請う → 請うた / 請うて.':'Godan た / て endings: う・つ・る → った / って; む・ぶ・ぬ → んだ / んで; く → いた / いて; ぐ → いだ / いで; す → した / して.';
  return ['negative','negativePast'].includes(form)?'Change the final godan kana to its あ-row counterpart (う becomes わ), then add ない or なかった.':'Change the final godan kana to its い-row counterpart, then add the requested polite ending: ます, ました, ません, or ませんでした.';
}

export function conjugate(text,tag,form){
  if(!Object.hasOwn(CONJUGATION_FORMS,form)||!text)return [];
  let stem=text.slice(0,-1),polite,negative,past,te;
  if(tag==='adj-i'||tag==='adj-ix'){
    const base=tag==='adj-ix'?text.slice(0,-2)+'よ':stem;
    const forms={polite:[text+'です'],politePast:[base+'かったです'],politeNegative:[base+'くないです',base+'くありません'],politeNegativePast:[base+'くなかったです',base+'くありませんでした'],negative:[base+'くない'],past:[base+'かった'],negativePast:[base+'くなかった'],te:[base+'くて']};
    return forms[form];
  }
  if(tag==='adj-na'){
    const forms={polite:[text+'です'],politePast:[text+'でした'],politeNegative:[text+'ではありません',text+'じゃありません',text+'ではないです',text+'じゃないです'],politeNegativePast:[text+'ではありませんでした',text+'じゃありませんでした',text+'ではなかったです',text+'じゃなかったです'],negative:[text+'ではない',text+'じゃない'],past:[text+'だった'],negativePast:[text+'ではなかった',text+'じゃなかった'],te:[text+'で']};
    return forms[form];
  }
  if(tag==='v1'||tag==='v1-s'){polite=stem;negative=stem+'ない';past=stem+'た';te=stem+'て'}
  else if(tag==='vs-i'&&text.endsWith('する')){stem=text.slice(0,-2);polite=stem+'し';negative=stem+'しない';past=stem+'した';te=stem+'して'}
  else if(tag==='vk'&&(text.endsWith('くる')||text.endsWith('来る'))){
    const written=text.endsWith('来る');stem=text.slice(0,-2);polite=stem+(written?'来':'き');negative=stem+(written?'来ない':'こない');past=stem+(written?'来た':'きた');te=stem+(written?'来て':'きて');
  }else if(/^v5/.test(tag)){
    const endings={'う':['い','わ','った','って'],'く':['き','か','いた','いて'],'ぐ':['ぎ','が','いだ','いで'],'す':['し','さ','した','して'],'つ':['ち','た','った','って'],'ぬ':['に','な','んだ','んで'],'ぶ':['び','ば','んだ','んで'],'む':['み','ま','んだ','んで'],'る':['り','ら','った','って']};
    const row=endings[text.at(-1)];if(!row)return [];
    polite=stem+row[0];negative=stem+row[1]+'ない';past=stem+row[2];te=stem+row[3];
    if(tag==='v5k-s'){past=stem+'った';te=stem+'って'}
    if(tag==='v5r-i')negative='ない';
    if(tag==='v5u-s'){past=stem+'うた';te=stem+'うて'}
  }else return [];
  return [{polite:polite+'ます',politePast:polite+'ました',politeNegative:polite+'ません',politeNegativePast:polite+'ませんでした',negative,past,negativePast:negative.slice(0,-2)+'なかった',te}[form]];
}

const boundedCount=count=>[5,10,20].includes(Number(count))?Number(count):10;
export function conjugationWords(cards,items,classes,{level='5',source='all',group='all'}={}){
  const pool=source==='studied'?studiedMaterials(cards,items,{category:'vocab'}):items.filter(item=>item.kind==='vocab');
  return pool.filter(item=>classes[item.id]&&(level==='all'||item.jlpt===Number(level))&&(group==='all'||(group==='adjectives'?classes[item.id].startsWith('adj-'):!classes[item.id].startsWith('adj-'))));
}
export function buildConjugationTest(cards,items,classes,settings={},random=Math.random){
  const {form='mixed'}=settings;
  return shuffleQuestions(conjugationWords(cards,items,classes,settings),random).slice(0,boundedCount(settings.count)).map(item=>{
    const tag=classes[item.id],chosen=Object.hasOwn(CONJUGATION_FORMS,form)?form:shuffleQuestions(Object.keys(CONJUGATION_FORMS),random)[0];
    const kana=conjugate(item.reading,tag,chosen),written=conjugate(item.char,tag,chosen);
    return {id:`conjugation:${item.id}:${chosen}`,itemId:item.id,level:item.jlpt,type:'conjugation',form:chosen,format:'typed',title:`Write the requested form: ${CONJUGATION_FORMS[chosen].toLowerCase()}.`,prompt:item.char,reading:item.reading,meaning:item.meanings[0],group:conjugationClass(tag),answer:kana[0],acceptedAnswers:[...new Set([...kana,...written])],options:[],explanation:`${item.char} (${item.reading}) → ${kana[0]} · ${CONJUGATION_FORMS[chosen]}. ${conjugationRule(tag,chosen)}`};
  }).filter(q=>q.answer);
}

// Only sentence examples with complete readings can accept kana-only dictation.
export function dictationSentences(cards,items,{level='5',source='all'}={}){
  const pool=source==='studied'?studiedMaterials(cards,items):items;
  const result=[],seen=new Set();
  for(const item of pool){
    if(level!=='all'&&item.jlpt!==Number(level))continue;
    const examples=item.kind==='sentence'?[{ja:item.char,reading:item.reading,en:item.meanings[0],source:'Kanji Path'}]:item.kind==='vocab'?item.examples||[]:[];
    for(const example of examples){
      if(!example.reading&&!example.furigana)continue;
      const kana=sentenceSpeech(example),plain=example.ja;
      if(!plain||plain.length>90||!kana||/[\p{Script=Han}\p{Number}A-Za-z]/u.test(kana)||seen.has(normalizeDictation(plain)))continue;
      seen.add(normalizeDictation(plain));
      result.push({id:`dictation:${item.id}:${result.length}`,itemId:item.id,level:item.jlpt,type:'dictation',format:'typed',title:'Listen, then type the full Japanese sentence.',prompt:'',answer:plain,acceptedAnswers:[plain,kana],segments:example.furigana?furiganaTokens(example.furigana):[],audio:plain,reading:kana,translation:example.en,options:[],tatoebaId:example.tatoeba_id||null,source:example.source||'Kanji Path'});
    }
  }
  return result;
}
export function buildDictationTest(cards,items,settings={},random=Math.random){return shuffleQuestions(dictationSentences(cards,items,settings),random).slice(0,boundedCount(settings.count))}
export function normalizeDictation(value){return String(value||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\p{White_Space}\p{Punctuation}]/gu,'')}
export function matchesDictation(question,value){
  const text=normalizeDictation(value);if(!text)return false;
  if(question.acceptedAnswers.some(expected=>normalizeDictation(expected)===text))return true;
  if(!question.segments?.length)return false;
  const escape=value=>normalizeDictation(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=question.segments.map(token=>token.reading?`(?:${escape(token.text)}|${escape(token.reading)})`:escape(token.text)).join('');
  return new RegExp('^'+pattern+'$','u').test(text);
}

export function readingQuestions(passage,random=Math.random){
  return passage.questions.map((question,index)=>{
    const options=shuffleQuestions(question.choices.map((text,i)=>({id:'answer-'+i,text})),random);
    return {id:`reading:${passage.id}:${index}`,itemId:passage.id,type:'reading-comprehension',format:'choice',title:question.prompt,prompt:'',answer:question.choices[question.answer],correctChoice:'answer-'+question.answer,options,explanation:question.explanation,passageId:passage.id,level:passage.level};
  });
}
export function checkLanguageAnswer(question,answer){
  if(!answer||answer.choice==='skip')return false;
  if(question.format==='choice'||question.correctChoice)return answer.choice===question.correctChoice;
  if(!['conjugation','dictation'].includes(question.type))return isCorrectAnswer(question,answer);
  if(question.type==='dictation')return matchesDictation(question,answer.text);
  const normalize=value=>normalizeTypedAnswer(value,'reading');
  const text=normalize(answer.text);
  return !!text&&question.acceptedAnswers.some(expected=>normalize(expected)===text);
}
export function gradeLanguageTest(questions,answers){
  const missed=questions.filter(q=>!checkLanguageAnswer(q,answers.find(a=>a.questionId===q.id)));
  return {total:questions.length,correct:questions.length-missed.length,percent:questions.length?Math.round((questions.length-missed.length)/questions.length*100):0,missed};
}
