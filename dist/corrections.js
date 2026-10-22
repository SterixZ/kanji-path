// Unicode character alignment. This illustrates edits; it does not diagnose grammar.
const normalize=text=>String(text||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\p{White_Space}\p{Punctuation}]/gu,'');
export function alignCorrection(input,expected){
  const a=Array.from(normalize(input)).slice(0,300),b=Array.from(normalize(expected)).slice(0,300),d=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  let i=a.length,j=b.length;const edits=[];
  while(i||j){if(i&&j&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){edits.push({type:a[i-1]===b[j-1]?'same':'change',actual:a[--i],expected:b[--j]})}else if(j&&d[i][j]===d[i][j-1]+1)edits.push({type:'missing',actual:'',expected:b[--j]});else edits.push({type:'extra',actual:a[--i],expected:''})}
  return {distance:d[a.length][b.length],edits:edits.reverse()};
}
export function correctionFor(question,input){
  const mixed=question.segments?.map(t=>t.reading&&normalize(input).includes(normalize(t.reading))?t.reading:t.text).join('');
  const candidates=[...new Set([question.answer,...(question.acceptedAnswers||[]),mixed].filter(Boolean))];
  return candidates.map(expected=>({expected,...alignCorrection(input,expected)})).sort((a,b)=>a.distance-b.distance)[0];
}
export function correctionHTML(question,answer,esc){
  if(!answer?.text)return '';
  const result=correctionFor(question,answer.text);if(!result?.distance)return '';
  const actual=result.edits.filter(e=>e.actual).map(e=>e.type==='same'?esc(e.actual):`<del>${esc(e.actual)}</del>`).join('');
  const expected=result.edits.filter(e=>e.expected).map(e=>e.type==='same'?esc(e.expected):`<mark>${esc(e.expected)}</mark>`).join('');
  return `<div class="answer-correction"><p class="correction-label">Your answer · crossed out = change or remove</p><p class="correction-text" lang="ja">${actual||'—'}</p><p class="correction-label">Correction · highlighted = add or replace</p><p class="correction-text" lang="ja">${expected}</p><p class="small muted">Comparison ignores spacing, punctuation, and kana style.</p></div>`;
}
