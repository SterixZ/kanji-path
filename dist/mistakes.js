// Store item IDs and counts, rather than every answer a learner types.
export function updateMistake(profile,itemId,correct,source='practice',now=Date.now()){
  profile.mistakes??={};
  if(correct){delete profile.mistakes[itemId];return}
  const previous=profile.mistakes[itemId];
  profile.mistakes[itemId]={count:Math.min(100000,(previous?.count||0)+1),last:now,source};
}

export function validateMistakes(value,validIds){
  const result={};
  for(const [id,entry] of Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{})){
    if(!validIds.has(id)||!entry||!Number.isInteger(entry.count)||entry.count<1||entry.count>100000||!Number.isFinite(entry.last)||entry.last<0||entry.last>8640000000000000||!['practice','test'].includes(entry.source))continue;
    result[id]={count:entry.count,last:entry.last,source:entry.source};
  }
  return result;
}

// Older backups can recover unresolved practice mistakes from their saved history.
export function migrateMistakes(profile,validIds){
  if(profile.mistakes!==undefined)return validateMistakes(profile.mistakes,validIds);
  const migrated={mistakes:{}};
  for(const event of [...(profile.history||[])].sort((a,b)=>a.at-b.at)){
    const [mode,...parts]=String(event.key).split(':'),id=parts.join(':');
    if(['flash','write','listen','context'].includes(mode)&&validIds.has(id)&&[0,3,4,5].includes(event.rating)&&Number.isFinite(event.at)&&event.at>=0&&event.at<=8640000000000000)updateMistake(migrated,id,event.rating!==0,'practice',event.at);
  }
  return migrated.mistakes;
}

export function mistakeItems(profile,items){
  return items.filter(item=>profile.mistakes?.[item.id]).sort((a,b)=>profile.mistakes[b.id].last-profile.mistakes[a.id].last);
}
