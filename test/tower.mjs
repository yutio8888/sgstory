import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
const ctx = vm.createContext({setup:{}});
vm.runInContext(readFileSync('src/50-tower-data.twee','utf8').split('\n').slice(1).join('\n'),ctx);
const {newTower,towerAct:act,towerActions:actions,towerRooms} = ctx.setup;
const step = (s,id) => { assert(actions(s).some(a=>a.id===id), `行动不可用 ${id} @ ${s.floor}:${s.era}`); return act(s,id); };
const route = (ids) => ids.reduce(step,newTower());
const climb = n => Array(n).fill('up');
let s = newTower();
assert.equal(act(s,'up'),s);
assert.equal(act(s,'loot'),s);
assert.equal(act(s,'bad'),s);
assert.equal(towerRooms.length,11);
const before=JSON.stringify(s); actions(s); assert.equal(JSON.stringify(s),before);
s=route(['shift','up','book','up','rune','up','sketch','up','meal','up','serve','up','shift','loot','up','up','shift','shield','shift','up','up','shift','promise','shift','free']);
assert.equal(s.ending,'free'); assert.equal(s.charges,3);
assert.equal(act(s,'free'),s); assert.equal(actions(s).length,0);
console.log('✓ 送餐＋符文和平路线；结局无重复结算');
s=route(['shift','up','book','up','up','up','up','shift','up','loot',...climb(4),'shift','promise','shift','free']);
assert.equal(s.ending,'free'); assert.equal(s.charges,2);
console.log('✓ 无符文护符和平路线；只消耗一次');
s=route(['shift',...climb(5),'shift','up','loot',...climb(4),'treasure']);
assert.equal(s.ending,'treasure'); assert.equal(s.scroll,false);
s=route(['shift',...climb(5),'shift',...climb(3),'shift','shield','shift','up','up','treasure']);
assert.equal(s.ending,'treasure'); assert.equal(s.shield,true);
assert.equal(route(['leave']).ending,'leave');
console.log('✓ 卷轴取宝、盾牌取宝和撤离结局');
s=route(['shift',...climb(5)]); assert.equal(act(s,'up'),s);
s=route(['shift','up','up','rune',...climb(3),'float','up']); assert.equal(s.floor,6);
s=route(['shift',...climb(5),'shift','up','loot']);
const snapshot=JSON.stringify(s); assert.equal(act(s,'loot'),s); assert.equal(JSON.stringify(s),snapshot);
s=step(step(s,'down'),'up'); assert.equal(s.charges,3); assert.equal(act(s,'loot'),s);
console.log('✓ 守卫阻挡与浮空绕行；回访无法刷遗物');
// Walk both eras on all floors using only available actions; every ordinary
// floor allows retreat and every state allows shifting, so missed clues recover.
s=route(['shift','up','shift']);
for(let f=1;f<=10;f++) {
 assert.equal(s.floor,f); assert.equal(s.era,'present');
 s=step(s,'shift'); s=step(s,'shift');
 if(f<10) s=step(s,'up');
}
for(let f=10;f>0;f--) s=step(s,'down');
assert.equal(s.visited.length,22);
assert.equal(JSON.stringify(act(JSON.parse(JSON.stringify(s)),'shift')),JSON.stringify(act(s,'shift')));
console.log('✓ 22 个时态场景可达、全程可回退，序列化后可继续');

const dom = new JSDOM(readFileSync('dist/index.html','utf8'),{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole()});
const w=dom.window;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try {
 await sleep(1200);
 const sc=w.SugarCube;
 new sc.Wikifier(null,w.document.querySelector('tw-passagedata[name="StoryInit"]').textContent);
 sc.Engine.start(); await sleep(300);
 const click=async label=>{
  const link=[...w.document.querySelectorAll('#passages a.link-internal')].find(a=>a.textContent===label);
  assert(link,`缺少链接 ${label} @ ${sc.State.passage}`); link.click(); await sleep(120);
  assert.equal(w.document.querySelectorAll('#passages .error').length,0,w.document.querySelector('#passages').textContent);
 };
 await click('探索诺斯塔之塔'); await click('快速成型'); await click('出发，前往诺斯塔之塔');
 const pcBefore=JSON.stringify(sc.State.variables.pc);
 const uiStep=async id=>{
  const action=sc.setup.towerActions(sc.State.variables.tower).find(a=>a.id===id);
  assert(action,`缺少行动 ${id}`); await click(action.label);
 };
 assert.equal(sc.State.passage,'诺斯塔之塔');
 assert(!w.document.querySelector('.tower-map').textContent.includes('塔冠'));
 // Details must not consume actions or resources.
 const stateBefore=JSON.stringify(sc.State.variables.tower);
 w.document.querySelector('summary').click();
 assert.equal(JSON.stringify(sc.State.variables.tower),stateBefore);
 for(const id of ['shift','up','book','up','rune']) await uiStep(id);
 // Exercise SugarCube's actual portable save, load and history, not only JSON.
 const savedTower=JSON.stringify(sc.State.variables.tower);
 const save=sc.Save.base64.save();
 await uiStep('up');
 await sc.Save.base64.load(save); await sleep(200);
 assert.equal(JSON.stringify(sc.State.variables.tower),savedTower);
 await uiStep('up'); sc.Engine.backward(); await sleep(200);
 assert.equal(JSON.stringify(sc.State.variables.tower),savedTower);
 for(const id of ['up','up','meal','up','serve','up','shift','loot','up','up','shift','shield','shift','up','up','shift','promise','shift','free']) await uiStep(id);
 assert.equal(sc.State.variables.tower.ending,'free');
 assert(w.document.querySelector('.ending-card').textContent.includes('梁外的天空'));
 assert.equal(JSON.stringify(sc.State.variables.pc),pcBefore);
 assert.equal(w.document.querySelectorAll('.tower-actions a').length,0);
 console.log('✓ 实际 HTML：车卡入口、完整和平路线、提示零消耗、存读档与回退、原角色不受影响');
} finally { dom.window.close(); }
