import {furiganaTokens} from './core.js';
export function passageSentences(passage){
  return (passage?.text.match(/[^。！？]+[。！？]?/gu)||[]).map(text=>{const tokens=furiganaTokens(text.trim());return {text:tokens.map(t=>t.text).join(''),reading:tokens.map(t=>t.reading||t.text).join('')}}).filter(s=>s.text.trim());
}
// Audio stays in memory. Leaving the passage or changing learners releases it.
export function createReadAlong({speak,stopSpeech,hasVoice,render,getOwner,env=globalThis}){
  let passage=null,owner=null,sentences=[],index=0,playing=false,all=false,rate=.8,status='',token=0,request=0,recorder=null,stream=null,timer=null,recording=false,requesting=false,clips=new Map();
  const releaseStream=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null};
  function stopRecording(discard=false){request++;requesting=false;clearTimeout(timer);timer=null;const active=recorder;recorder=null;recording=false;if(active){if(discard){active.onstop=null;active.ondataavailable=null}if(active.state!=='inactive')active.stop()}releaseStream()}
  function stop(){token++;playing=false;all=false;stopSpeech();stopRecording();}
  function dispose(){stopRecording(true);token++;playing=false;all=false;stopSpeech();for(const clip of clips.values())env.URL.revokeObjectURL(clip);clips.clear();passage=null;sentences=[];status=''}
  function setPassage(value){const id=getOwner();if(owner!==id||passage?.id!==value?.id){dispose();owner=id;passage=value;sentences=passageSentences(value);index=0}}
  function html(esc){
    if(!passage||!sentences.length)return '';
    const clip=clips.get(index),busy=recording||requesting;
    return `<section class="read-along" aria-label="Read along and shadowing"><h3>Read along & shadowing</h3><p class="small muted">Listen, repeat, then compare your own recording. Recordings stay on this device for this visit and are not included in backups.</p><div class="shadow-sentence" lang="ja">${esc(sentences[index].text)}</div><p class="shadow-status" role="status">Sentence ${index+1} of ${sentences.length}${status?' · '+esc(status):playing?' · Playing':''}</p><div class="shadow-controls"><button class="secondary" data-shadow="previous" ${index===0||busy?'disabled':''} aria-label="Previous sentence">Previous</button><button class="secondary" data-shadow="next" ${index===sentences.length-1||busy?'disabled':''} aria-label="Next sentence">Next</button><button class="primary" data-shadow="sentence" ${!hasVoice()||busy?'disabled':''}>Listen to sentence</button><button class="secondary" data-shadow="all" ${!hasVoice()||busy?'disabled':''}>Read entire passage</button><button class="secondary" data-shadow="stop" ${!playing?'disabled':''}>Stop audio</button><label class="shadow-speed" for="shadow-speed">Speed<select id="shadow-speed"><option value="0.6" ${rate===.6?'selected':''}>Slow</option><option value="0.8" ${rate===.8?'selected':''}>Relaxed</option><option value="1" ${rate===1?'selected':''}>Natural</option></select></label></div>${!hasVoice()?'<p class="small muted">Install a Japanese voice in Settings to listen.</p>':''}<div class="shadow-recording"><button class="${recording?'secondary':'primary'}" data-shadow="record" ${requesting?'disabled':''}>${requesting?'Waiting for microphone…':recording?'Stop recording':'Record yourself'}</button>${clip?`<audio controls preload="metadata" src="${esc(clip)}" aria-label="Your recording for sentence ${index+1}"></audio><button class="ghost" data-shadow="delete">Discard recording</button>`:''}<p class="small muted">Microphone access is requested only when you record. Recording stops after 30 seconds. Compare by listening; pronunciation is not automatically scored.</p></div></section>`;
  }
  function play(whole=false){
    if(!sentences.length||!hasVoice()||recording||requesting)return;
    token++;stopSpeech();const current=token;all=whole;if(whole)index=0;playing=true;status='';render();
    function next(){const sentence=sentences[index];if(!sentence)return;const accepted=speak(sentence.reading,{rate,onEnd:()=>{if(current!==token)return;if(all&&index<sentences.length-1){index++;render();next()}else{playing=false;all=false;render()}},onError:()=>{if(current!==token)return;playing=false;all=false;status='Audio stopped. Try another Japanese voice.';render()}});if(!accepted){playing=false;all=false;status='Japanese audio could not start.';render()}}
    next();
  }
  async function record(){
    if(recording){stopRecording();status='Recording saved for comparison.';render();return}
    if(requesting)return;
    if(!env.navigator?.mediaDevices?.getUserMedia||!env.MediaRecorder){status='Recording is unavailable in this browser. You can still listen and repeat.';render();return}
    token++;stopSpeech();playing=false;all=false;requesting=true;status='';const current=++request,selected=index,learner=owner;render();
    try{
      const media=await env.navigator.mediaDevices.getUserMedia({audio:true});
      if(current!==request||learner!==getOwner()||!passage){media.getTracks().forEach(t=>t.stop());return}
      stream=media;const chunks=[],active=new env.MediaRecorder(media);recorder=active;
      active.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      active.onerror=()=>{if(recorder!==active)return;stopRecording(true);status='Recording failed. Try again.';render()};
      active.onstop=()=>{if(current+1!==request&&current!==request)return;if(learner!==getOwner()||!passage)return;const blob=new Blob(chunks,{type:active.mimeType||'audio/webm'});if(blob.size){if(clips.has(selected))env.URL.revokeObjectURL(clips.get(selected));clips.set(selected,env.URL.createObjectURL(blob))}render()};
      active.start();requesting=false;recording=true;status='Recording…';timer=setTimeout(()=>{if(recorder===active){stopRecording();status='Recording stopped at 30 seconds.';render()}},30000);render();
    }catch(error){if(current!==request)return;requesting=false;stopRecording(true);status=error?.name==='NotAllowedError'?'Microphone permission was not granted. You can still listen and repeat.':'The microphone could not start. Check your device and try again.';render()}
  }
  function handleClick(d){if(!d.shadow)return false;if(!passage)return true;setPassage(passage);const action=d.shadow;
    if(action==='record'){void record();return true}
    if(action==='stop'){token++;playing=false;all=false;stopSpeech()}
    else if(action==='sentence'||action==='all'){play(action==='all');return true}
    else if(['previous','next'].includes(action)&&!recording&&!requesting){stop();index=Math.max(0,Math.min(sentences.length-1,index+(action==='next'?1:-1)));status=''}
    else if(action==='delete'){if(clips.has(index))env.URL.revokeObjectURL(clips.get(index));clips.delete(index);status='Recording discarded.'}
    render();return true;
  }
  function handleChange(element){if(element.id!=='shadow-speed')return false;if([.6,.8,1].includes(Number(element.value)))rate=Number(element.value);stop();render();return true}
  return {setPassage,html,handleClick,handleChange,stop,dispose};
}
