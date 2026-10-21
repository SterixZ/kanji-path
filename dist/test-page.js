import {TEST_CATEGORIES,studiedMaterials,buildKnowledgeTest,gradeKnowledgeTest,shuffleQuestions} from './assessment.js';

export function createTestPage({getProfile,getItems,esc,jp,icon,pageHeading,persist,render}){
  let owner=null,test=null,settings={category:'all',level:'all',count:10};
  const ensureOwner=()=>{const id=getProfile().id;if(id!==owner){owner=id;test=null;settings={category:'all',level:'all',count:10}}};
  const refresh=()=>{render();document.querySelector('#test-question')?.focus()};
  const answerFor=(question,answer)=>answer?.choice==='skip'?'Not sure':question.options.find(option=>option.id===answer?.choice)?.text||'Not answered';
  const itemSummary=question=>{const item=getItems().find(item=>item.id===question.itemId);return item?`<span lang="ja">${esc(item.char)}</span><small lang="ja">${esc(item.reading||[...(item.on||[]).slice(0,1),...(item.kun||[]).slice(0,1)].join(' / '))}</small>`:''};

  function view(){
    ensureOwner();
    if(test)return test.index<test.questions.length?questionView():resultsView();
    const profile=getProfile(),all=studiedMaterials(profile.cards,getItems()),eligible=studiedMaterials(profile.cards,getItems(),settings),history=profile.tests||[];
    const selected=Math.min(settings.count,eligible.length),levelDisabled=['kana','sentences'].includes(settings.category);
    return `${pageHeading('Test yourself.','Find out what you remember from the material you’ve practiced.')}<div class="test-overview"><div><b>${all.length.toLocaleString()}</b><span>items practiced</span></div><div><b>${eligible.length.toLocaleString()}</b><span>in this selection</span></div><div><b>${history.length}</b><span>recent tests saved</span></div></div><div class="test-setup-grid"><section class="panel test-setup"><h2>Build your test</h2><p>Questions come from items you have already answered in lessons or practice, including items you are still learning.</p><div class="form-row"><label for="test-category">Material</label><select id="test-category">${Object.entries(TEST_CATEGORIES).map(([value,label])=>`<option value="${value}" ${settings.category===value?'selected':''}>${label}</option>`).join('')}</select></div><div class="form-row"><label for="test-level">Estimated JLPT level</label><select id="test-level" ${levelDisabled?'disabled':''}><option value="all">All levels</option>${[5,4,3,2,1].map(n=>`<option value="${n}" ${settings.level===String(n)?'selected':''}>N${n}</option>`).join('')}</select></div><div class="form-row"><label for="test-size">Test length</label><select id="test-size">${[5,10,20].map(n=>`<option value="${n}" ${settings.count===n?'selected':''}>Up to ${n} questions</option>`).join('')}</select></div>${eligible.length?`<p class="small muted">${selected} question${selected===1?'':'s'} ready · one question per studied item.</p>`:`<div class="notice">${all.length?'No practiced items match these filters. Try another selection.':'Complete a lesson or answer a practice card first. Browsing the library alone does not add test material.'}</div>`}<div class="button-row"><button class="primary" data-test-action="start" ${!eligible.length?'disabled':''}>Start test ${icon('arrow')}</button>${!eligible.length?'<button class="secondary" data-nav="learn">Go to learning path</button>':''}</div></section><section class="panel"><h2>A check on your learning</h2><ul class="test-info"><li>Kanji meanings, vocabulary meanings and readings, kana sounds, and sentence gaps.</li><li>Get feedback after each answer, then review your missed questions.</li><li>Test scores stay with this learner and are included in backups.</li></ul><p class="small muted">Question targets are material you have practiced. Tests save scores separately from daily reviews.</p></section></div><section class="panel test-history"><h2>Recent test scores</h2>${history.length?history.slice().reverse().map(result=>`<div class="test-history-row"><span><strong>${esc(TEST_CATEGORIES[result.category])}${result.level!=='all'?' · N'+result.level:''}</strong><small>${esc(new Date(result.at).toLocaleString('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</small></span><span>${result.correct} / ${result.total}</span><b>${Math.round(result.correct/result.total*100)}%</b></div>`).join(''):'<p class="small muted">Your completed tests will appear here.</p>'}</section>`;
  }

  function questionView(){
    const question=test.questions[test.index],answer=test.answers.find(answer=>answer.questionId===question.id),score=gradeKnowledgeTest(test.questions,test.answers);
    return `${pageHeading('Test yourself.','Take your time. Try recalling before choosing an answer.')}<section class="panel test-question-panel"><div class="test-question-top"><span>Question ${test.index+1} of ${test.questions.length}</span><span>${score.correct} correct so far</span></div><div class="stat-line"><i style="width:${test.index/test.questions.length*100}%"></i></div><h2 id="test-question" tabindex="-1">${esc(question.title)}</h2><div class="test-prompt ${question.type==='cloze'?'test-cloze':''}" lang="ja">${esc(question.prompt)}</div>${question.reading?`<p class="test-reading" lang="ja">${esc(question.reading)}</p>`:''}${question.hint?`<p class="test-hint">${esc(question.hint)}</p>`:''}<div class="options test-options">${question.options.map(option=>`<button class="option test-option ${answer?(option.id===question.correctChoice?'correct':option.id===answer.choice?'wrong':''):''}" data-test-choice="${option.id}" ${answer?'disabled':''} ${question.type==='reading'||question.type==='cloze'?'lang="ja"':''}>${esc(option.text)}</button>`).join('')}</div>${answer?`<div class="test-feedback ${answer.choice===question.correctChoice?'success':'error'}" role="status"><strong>${answer.choice===question.correctChoice?'Correct.':'Keep practicing.'}</strong><p>Answer: ${question.type==='reading'||question.type==='cloze'?jp(question.answer):esc(question.answer)}</p>${answer.choice!==question.correctChoice?`<p>Your answer: ${esc(answerFor(question,answer))}</p>`:''}</div>`:''}<div class="test-controls"><button class="ghost" data-test-action="exit">Exit test</button>${answer?`<button class="primary" data-test-action="next">${test.index===test.questions.length-1?'See results':'Next question'} ${icon('arrow')}</button>`:'<button class="secondary" data-test-choice="skip">I’m not sure</button>'}</div></section>`;
  }

  function resultsView(){
    const score=gradeKnowledgeTest(test.questions,test.answers);
    return `${pageHeading('Your test results.','A useful snapshot of what you remember today.')}<section class="panel test-results"><div class="test-score">${score.percent}%</div><h2>${score.correct} of ${score.total} correct</h2><p>${score.missed.length?'Review the answers below and try the missed questions again.':'You remembered every answer in this test.'}</p><p class="small muted">Score saved for ${esc(getProfile().name)}.</p><div class="button-row">${score.missed.length?'<button class="primary" data-test-action="retry">Retry missed questions</button>':''}<button class="secondary" data-test-action="reset">Choose another test</button></div></section><section class="panel test-answer-review"><h2>Answer review</h2>${test.questions.map(question=>{const answer=test.answers.find(answer=>answer.questionId===question.id),correct=answer?.choice===question.correctChoice;return `<article class="test-answer-row"><div class="test-answer-heading">${itemSummary(question)}<span class="tag">${correct?'Correct':'Review again'}</span></div><p class="small muted">${esc(question.title)}</p><p><strong>Answer:</strong> ${esc(question.answer)}</p>${!correct?`<p class="small">Your answer: ${esc(answerFor(question,answer))}</p>`:''}<button class="text-link" data-detail="${esc(question.itemId)}">Review this item ${icon('chevron')}</button></article>`}).join('')}</section>`;
  }

  function handleChange(element){
    if(!['test-category','test-level','test-size'].includes(element.id))return false;
    ensureOwner();
    if(element.id==='test-category'){settings.category=Object.hasOwn(TEST_CATEGORIES,element.value)?element.value:'all';if(['kana','sentences'].includes(settings.category))settings.level='all'}
    else if(element.id==='test-level')settings.level=['all','1','2','3','4','5'].includes(element.value)?element.value:'all';
    else settings.count=[5,10,20].includes(Number(element.value))?Number(element.value):10;
    render();return true;
  }

  function handleClick(dataset){
    if(!dataset.testAction&&!dataset.testChoice)return false;
    ensureOwner();
    if(dataset.testAction==='start'){
      const questions=buildKnowledgeTest(getProfile().cards,getItems(),settings);
      if(questions.length)test={questions,index:0,answers:[],settings:{...settings}};
    }else if(dataset.testAction==='reset'||dataset.testAction==='exit')test=null;
    else if(dataset.testChoice&&test&&test.index<test.questions.length){
      const question=test.questions[test.index],choice=dataset.testChoice;
      if(!test.answers.some(answer=>answer.questionId===question.id)&&(choice==='skip'||question.options.some(option=>option.id===choice)))test.answers.push({questionId:question.id,choice});
    }else if(dataset.testAction==='next'&&test&&test.index<test.questions.length&&test.answers.some(answer=>answer.questionId===test.questions[test.index].id)){
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
  return {view,handleClick,handleChange};
}
