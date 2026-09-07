import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({setup:{towerRoomsLegacy:Array.from({length:11},()=>({hint:'legacy'}))}});
for(const path of ['src/48-tower-legacy.twee','src/50-tower-data.twee']) vm.runInContext(readFileSync(path,'utf8').split('\n').slice(1).join('\n'),context);
const api=context.setup;
const {towerAct:act,towerActions:actions,newTower}=api;
const step=(s,id)=>{assert(actions(s).some(a=>a.id===id),`${id} unavailable at ${s.floor}:${s.era}`);const before=JSON.stringify(s);const n=act(s,id);assert.notEqual(n,s);assert.equal(JSON.stringify(s),before,'transition mutated input');assert(n.charges>=0&&n.charges<=3);return n;};
const run=(s,ids)=>ids.reduce(step,s);
const go=(state,floor,era='present')=>{
 let s=state;
 if(s.era==='past')s=step(s,'shift');
 if(s.floor===0&&floor>0)s=run(s,['shift','up','shift']);
 while(s.floor<floor)s=step(s,'up');
 while(s.floor>floor)s=step(s,'down');
 if(s.era!==era)s=step(s,'shift');
 return s;
};
const take=(s,f,e,id)=>step(go(s,f,e),id);
const knowledge=()=>{
 let s=take(newTower(),1,'present','book');
 s=take(s,2,'present','rune');s=take(s,3,'present','sketch');
 return take(s,6,'present','loot');
};
const promise=s=>take(s,10,'past','promise');
const silence=s=>take(take(s,8,'past','shield'),9,'past','silenceBell');
const end=(s,id)=>step(go(s,10),id);
const terminal=s=>{assert.equal(actions(s).length,0);for(const id of ['shift','loot','free','pact','treasure','leave','bad'])assert.equal(act(s,id),s);};
let s=knowledge();
s=step(s,'rescueCharm');s=take(s,7,'present','ventCharm');s=take(s,10,'present','openCharm');
assert.equal(s.charges,0);assert.equal(s.ending,'','all three charge uses must be nonterminal');
s=silence(promise(s));s=end(s,'free');assert.equal(s.ending,'free');assert.equal(s.charges,0);terminal(s);
console.log('✓ Three distinct nonterminal charm uses consume all charges; full liberation remains possible');
s=knowledge();s=take(s,5,'present','rope');s=take(s,6,'present','rescueRope');assert.equal(s.rope,false);{const revisited=go(s,5);assert.equal(act(revisited,'rope'),revisited);}
s=take(s,4,'present','brush');s=take(s,7,'past','clearDrain');s=take(s,7,'present','ventWheel');
s=take(s,10,'present','wedgeSword');assert.equal(s.sword,false);s=step(s,'leverBeam');
s=end(silence(promise(s)),'free');assert.equal(s.charges,3);assert.equal(s.exitOpen,true);terminal(s);
console.log('✓ Difficult route uses rope, historical drain repair and sword lever; no charm charges spent');
// Deliberately exhaust the charm without completing the manual chain, then
// prove the reusable shield and historical route remain reachable from below.
s=knowledge();s=step(s,'rescueCharm');s=take(s,7,'present','ventCharm');s=take(s,10,'present','openCharm');
s=take(s,9,'past','silenceBell'); // Scroll is the only fire protection here.
assert.equal(s.scroll,false);assert.equal(s.charges,0);s=go(s,0);
s=end(promise(s),'free');assert.equal(s.ending,'free');
console.log('✓ Exhausted charm and scroll, return to base, then complete without hidden resource demand');
s=knowledge();s=step(s,'rescueCharm');s=take(s,3,'past','ledger');
s=take(s,5,'past','float');s=step(s,'decree');s=end(silence(promise(s)),'pact');
assert.equal(s.ending,'pact');assert.equal(s.exitOpen,false);assert.equal(s.vented,false);terminal(s);
assert.equal(api.towerEndingTitle(s),'未发出的出征令');
console.log('✓ Pact has distinct evidence/decree conditions and does not require opening the roof');
s=take(newTower(),6,'present','loot');s=end(s,'treasure');assert.equal(s.scroll,false);terminal(s);
s=take(newTower(),8,'past','shield');s=end(s,'treasure');assert.equal(s.shield,true);terminal(s);
s=step(newTower(),'leave');assert.equal(s.ending,'leave');terminal(s);
console.log('✓ Scroll and shield treasure endings plus voluntary departure');
s=newTower();for(const id of ['up','loot','free','pact','rescueCharm','bad'])assert.equal(act(s,id),s);
s=knowledge();
for(const id of ['loot','book','wedgeSword','free','decree'])assert.equal(act(s,id),s);
const queries=['towerActions','towerObjective','towerBlocked','towerInventory','towerEndingTitle'];
const before=JSON.stringify(s);for(const name of queries)api[name](s);assert.equal(JSON.stringify(s),before);
for(const id of ['rescueCharm'])s=step(s,id);
assert.equal(act(s,'rescueCharm'),s);assert.equal(act(s,'rescueRope'),s);assert.equal(s.charges,2);
s=take(s,7,'present','ventCharm');assert.equal(act(s,'ventCharm'),s);
s=take(s,10,'present','openCharm');assert.equal(act(s,'openCharm'),s);assert.equal(act(s,'wedgeSword'),s);
s=go(s,6);assert.equal(act(s,'loot'),s);assert.equal(s.charges,0);
console.log('✓ Invalid/repeated actions preserve object identity; queries are pure; rewards never refill');
// Every room in both eras is reachable with only travel, even after spending resources.
s=newTower();for(let f=0;f<=10;f++){s=go(s,f,'past');s=step(s,'shift');}
assert.equal(s.visited.length,22);
for(let f=10;f>=0;f--){s=go(s,f);if(f>0)assert(actions(s).some(a=>a.id==='down'));assert(actions(s).some(a=>a.id==='shift'));}
console.log('✓ All 22 scenes reachable and all nonterminal rooms permit retreat and time shift');
s=knowledge();s=step(s,'rescueCharm');
const loaded=JSON.parse(JSON.stringify(s));
assert.equal(JSON.stringify(act(loaded,'up')),JSON.stringify(act(s,'up')));
let savedRun=go(loaded,7);savedRun=step(savedRun,'ventCharm');savedRun=take(savedRun,10,'present','openCharm');savedRun=end(silence(promise(savedRun)),'free');assert.equal(savedRun.ending,'free');
let old=api.newTowerLegacy();assert.equal(old.version,1);assert.equal(api.towerBlocked(old)[0],'legacy');
old=run(old,['shift','up','book','up','rune','up','up','meal','up','serve','up','shift','loot','up','up','up','up','shift','promise','shift','free']);
assert.equal(old.ending,'free');assert.equal(old.charges,3);terminal(old);
const oldSaved=JSON.parse(JSON.stringify(api.newTowerLegacy()));assert.equal(JSON.stringify(act(oldSaved,'shift')),JSON.stringify(api.towerLegacyAct(oldSaved,'shift')));
console.log('✓ Version 2 JSON save resumes to completion; version 1 dispatch preserves original free/rune rules');

