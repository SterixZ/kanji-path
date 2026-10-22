import {LANGUAGE_MODES,CONJUGATION_FORMS,conjugationWords,buildConjugationTest,dictationSentences,buildDictationTest,readingQuestions,checkLanguageAnswer,gradeLanguageTest} from './language-tests.js';
import {furiganaTokens} from './core.js';
import {updateMistake,questionSkill} from './mistakes.js';
import {trackQuestion} from './progress.js';
import {correctionHTML} from './corrections.js';
import {buildMixedSession,mistakeQuestion} from './mixed-session.js';
import {createReadAlong} from './shadowing.js';

export function createLanguageTestPage({getProfile,getItems,getMaterials,esc,icon,pageHeading,persist,render,speak=()=>false,stopSpeech=()=>{},hasVoice=()=>false,recordReview=()=>{}}){
  const defaults=()=>({level:'5',source:'all',count:5,group:'all',form:'mixed',passageId:''});
  let owner=null,mode='conjugation',settings=defaults(),test=null,showFurigana=true,term=null,audioToken=0;
  const shadow=createReadAlong({speak,stopSpeech,hasVoice,render,getOwner:()=>getProfile().id});
  function stopAudio(release=true){audioToken++;stopSpeech();if(release)shadow.dispose();else shadow.stop();if(test)test.playing=false}
  function ensureOwner(){if(owner!==getProfile().id){stopAudio();owner=getProfile().id;settings=defaults();test=null;term=null;showFurigana=true}}
  function setMode(value){ensureOwner();if(Object.hasOwn(LANGUAGE_MODES,value)&&value!==mode){stopAudio();mode=value;settings=defaults();test=null;term=null}}
  const select=(id,label,options,value)=>`<div class="form-row"><label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
  const passages=()=>getMaterials().reading.filter(p=>settings.level==='all'||p.level===Number(settings.level));
  const selection=()=>mode==='conjugation'?conjugationWords(getProfile().cards,getItems(),getMaterials().classes,settings):mode==='dictation'?dictationSentences(getProfile().cards,getItems(),settings):passages();
  function view(){
    ensureOwner();
    if(test)return test.index<test.questions.length?questionView():resultsView();
    if(mode==='mixed')return `${pageHeading('Daily mixed session','Due recall reviews, weak forms, listening, and reading in up to eight questions.')}<section class="panel"><p>Writing reviews stay in Daily reviews. Listening is included when a Japanese voice is available.</p><button class="primary" data-language-action="mixed">Start daily mixed session</button></section>`;
    const list=selection(),reading=mode==='reading',dictation=mode==='dictation';
    if(reading&&!list.some(p=>p.id===settings.passageId))settings.passageId=list[0]?.id||'';
    return `${pageHeading(LANGUAGE_MODES[mode]+'.',reading?'Read an original Japanese passage, then check your understanding.':dictation?'Listen to Japanese sentences and type what you hear.':'Recall useful verb and adjective forms from memory.')}<div class="test-setup-grid"><section class="panel test-setup"><h2>${reading?'Choose a passage':'Build your test'}</h2>
      ${select('language-level',reading?'Estimated reading level':'Vocabulary level',[['all','All levels'],...[5,4,3,2,1].map(n=>[String(n),'N'+n])],settings.level)}
      ${!reading?select('language-source','Question source',[['all','All built-in words'],['studied','Previously practiced words']],settings.source):''}
      ${mode==='conjugation'?select('language-group','Word group',[['all','Verbs and adjectives'],['verbs','Verbs'],['adjectives','Adjectives']],settings.group)+select('language-form','Form to practice',[['mixed','Mixed forms'],...Object.entries(CONJUGATION_FORMS)],settings.form):''}
      ${reading?select('language-passage','Passage',list.map(p=>[p.id,`N${p.level} · ${p.title}`]),settings.passageId):select('language-count','Test length',[5,10,20].map(n=>[n,'Up to '+n+' questions']),settings.count)}
      <p class="small muted">${reading?`${list.length} original passages available · 3 comprehension questions per passage.`:`${list.length.toLocaleString()} ${dictation?'distinct sentences':'words'} available · up to ${Math.min(list.length,settings.count)} questions.`}</p>
      ${!list.length?'<div class="notice">No material matches this selection. Try all built-in words or another level.</div>':''}
      ${dictation&&!hasVoice()?'<div class="notice">No Japanese voice is available. Choose or install a Japanese voice in Settings before starting dictation.</div><button class="text-link" data-nav="settings">Open Japanese audio settings</button>':''}
      <button class="primary" data-language-action="start" ${!list.length||(dictation&&!hasVoice())?'disabled':''}>${reading?'Read & answer':'Start test'} ${icon('arrow')}</button></section>
      <section class="panel"><h2>${reading?'Read at your pace':dictation?'Train your listening':'Forms that make sentences work'}</h2><ul class="test-info">${reading?'<li>Choose N5–N1. Levels are learning estimates, not official JLPT exam labels.</li><li>Show or hide furigana. Tap highlighted words for a reading and definition.</li><li>Answer three questions about facts, inference, or the author’s point.</li><li>Review explanations and the full English translation after finishing.</li>':dictation?'<li>Play the sentence before answering. Replay or use slower audio as needed.</li><li>Type the full sentence in Japanese. Kana-only answers are accepted.</li><li>Punctuation, spacing, and hiragana/katakana differences are ignored.</li><li>Review the transcript, reading, translation, and source after answering.</li>':'<li>Practise polite, negative, past, past negative, and て-forms.</li><li>Verbs use dictionary classes, including supported irregular verbs.</li><li>Adjective questions include い- and な-adjectives.</li><li>Type in kana or the word’s standard written form.</li>'}</ul><p class="small muted">Scores stay with this learner and are included in backups. ${reading?'Reading comprehension has separate scores; it does not change word reviews.':'Mistakes are saved for the specific skill or form. These tests do not reschedule daily reviews.'}</p>${dictation?'<p class="small muted">Sentence examples come from the bundled vocabulary data. The level filter follows the vocabulary word; sentence difficulty can vary. Audio and offline playback depend on your device voice.</p>':''}</section></div>`;
  }
  function passageHTML(passage,interactive=true){
    shadow.setPassage(passage);
    const words=passage.glossary;
    const content=furiganaTokens(passage.text).map(token=>{
      const text=token.reading?`<ruby>${esc(token.text)}<rt>${esc(token.reading)}</rt></ruby>`:esc(token.text).replace(/\n/g,'<br>');
      const index=words.findIndex(word=>word.term===token.text);
      return interactive&&index>=0?`<button class="reading-term" data-language-term="${index}" aria-label="Look up ${esc(token.text)}">${text}</button>`:text;
    }).join('');
    const word=term===null?null:words[term];
    return `<section class="reading-passage" tabindex="-1"><div class="reading-passage-head"><h2>${esc(passage.title)}</h2><span class="tag">Est. N${passage.level}</span></div>${interactive?`<button class="secondary" data-language-action="furigana" aria-pressed="${showFurigana}">${showFurigana?'Hide':'Show'} furigana</button>`:''}<div class="reading-japanese ${showFurigana?'':'reading-hide-furigana'}" lang="ja">${content}</div>${word&&interactive?`<div class="reading-gloss" role="status"><b lang="ja">${esc(word.term)}</b><span lang="ja">${esc(word.reading)}</span><span>${esc(word.meaning)}</span><button class="ghost" data-language-action="close-gloss" aria-label="Close word definition">${icon('close')}</button></div>`:''}<p class="usage-source">Original Kanji Path passage · CC0 · estimated study level</p>${shadow.html(esc)}</section>`;
  }
  function typedForm(question,answer){
    const disabled=!!answer||(['dictation','listening'].includes(question.type)&&!test.listened);
    const input=question.type==='dictation'?`<textarea class="input" id="language-answer" rows="3" maxlength="300" lang="ja" autocomplete="off" spellcheck="false" ${disabled?'disabled':''} required>${esc(answer?.text||test.draft)}</textarea>`:`<input class="input" id="language-answer" maxlength="100" lang="ja" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(answer?.text||test.draft)}" ${disabled?'disabled':''} required>`;
    return `<form id="language-answer-form" class="typed-answer-form"><label for="language-answer">Your answer</label>${input}<p class="small muted">${question.type==='dictation'?'Type kana or the sentence’s standard written form. Spaces and punctuation do not affect the score.':'Use kana or the word’s standard written form. Include the full conjugated word.'}</p><button class="primary" type="submit" ${disabled?'disabled':''}>Check answer ${icon('check')}</button></form>`;
  }
  function questionView(){
    const question=test.questions[test.index],reading=question.type==='reading-comprehension',dictation=['dictation','listening'].includes(question.type),conjugation=question.type==='conjugation',answer=test.answers.find(a=>a.questionId===question.id),correct=checkLanguageAnswer(question,answer);
    return `${pageHeading(LANGUAGE_MODES[mode]+'.','Take your time. Completed tests save a score for this learner.')}<section class="panel test-question-panel language-question"><div class="test-question-top"><span>Question ${test.index+1} of ${test.questions.length}</span><span>${gradeLanguageTest(test.questions,test.answers).correct} correct so far</span></div><div class="stat-line"><i style="width:${test.index/test.questions.length*100}%"></i></div>${question.section?`<p class="mixed-section">${esc(question.section)}</p>`:''}${reading?passageHTML(question.passage||test.passage):''}<h2 id="language-question" tabindex="-1">${esc(question.title)}</h2>
      ${conjugation?`<div class="test-prompt" lang="ja">${esc(question.prompt)}</div><p class="test-reading" lang="ja">${esc(question.reading)}</p><p class="test-hint">${esc(question.meaning)} · ${esc(question.group)}</p>`:''}
      ${dictation?`<div class="dictation-audio"><button class="primary" data-language-action="listen" ${test.playing||!hasVoice()?'disabled':''}>${icon('sound')} ${test.playing?'Playing…':'Listen to sentence'}</button><button class="secondary" data-language-action="slow" ${test.playing||!hasVoice()?'disabled':''}>Slower audio</button></div><p class="small muted dictation-status" role="status">${test.audioError?esc(test.audioError):test.listened?'Type what you heard. You can replay the sentence.':test.playing?'Listen to the whole sentence.':'Play the sentence to unlock the answer box.'}</p>${!hasVoice()?'<div class="notice">A Japanese voice is unavailable. Open Settings to set one up.</div>':''}`:''}
      ${!conjugation&&!reading&&!dictation?`<div class="test-prompt ${question.type==='cloze'?'test-cloze':''}" lang="ja">${esc(question.prompt)}</div>${question.hint?`<p class="test-hint">${esc(question.hint)}</p>`:''}`:''}
      ${question.format==='typed'?typedForm(question,answer):`<div class="options test-options">${question.options.map(option=>`<button class="option test-option ${answer?(option.id===question.correctChoice?'correct':option.id===answer.choice?'wrong':''):''}" data-language-choice="${option.id}" ${answer||(dictation&&!test.listened)?'disabled':''}>${esc(option.text)}</button>`).join('')}</div>`}
      ${answer?feedback(question,answer,correct):''}<div class="test-controls"><button class="ghost" data-language-action="exit">Exit test</button>${answer?`<button class="primary" data-language-action="next">${test.index===test.questions.length-1?'See results':'Next question'} ${icon('arrow')}</button>`:`<button class="secondary" data-language-choice="skip" ${dictation&&!test.listened?'disabled':''}>I’m not sure</button>`}</div></section>`;
  }
  function feedback(question,answer,correct){
    return `<div class="test-feedback ${correct?'success':'error'}" role="status"><strong>${correct?'Correct.':'Keep practicing.'}</strong><p>Answer: <span lang="ja">${esc(question.answer)}</span></p>${!correct?`<p>Your answer: ${esc(answerText(question,answer))}</p>${correctionHTML(question,answer,esc)}`:''}${question.type==='dictation'?`<p lang="ja">${esc(question.reading)}</p><p>${esc(question.translation)}</p>${sourceHTML(question)}`:`<p>${esc(question.explanation||'')}</p>`}</div>`;
  }
  const sourceHTML=question=>question.tatoebaId?`<a class="usage-source" href="https://tatoeba.org/sentences/show/${question.tatoebaId}" target="_blank" rel="noopener">Tatoeba contributors · CC BY 2.0 FR ↗</a>`:'<span class="usage-source">Kanji Path · CC0</span>';
  const answerText=(question,answer)=>answer?.choice==='skip'?'Not sure':question.format==='typed'?answer?.text||'Not answered':question.options.find(o=>o.id===answer?.choice)?.text||'Not answered';
  function resultsView(){
    const score=gradeLanguageTest(test.questions,test.answers);
    return `${pageHeading(LANGUAGE_MODES[mode]+' results.','Check the answers and revisit the difficult questions.')}<section class="panel test-results"><div class="test-score">${score.percent}%</div><h2>${score.correct} of ${score.total} correct</h2><p class="small muted">Score saved for ${esc(getProfile().name)}.</p><div class="button-row">${score.missed.length?'<button class="primary" data-language-action="retry">Retry missed questions</button>':''}<button class="secondary" data-language-action="reset">Choose another test</button></div></section>${test.passage?`<section class="panel reading-review">${passageHTML(test.passage,false)}<h3>English translation</h3><p>${esc(test.passage.translation)}</p></section>`:''}<section class="panel test-answer-review"><h2>Answer review</h2>${test.questions.map(question=>{const answer=test.answers.find(a=>a.questionId===question.id);return `<article class="test-answer-row"><h3>${esc(question.prompt||question.title)}</h3>${question.passage?`<details class="mixed-passage-review"><summary>Read passage & translation</summary><p lang="ja">${esc(question.passage.text.replace(/\{([^|{}]+)\|[^{}]+\}/g,'$1'))}</p><p>${esc(question.passage.translation)}</p></details>`:''}${feedback(question,answer,checkLanguageAnswer(question,answer))}${question.itemId?`<button class="text-link" data-detail="${esc(question.itemId)}">Review ${question.type==='reading-comprehension'?'passage':'vocabulary'} ${icon('chevron')}</button>`:''}</article>`}).join('')}</section>`;
  }
  function refresh(showPassage=false){render();(showPassage?document.querySelector('.reading-passage'):document.querySelector('#language-answer:not(:disabled)')||document.querySelector('#language-question'))?.focus()}
  function submit(answer){
    const question=test?.questions[test.index];if(!question||test.answers.some(a=>a.questionId===question.id)||(['dictation','listening'].includes(question.type)&&!test.listened))return;
    test.answers.push({questionId:question.id,...answer});
    const correct=checkLanguageAnswer(question,answer),item=getItems().find(i=>i.id===question.itemId);
    if(item)updateMistake(getProfile(),item.id,correct,mode==='mixed'?'mixed':'test',Date.now(),questionSkill(question));
    trackQuestion(getProfile(),question,item,correct);
    if(question.reviewMode&&!test.reviewed?.has(question.id)){test.reviewed??=new Set();test.reviewed.add(question.id);recordReview(question.reviewMode,item,correct)}
    persist();
    refresh();
  }
  function handleSubmit(form,event){
    if(form.id!=='language-answer-form')return false;
    event.preventDefault();ensureOwner();
    const text=form.querySelector('#language-answer')?.value.trim();
    if(text)submit({text:text.slice(0,300)});return true;
  }
  function handleInput(element){if(element.id!=='language-answer')return false;ensureOwner();if(test)test.draft=element.value;return true}
  function handleChange(element){
    const key={'language-level':'level','language-source':'source','language-count':'count','language-group':'group','language-form':'form','language-passage':'passageId'}[element.id];
    if(shadow.handleChange(element))return true;
    if(!key)return false;ensureOwner();settings[key]=key==='count'?Number(element.value):element.value;if(key==='level')settings.passageId='';render();return true;
  }
  function play(slow=false){
    if(!test||test.playing||!hasVoice())return;
    const current=test,question=test.questions[test.index],token=++audioToken;
    if(!question||!['dictation','listening'].includes(question.type))return;
    test.playing=true;test.audioError='';render();
    const result=speak(question.audio,{...(slow?{rate:.6}:{}),onEnd:()=>{if(token!==audioToken||current!==test)return;test.playing=false;test.listened=true;refresh()},onError:()=>{if(token!==audioToken||current!==test)return;test.playing=false;test.audioError='Audio did not finish. Try replaying or select another Japanese voice in Settings.';render()}});
    if(!result){test.playing=false;test.audioError='Japanese audio could not start. Check the voice in Settings.';render()}
  }
  function handleClick(dataset){
    ensureOwner();
    if(shadow.handleClick(dataset))return true;
    if(dataset.languageTerm!==undefined){ensureOwner();term=Number(dataset.languageTerm);render();return true}
    if(dataset.languageChoice){ensureOwner();const question=test?.questions[test.index];if(question&&(dataset.languageChoice==='skip'||question.options.some(o=>o.id===dataset.languageChoice)))submit({choice:dataset.languageChoice});return true}
    if(!dataset.languageAction)return false;
    ensureOwner();const action=dataset.languageAction;
    if(action==='mixed'){startMixed();return true}
    if(action==='start'){
      const material=getMaterials(),passage=mode==='reading'?passages().find(p=>p.id===settings.passageId):null;
      if(mode==='dictation'&&!hasVoice())return true;
      const questions=mode==='conjugation'?buildConjugationTest(getProfile().cards,getItems(),material.classes,settings):mode==='dictation'?buildDictationTest(getProfile().cards,getItems(),settings):passage?readingQuestions(passage):[];
      if(questions.length){test={questions,index:0,answers:[],passage,draft:'',listened:false,playing:false,settings:{...settings}};term=null}
    }else if(action==='reset'||action==='exit'){stopAudio();test=null;term=null}
    else if(action==='furigana')showFurigana=!showFurigana;
    else if(action==='close-gloss')term=null;
    else if(action==='listen'||action==='slow'){play(action==='slow');return true}
    else if(action==='next'&&test&&test.answers.some(a=>a.questionId===test.questions[test.index]?.id)){
      stopAudio(false);test.index++;test.draft='';test.listened=false;test.audioError='';term=null;
      if(test.index===test.questions.length){const score=gradeLanguageTest(test.questions,test.answers),profile=getProfile();profile.tests=[...(profile.tests||[]),{at:Date.now(),total:score.total,correct:score.correct,category:mode,level:String(test.passage?.level||test.settings.level)}].slice(-30);persist();window.scrollTo({top:0,behavior:'instant'})}
    }else if(action==='retry'&&test&&test.index===test.questions.length){const missed=gradeLanguageTest(test.questions,test.answers).missed;if(missed.length)test={...test,questions:missed,index:0,answers:[],draft:'',listened:false,playing:false}}
    refresh(mode==='reading'&&action==='start');return true;
  }
  function startMixed(){
    ensureOwner();stopAudio();mode='mixed';
    const profile=getProfile(),level=[...(profile.attempts||[])].reverse().find(a=>a.level)?.level||5;
    const questions=buildMixedSession(profile,getItems(),getMaterials(),{voice:hasVoice(),level});
    settings={...defaults(),level:'all'};test=questions.length?{questions,index:0,answers:[],draft:'',listened:false,playing:false,settings:{...settings}}:null;term=null;refresh();
  }
  function openMistake(itemId,skill){
    ensureOwner();const item=getItems().find(i=>i.id===itemId);if(!item)return false;
    const question=mistakeQuestion({item,skill},getProfile(),getItems(),getMaterials());if(!question)return false;
    if(['dictation','listening'].includes(question.type)&&!hasVoice())return false;
    stopAudio();mode=skill.startsWith('conjugation:')?'conjugation':skill.startsWith('dictation:')?'dictation':skill.startsWith('comprehension:')?'reading':'mixed';
    settings={...defaults(),level:String(item.jlpt||'all')};test={questions:[{...question,skill}],passage:question.passage||null,index:0,answers:[],draft:'',listened:false,playing:false,settings:{...settings}};term=null;return true;
  }
  return {view,setMode,handleClick,handleChange,handleSubmit,handleInput,stopAudio,startMixed,openMistake};
}
