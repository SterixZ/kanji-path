import {TEST_CATEGORIES,studiedMaterials,buildKnowledgeTest,gradeKnowledgeTest,shuffleQuestions,isCorrectAnswer} from './assessment.js';
import {updateMistake} from './mistakes.js';

export function createTestPage({getProfile,getItems,esc,jp,icon,pageHeading,persist,render,navigate}){
  const defaults=()=>({category:'all',level:'all',count:10,format:'choice',vocabTask:'reading',source:'studied'});
  let owner=null,test=null,settings=defaults();
  const ensureOwner=()=>{const id=getProfile().id;if(id!==owner){owner=id;test=null;settings=defaults()}};
  const refresh=()=>{render();(document.querySelector('#typed-answer:not(:disabled)')||document.querySelector('#test-question'))?.focus()};
  const answerFor=(question,answer)=>answer?.choice==='skip'?'Not sure':question.format==='typed'?answer?.text||'Not answered':question.options.find(option=>option.id===answer?.choice)?.text||'Not answered';
  const itemSummary=question=>{const item=getItems().find(item=>item.id===question.itemId);return item?`<span lang="ja">${esc(item.char)}</span><small lang="ja">${esc(item.reading||'')}</small>`:''};
  const eligible=()=>studiedMaterials(getProfile().cards,getItems(),{...settings,itemIds:settings.source==='mistakes'?Object.keys(getProfile().mistakes||{}):null}).filter(item=>settings.format!=='typed'||item.kind!=='grammar');
  const select=(id,label,options,value)=>`<div class="form-row"><label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`;

  function view(){
    ensureOwner();
    if(test)return test.index<test.questions.length?questionView():resultsView();
    const profile=getProfile(),all=studiedMaterials(profile.cards,getItems()),selection=eligible(),history=profile.tests||[],selected=Math.min(settings.count,selection.length);
    return `${pageHeading('Test yourself.','Recall what you have learned, then see what needs another look.')}
      <div class="test-overview"><div><b>${all.length.toLocaleString()}</b><span>items practiced</span></div><div><b>${selection.length.toLocaleString()}</b><span>in this selection</span></div><div><b>${history.length}</b><span>recent tests saved</span></div></div>
      <div class="test-setup-grid"><section class="panel test-setup"><h2>Build your test</h2>
      ${select('test-source','Question source',[['studied','All practiced items'],['mistakes','Mistake notebook']],settings.source)}
      ${select('test-category','Material',Object.entries(TEST_CATEGORIES),settings.category)}
      ${select('test-level','Estimated JLPT level',[['all','All levels'],...[5,4,3,2,1].map(n=>[n,'N'+n])],settings.level)}
      ${select('test-format','Answer format',[['choice','Multiple choice'],['typed','Type answers']],settings.format)}
      ${settings.format==='typed'?select('test-vocab-task','Vocabulary questions',[['reading','Type the kana reading'],['meaning','Type an English meaning']],settings.vocabTask):''}
      ${select('test-size','Test length',[5,10,20].map(n=>[n,`Up to ${n} questions`]),settings.count)}
      ${settings.format==='typed'?'<p class="small muted">Vocabulary: type the selected reading or meaning. Kanji: English meaning. Kana: romaji. Sentences: the missing Japanese word. Grammar uses multiple choice, so it is excluded here.</p>':''}
      ${selection.length?`<p class="small muted">${selected} question${selected===1?'':'s'} ready · one per studied item.</p>`:`<div class="notice">${settings.source==='mistakes'?'No unresolved mistakes match these filters. Correct answers clear items from the notebook.':all.length?'No practiced items match these filters. Try another selection or answer format.':'Complete a lesson or answer a practice card first. Browsing alone does not add test material.'}</div>`}
      <div class="button-row"><button class="primary" data-test-action="start" ${!selection.length?'disabled':''}>Start test ${icon('arrow')}</button><button class="secondary" data-nav="learn">Learning path</button></div></section>
      <section class="panel"><h2>Make recall a habit</h2><ul class="test-info"><li>Choose multiple choice or type answers from memory.</li><li>Incorrect answers and “not sure” go into your mistake notebook immediately.</li><li>A correct answer clears that item from the notebook.</li><li>Scores and mistakes stay with this learner and are included in backups.</li></ul><p class="small muted">Typed answers use the bundled readings and English meanings, with forgiving capitalization, spacing, and kana variants. Unlisted synonyms may need another try. Tests do not change your daily review schedule.</p><button class="text-link" data-nav="mistakes">Open mistake notebook ${icon('arrow')}</button></section></div>
      <section class="panel test-history"><h2>Recent test scores</h2>${history.length?history.slice().reverse().map(result=>`<div class="test-history-row"><span><strong>${esc(TEST_CATEGORIES[result.category])}${result.level!=='all'?' · N'+result.level:''}</strong><small>${esc(new Date(result.at).toLocaleString('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</small></span><span>${result.correct} / ${result.total}</span><b>${Math.round(result.correct/result.total*100)}%</b></div>`).join(''):'<p class="small muted">Your completed tests will appear here.</p>'}</section>`;
  }

  function questionView(){
    const question=test.questions[test.index],answer=test.answers.find(a=>a.questionId===question.id),score=gradeKnowledgeTest(test.questions,test.answers),correct=isCorrectAnswer(question,answer);
    const typed=question.format==='typed';
    return `${pageHeading('Test yourself.','Take your time. Recall before checking the answer.')}<section class="panel test-question-panel"><div class="test-question-top"><span>Question ${test.index+1} of ${test.questions.length}</span><span>${score.correct} correct so far</span></div><div class="stat-line"><i style="width:${test.index/test.questions.length*100}%"></i></div><h2 id="test-question" tabindex="-1">${esc(question.title)}</h2><div class="test-prompt ${question.type==='cloze'?'test-cloze':''}" lang="ja">${esc(question.prompt)}</div>${question.reading?`<p class="test-reading" lang="ja">${esc(question.reading)}</p>`:''}${question.hint?`<p class="test-hint">${esc(question.hint)}</p>`:''}
      ${typed?`<form id="typed-answer-form" class="typed-answer-form"><label for="typed-answer">Your answer</label><input class="input" id="typed-answer" name="answer" maxlength="300" autocomplete="off" autocapitalize="none" spellcheck="false" ${['reading','cloze'].includes(question.type)?'lang="ja"':''} value="${esc(answer?.text||'')}" ${answer?'disabled':''} required><p class="small muted">${question.type==='reading'?'Hiragana and katakana are both accepted. Use your Japanese keyboard.':question.type==='meaning'?'Use one of the word’s English meanings. Capitalization does not matter.':question.type==='kana'?'Type the sound using Latin letters, such as shi or si.':'Use Japanese characters for the missing word.'}</p><button class="primary" type="submit" ${answer?'disabled':''}>Check answer ${icon('check')}</button></form>`:`<div class="options test-options">${question.options.map(option=>`<button class="option test-option ${answer?(option.id===question.correctChoice?'correct':option.id===answer.choice?'wrong':''):''}" data-test-choice="${option.id}" ${answer?'disabled':''}>${esc(option.text)}</button>`).join('')}</div>`}
      ${answer?`<div class="test-feedback ${correct?'success':'error'}" role="status"><strong>${correct?'Correct.':'Keep practicing.'}</strong><p>Answer: ${esc(question.answer)}</p>${!correct?`<p>Your answer: ${esc(answerFor(question,answer))}</p><p class="small">Saved to your mistake notebook.</p>`:''}</div>`:''}<div class="test-controls"><button class="ghost" data-test-action="exit">Exit test</button>${answer?`<button class="primary" data-test-action="next">${test.index===test.questions.length-1?'See results':'Next question'} ${icon('arrow')}</button>`:'<button class="secondary" data-test-choice="skip">I’m not sure</button>'}</div></section>`;
  }

  function resultsView(){
    const score=gradeKnowledgeTest(test.questions,test.answers);
    return `${pageHeading('Your test results.','Review the answers and give the difficult ones another try.')}<section class="panel test-results"><div class="test-score">${score.percent}%</div><h2>${score.correct} of ${score.total} correct</h2><p>${score.missed.length?'Missed items are saved in your mistake notebook.':'You remembered every answer in this test.'}</p><p class="small muted">Score saved for ${esc(getProfile().name)}.</p><div class="button-row">${score.missed.length?'<button class="primary" data-test-action="retry">Retry missed questions</button>':''}<button class="secondary" data-test-action="reset">Choose another test</button><button class="secondary" data-nav="mistakes">Mistake notebook</button></div></section><section class="panel test-answer-review"><h2>Answer review</h2>${test.questions.map(question=>{const answer=test.answers.find(a=>a.questionId===question.id),correct=isCorrectAnswer(question,answer);return `<article class="test-answer-row"><div class="test-answer-heading">${itemSummary(question)}<span class="tag">${correct?'Correct':'Review again'}</span></div><p class="small muted">${esc(question.title)}</p><p><strong>Answer:</strong> ${esc(question.answer)}</p>${!correct?`<p class="small">Your answer: ${esc(answerFor(question,answer))}</p>`:''}<button class="text-link" data-detail="${esc(question.itemId)}">Review this item ${icon('chevron')}</button></article>`}).join('')}</section>`;
  }

  function submitAnswer(answer){
    if(!test||test.index>=test.questions.length)return;
    const question=test.questions[test.index];
    if(test.answers.some(a=>a.questionId===question.id))return;
    test.answers.push({questionId:question.id,...answer});
    updateMistake(getProfile(),question.itemId,isCorrectAnswer(question,answer),'test');persist();refresh();
  }
  function handleSubmit(form,event){
    if(form.id!=='typed-answer-form')return false;
    event.preventDefault();ensureOwner();
    const input=form.querySelector('input'),text=input?.value.trim();
    if(test?.questions[test.index]?.format==='typed'&&text)submitAnswer({text:text.slice(0,300)});
    return true;
  }
  function handleChange(element){
    if(!['test-category','test-level','test-size','test-source','test-format','test-vocab-task'].includes(element.id))return false;
    ensureOwner();
    if(element.id==='test-category')settings.category=Object.hasOwn(TEST_CATEGORIES,element.value)?element.value:'all';
    else if(element.id==='test-level')settings.level=['all','1','2','3','4','5'].includes(element.value)?element.value:'all';
    else if(element.id==='test-size')settings.count=[5,10,20].includes(Number(element.value))?Number(element.value):10;
    else if(element.id==='test-source')settings.source=element.value==='mistakes'?'mistakes':'studied';
    else if(element.id==='test-format')settings.format=element.value==='typed'?'typed':'choice';
    else settings.vocabTask=element.value==='meaning'?'meaning':'reading';
    render();return true;
  }
  function handleClick(dataset){
    if(!dataset.testAction&&!dataset.testChoice)return false;
    ensureOwner();
    if(dataset.testAction==='start'){
      const questions=buildKnowledgeTest(getProfile().cards,getItems(),{...settings,itemIds:settings.source==='mistakes'?Object.keys(getProfile().mistakes||{}):null});
      if(questions.length)test={questions,index:0,answers:[],settings:{...settings}};
    }else if(dataset.testAction==='reset'||dataset.testAction==='exit')test=null;
    else if(dataset.testChoice&&test&&test.index<test.questions.length){
      const question=test.questions[test.index],choice=dataset.testChoice;
      if(choice==='skip'||question.options.some(option=>option.id===choice)){submitAnswer({choice});return true}
    }else if(dataset.testAction==='next'&&test&&test.index<test.questions.length&&test.answers.some(a=>a.questionId===test.questions[test.index].id)){
      test.index++;
      if(test.index===test.questions.length){
        const score=gradeKnowledgeTest(test.questions,test.answers),profile=getProfile();
        profile.tests=[...(profile.tests||[]),{at:Date.now(),total:score.total,correct:score.correct,category:test.settings.category,level:test.settings.level}].slice(-30);
        persist();window.scrollTo({top:0,behavior:'instant'});
      }
    }else if(dataset.testAction==='retry'&&test&&test.index===test.questions.length){
      const missed=gradeKnowledgeTest(test.questions,test.answers).missed;
      if(missed.length)test={questions:shuffleQuestions(missed),index:0,answers:[],settings:{...test.settings}};
    }
    refresh();return true;
  }
  function openMistakes(){ensureOwner();test=null;settings={...defaults(),source:'mistakes'};navigate('test')}
  return {view,handleClick,handleChange,handleSubmit,openMistakes};
}