// The unlimited personal rune never substitutes for lifting heavy objects.
s=take(newTower(),2,'present','rune');s=go(s,7);assert.equal(act(s,'ventCharm'),s);assert.equal(act(s,'ventWheel'),s);s=go(s,10);assert.equal(act(s,'openCharm'),s);assert.equal(act(s,'leverBeam'),s);
console.log('✓ Personal rune cannot bypass heavy gates; v1 hints stay on the legacy projection');
// Four optional/primary heavy lifts compete for three charges. Taking names
// before rescue and ventilation leaves the roof dependent on the sword route.
let memorialState=take(knowledge(),8,'present','recoverNames');
assert.equal(memorialState.charges,2);assert.equal(memorialState.memorial,true);assert.equal(memorialState.ending,'');
assert.equal(act(memorialState,'recoverNames'),memorialState);
assert(api.towerInventory(memorialState).some(i=>i.label==='罹难者名册'));
s=take(memorialState,6,'present','rescueCharm');s=take(s,7,'present','ventCharm');
assert.equal(s.charges,0);s=go(s,10);assert.equal(act(s,'openCharm'),s);
s=step(s,'wedgeSword');
// Save with a spent sword and an unfinished roof operation, then finish.
s=JSON.parse(JSON.stringify(s));assert.equal(s.sword,false);s=step(s,'leverBeam');
s=end(silence(promise(s)),'free');assert.equal(s.ending,'free');assert.equal(s.charges,0);assert(s.message.includes('名册带回去'));terminal(s);
// Exhaustion blocks only the optional memorial, never travel or the main endings.
let withoutNames=knowledge();withoutNames=step(withoutNames,'rescueCharm');withoutNames=take(withoutNames,7,'present','ventCharm');withoutNames=take(withoutNames,10,'present','openCharm');withoutNames=go(withoutNames,8);
assert.equal(act(withoutNames,'recoverNames'),withoutNames);assert(api.towerBlocked(withoutNames).some(t=>t.includes('护符已耗尽')));
for(const ending of ['treasure','leave','pact']){
 let m=memorialState;
 if(ending==='pact'){
  m=take(m,6,'present','rescueCharm');m=take(m,3,'past','ledger');m=take(m,5,'past','float');m=step(m,'decree');m=end(silence(promise(m)),ending);
 }else if(ending==='leave')m=step(go(m,0),ending);
 else m=end(m,ending);
 assert.equal(m.ending,ending);assert(m.message.includes('名册带回去'));terminal(m);
}
console.log('✓ Four charm uses compete for three charges; memorial forces a manual roof, survives save, and pays off in all endings');
