import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

// Exercise the compiled story and SugarCube's own navigation/save APIs. No
// resolver calls or synthesized tower states are used to traverse either game.
const fixture = JSON.parse(readFileSync('test/fixtures/nousta-v1-save.json', 'utf8'));
const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => {
 if (error.type !== 'not-implemented') runtimeErrors.push(error.message);
});
const dom = new JSDOM(readFileSync('dist/index.html', 'utf8'), {
 runScripts: 'dangerously', pretendToBeVisual: true,
 url: 'http://localhost/', virtualConsole
});
const w = dom.window;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const json = value => JSON.stringify(value);
try {
 await sleep(1200);
 const sc = w.SugarCube;
 assert(sc, 'SugarCube runtime did not initialize');
 new sc.Wikifier(null, w.document.querySelector('tw-passagedata[name="StoryInit"]').textContent);
 sc.Engine.start();
 await sleep(300);
 const current = () => w.document.querySelector('#passages .passage:last-child');
 const clean = () => {
  assert.equal(w.document.querySelectorAll('#passages .error').length, 0,
   w.document.querySelector('#passages')?.textContent);
  assert.deepEqual(runtimeErrors, [], 'Unexpected browser runtime error');
 };
 const click = async (label, index = 0) => {
  const links = [...current().querySelectorAll('a.link-internal')].filter(a => a.textContent === label);
  assert(links[index], `Missing UI link ${label} @ ${sc.State.passage}`);
  links[index].click();
  await sleep(140);
  clean();
 };
 const state = () => sc.State.variables.tower;
 const step = async id => {
  const before = json(state());
  const action = sc.setup.towerActions(state()).find(a => a.id === id);
  assert.equal(json(state()), before, 'Action queries mutated state');
  assert(action, `Missing action ${id} @ ${state().version}/${state().floor}:${state().era}`);
  await click(action.label);
  assert.notEqual(json(state()), before, `UI action ${id} did not advance state`);
 };
 const route = async ids => { for (const id of ids) await step(id); };
 const inspectDetails = () => {
  const before = json(sc.State.variables);
  const historyLength = sc.State.length;
  const summaries = [...current().querySelectorAll('details > summary')];
  assert(summaries.some(s => s.textContent.includes('探险手记')), 'Journal control missing');
  assert(summaries.some(s => s.textContent.includes('提示')), 'Hint control missing');
  for (const summary of summaries) { summary.click(); summary.click(); }
  assert.equal(json(sc.State.variables), before, 'Details changed story variables');
  assert.equal(sc.State.length, historyLength, 'Details created a history turn');
  clean();
 };
 assert(w.getComputedStyle(current().querySelector('.nousta-cover')).backgroundImage.includes('data:image/png'), 'Cover artwork must be embedded and applied, not a missing CSS variable');
 await click('探索诺斯塔之塔');
 assert.equal([...current().querySelectorAll('a.link-internal')].filter(a => a.textContent === '快速成型').length, 3);
 await click('快速成型', 1);
 await click('出发，前往诺斯塔之塔');
 assert.equal(sc.State.passage, '诺斯塔之塔');
 assert.equal(state().version, 2);
 const pcBefore = json(sc.State.variables.pc);
 assert(!current().querySelector('.tower-map').textContent.includes('塔冠'), 'Unvisited room name spoiled');
 inspectDetails();
 await route(['shift', 'up', 'book', 'up', 'rune']);
 inspectDetails();
 const savedVariables = json(sc.State.variables);
 const portableSave = sc.Save.base64.save();
 assert.equal(typeof portableSave, 'string');
 assert(portableSave.length > 100);
 await step('up');
 await sc.Save.base64.load(portableSave);
 sc.Engine.show(); // Base64.load restores state; the caller renders the restored passage.
 await sleep(200);
 clean();
 assert.equal(json(sc.State.variables), savedVariables, 'Actual portable save failed to restore complete variables');
 await step('up');
 sc.Engine.backward();
 await sleep(200);
 clean();
 assert.equal(json(sc.State.variables), savedVariables, 'History failed to restore the saved moment');
 await route(['up', 'sketch', 'up', 'meal', 'up', 'serve', 'up', 'shift', 'loot']);
 assert.equal(state().charges, 3);
 await step('rescueCharm');
 assert.equal(state().charges, 2);
 assert.equal(state().witness, true);
 await route(['up', 'ventCharm']);
 assert.equal(state().charges, 1);
 assert.equal(state().vented, true);
 await route(['up', 'shift', 'shield', 'shift', 'up', 'shift', 'silenceBell', 'shift', 'up', 'openCharm']);
 assert.equal(state().charges, 0);
 assert.equal(state().exitOpen, true);
 assert.equal(state().ending, '', 'Third charm use must not force an ending');
 assert(current().querySelector('.tower-inventory').textContent.includes('剩余 0 / 3 次'));
 inspectDetails();
 await route(['shift', 'promise', 'shift']);
 const beforeEnding = json(state());
 await step('free');
 assert.equal(state().ending, 'free');
 assert.equal(state().charges, 0);
 assert(current().querySelector('.ending-card').textContent.includes('梁外的天空'));
 assert.equal(current().querySelectorAll('.tower-actions a').length, 0);
 assert.equal(json(sc.State.variables.pc), pcBefore);
 console.log('✓ v2 compiled UI: preset entry, all three charm uses, non-consuming journal, Base64 save/load, history and liberation');
 // A real history return restores the final choice and permits a second ending.
 sc.Engine.backward();
 await sleep(200);
 clean();
 assert.equal(json(state()), beforeEnding);
 await step('treasure');
 assert.equal(state().ending, 'treasure');
 assert(current().querySelector('.ending-card').textContent.includes('一袋金币'));
 assert.equal(current().querySelectorAll('.tower-actions a').length, 0);
 console.log('✓ v2 compiled UI: history restores the final choice and treasure ending works');

 // This fixture was exported from the old compiled game, before v2 existed.
 await sc.Save.base64.load(fixture.save);
 sc.Engine.show();
 await sleep(200);
 clean();
 assert.deepEqual(JSON.parse(json(state())), fixture.state, 'Legacy portable save was migrated or lost fields');
 assert.equal(state().version, 1);
 const legacyPC = json(sc.State.variables.pc);
 const legacyUI = () => {
  assert.equal(state().version, 1);
  const text = current().textContent;
  assert(!/第一幕|第二幕|第三幕|排烟|拆铃|驯龙铃|订约路线|开顶：/.test(text), `v2 objectives leaked into legacy UI: ${text}`);
  assert.equal(Object.hasOwn(state(), 'exitOpen'), false, 'Legacy state acquired v2 fields');
 };
 legacyUI();
 inspectDetails();
 for (const id of ['up', 'meal', 'up', 'serve', 'up', 'shift', 'loot', 'up', 'up', 'up', 'up', 'shift', 'promise', 'shift']) {
  await step(id);
  legacyUI();
 }
 const legacyCharges = state().charges;
 await step('free');
 assert.equal(state().ending, 'free');
 assert.equal(state().charges, legacyCharges, 'Legacy rune liberation consumed a charm');
 assert.equal(state().version, 1);
 assert.equal(Object.hasOwn(state(), 'exitOpen'), false);
 assert.equal(json(sc.State.variables.pc), legacyPC);
 assert(current().querySelector('.ending-card').textContent.includes('梁外的天空'));
 clean();
 console.log('✓ real v1 Base64 fixture: complete tower state preserved, old hints/rules retained and liberation remains playable');
} finally {
 dom.window.close();
}
