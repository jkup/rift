import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const here=import.meta.dirname;
const frozen=JSON.parse(readFileSync(here+'/frozen-traces.json'));
const source=readFileSync('test/harness-errors-b.ts','utf8');
const marker='const traces: {id:string;sourceA:string;sourceB:string;columns:number[];effects:string[];sourceTicks:number}[] = ';
const actual=JSON.parse(source.split(marker)[1].split(';\nfunction traceRun')[0].trim());
const expected=frozen.traces.filter(t=>!['T13','T14','T15','T16','T17','T18'].includes(t.id)).map(t=>({id:t.id,sourceA:t.sourcesByInput['input-a'],sourceB:t.sourcesByInput['input-b'],columns:t.events.map(e=>e.column),effects:t.events.map(e=>e.effect),sourceTicks:t.sourceTicks}));
assert.deepEqual(actual,expected);assert.equal(actual.length,15);assert.equal(actual.reduce((n,t)=>n+4*(t.columns.length+2),0),504);
// Source checks supplement reachable negatives, not executable field-sensitivity proof.
const dispatcher=readFileSync('src/script-execution-internal.ts','utf8'),realm=readFileSync('src/realm.ts','utf8');
const guard=dispatcher.split('export function consumeScriptConstructorPermit(')[1].split('export type { ScriptSession }')[0];
for(const text of ['permit.kind !== "construct"','permit.used','permit.context !== context','permit.realm !== realm','permit.invoke !== invoke','permit.callee !== callee','permit.args !== args','permit.loc !== loc','permit.used = true'])assert.ok(guard.includes(text),text);
const call=dispatcher.split('export function consumeScriptBuiltinPermit(')[1].split('export function consumeScriptConstructorPermit')[0];assert.ok(call.includes('permit.kind !== "call"'));
const factory=realm.split('createBuiltinConstructor(name:')[1].split('registerBuiltin(target:')[0];assert.ok(factory.indexOf('context.realm.profile !== this.profile')<factory.indexOf('callee !== object'));assert.ok(factory.indexOf('callee !== object')<factory.indexOf('consumeScriptConstructorPermit'));assert.ok(factory.indexOf('consumeScriptConstructorPermit')<factory.indexOf('return construct('));
writeFileSync(here+'/oracle-source-audit.json',JSON.stringify({BTraces:15,deferredCTraces:6,prefixesPerInputPerLane:504,permit:'exact tagged context/Realm/invoke/callee/args/loc/used comparisons and captured callee; executable field sensitivity not claimed'},null,2)+'\n');
console.log('PASS exact frozen B event/source tables and mandatory permit source conjuncts');
