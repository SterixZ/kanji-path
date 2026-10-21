export const DAY=86400000;
export function localDay(time=Date.now()){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// A compact SM-2-style scheduler. Progress is independent for each practice mode.
export function schedule(previous={},rating,now=Date.now()){
  if(![0,3,4,5].includes(rating))throw new Error('Invalid rating');
  let ease=Math.max(1.3,Number(previous.ease)||2.5),reps=Number(previous.reps)||0,interval=Number(previous.interval)||0;
  if(rating===0){reps=0;interval=0;return {...previous,ease,reps,interval,due:now+600000,last:now,lapses:(previous.lapses||0)+1,reviews:(previous.reviews||0)+1}}
  ease=Math.max(1.3,ease+0.1-(5-rating)*(0.08+(5-rating)*0.02));
  interval=reps===0?1:reps===1?6:Math.max(1,Math.round(interval*ease));
  if(rating===3)interval=Math.max(1,Math.round(interval*0.65));
  if(rating===5)interval=Math.max(3,Math.round(interval*1.3));
  return {...previous,ease,reps:reps+1,interval,due:now+interval*DAY,last:now,lapses:previous.lapses||0,reviews:(previous.reviews||0)+1};
}
export function resample(points,count=32){
  if(points.length<2)return Array.from({length:count},()=>points[0]||[0,0]);
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const total=lengths.at(-1);if(total===0)return Array.from({length:count},()=>points[0]);
  let k=1;return Array.from({length:count},(_,i)=>{const at=total*i/(count-1);while(k<lengths.length-1&&lengths[k]<at)k++;const t=(at-lengths[k-1])/(lengths[k]-lengths[k-1]||1);return [points[k-1][0]+t*(points[k][0]-points[k-1][0]),points[k-1][1]+t*(points[k][1]-points[k-1][1])]});
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function checkStroke(input,expected,lenient=true){
  if(input.length<2||expected.length<2)return {ok:false,message:'Draw a complete stroke.'};
  const a=resample(input),b=resample(expected);const start=dist(a[0],b[0]),end=dist(a.at(-1),b.at(-1));
  const forward=a.reduce((s,p,i)=>s+dist(p,b[i]),0)/a.length;
  const reverse=a.reduce((s,p,i)=>s+dist(p,b[b.length-1-i]),0)/a.length;
  if(reverse+3<forward&&reverse<16)return {ok:false,message:'Try drawing in the opposite direction.'};
  const limit=lenient?14:9;
  return {ok:forward<limit&&start<limit*1.7&&end<limit*1.7,message:start>limit*1.7?'Begin near the highlighted starting point.':end>limit*1.7?'Follow the stroke all the way to the end.':'Follow the shape of the highlighted stroke.',distance:forward};
}
export function validateBackup(data,validIds){
  if(!data||data.version!==1||!Array.isArray(data.profiles)||!data.profiles.length||data.profiles.length>50)throw new Error('This is not a Kanji Path backup.');
  const seen=new Set();
  return data.profiles.map(p=>{if(typeof p.id!=='string'||p.id.length>80||seen.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw new Error('Invalid learner profile.');seen.add(p.id);
    const cards={};for(const [key,c] of Object.entries(p.cards||{})){const [mode,...parts]=key.split(':');if(!['flash','write','listen','context'].includes(mode)||!validIds.has(parts.join(':')))continue;if(!c||!['due','last','reps','interval','ease','reviews','lapses'].every(f=>Number.isFinite(c[f])&&c[f]>=0)||c.ease<1.3||c.ease>10||c.interval>100000||c.due>8640000000000000)throw new Error('Invalid review data.');cards[key]=Object.fromEntries(['due','last','reps','interval','ease','reviews','lapses'].map(k=>[k,c[k]]));}
    const history=(Array.isArray(p.history)?p.history:[]).slice(-10000).filter(h=>h&&Number.isFinite(h.at)&&Number.isFinite(h.rating)&&[0,3,4,5].includes(h.rating)&&typeof h.key==='string');
    return {id:p.id,name:p.name.trim(),cards,history,goal:Math.min(100,Math.max(5,Number(p.goal)||10)),created:Number(p.created)||Date.now()};});
}
