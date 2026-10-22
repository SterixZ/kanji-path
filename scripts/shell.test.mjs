import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute,activePhoneTab,PHONE_TABS,shellHTML} from '../dist/shell.js';

test('existing hash routes remain valid, More is supported, and unknown routes fall back safely',()=>{
  for(const route of ['home','learn','library','review','test','grammar','mistakes','progress','settings','more'])assert.equal(resolveRoute('#'+route),route);
  for(const value of ['',null,'unknown','__proto__','constructor'])assert.equal(resolveRoute(value),'home');
});
test('secondary routes map to their phone tab without adding storage or changing their route',()=>{
  assert.equal(PHONE_TABS.length,5);
  assert.deepEqual(PHONE_TABS.map(([route])=>route),['home','review','library','test','more']);
  assert.equal(activePhoneTab('learn'),'home');
  for(const route of ['grammar','mistakes','progress','settings'])assert.equal(activePhoneTab(route),'more');
  for(const route of ['home','review','library','test','more'])assert.equal(activePhoneTab(route),route);
});
test('shell announces due reviews and the current route while escaping learner names',()=>{
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const markup=shellHTML({view:'grammar',learner:{name:'<script>name</script>'},due:104,streak:2,online:false,storageOK:true,content:'<h1>Grammar</h1>',esc,icon:()=>'<svg></svg>'});
  const phone=markup.slice(markup.indexOf('<nav class="bottom-nav"'));
  assert.equal((phone.match(/aria-current="page"/g)||[]).length,1);
  assert.match(phone,/data-nav="more" class="active"/);assert.match(phone,/Reviews, 104 due/);assert.match(phone,/99\+/);
  assert.ok(!markup.includes('<script>name'));assert.ok(markup.includes('&lt;script&gt;name&lt;/script&gt;'));
  assert.match(markup,/Offline/);assert.match(markup,/<h1>Grammar<\/h1>/);
});
