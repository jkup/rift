import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as canonical from '../../../tools/test262/script-plan.mjs';
import {frozenManifest, REVISION} from '../../../tools/test262/input.mjs';
export const own = resolve('docs/validation/ts-035e2b');
export const read = name => migrate(JSON.parse(readFileSync(resolve('docs/validation/ts-035e2b-p',name))));
export const save = (name,value) => writeFileSync(join(own,name),JSON.stringify(value,null,2)+'\n');
export const error = code => e => {
  assert.equal(Object.getPrototypeOf(e),Error.prototype);
  assert.equal(e.message,'script-ledger/'+code);
  assert.deepEqual(Object.keys(e),[]); return true;
};
export function checkFrozen(value) {
  if(value && typeof value==='object') {
    assert(Object.isFrozen(value)); for(const child of Object.values(value))checkFrozen(child);
  }
}
export const root='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
const {manifest}=await frozenManifest();
export const options=(lane='node',paths=manifest.entries.map(e=>e.path))=>({root,revision:REVISION,lane,paths});
const pool=[];
export async function planner(foreignInstance=false) {
  // Every model token is now an actual opaque E2a token. Only copied-module
  // inspectors substitute the retained fixture after authenticating it.
  const api=foreignInstance ? await import(pathToFileURL(resolve('tools/test262/script-plan.mjs'))+'?foreign-ledger-test') : canonical;
  if(!pool.length) for(let i=0;i<60;i++) pool.push(await canonical.prepareScriptSelection(options('node',[manifest.entries[0].path])));
  const foreign=api===canonical?null:await api.prepareScriptSelection(options());
  return {values:new WeakMap(),mint(selection) {
    const token=foreign??pool.pop();assert(token,'prepared token pool exhausted');
    this.values.set(token,structuredClone(selection));return token;
  }};
}
export async function ledgerModule(owner={values:new WeakMap()}) {
  const directory=mkdtempSync(join(own,'fault-'));
  const controlPath=join(directory,'control.mjs');
  writeFileSync(controlPath,'export const control = {};\n');
  const {control}=await import(pathToFileURL(controlPath));
  control.owner=owner;
  writeFileSync(join(directory,'inspect.mjs'),`import {inspectScriptSelection as inspect} from ${JSON.stringify(pathToFileURL(resolve('tools/test262/script-plan.mjs')).href)};
export {assertScriptSelectionCurrent} from ${JSON.stringify(pathToFileURL(resolve('tools/test262/script-plan.mjs')).href)};
import {control as c} from './control.mjs';
export function inspectScriptSelection(t){const actual=inspect(t);return structuredClone(c.owner.values.get(t)??actual);}
`);
  let source=readFileSync('tools/test262/script-ledger.mjs','utf8');
  const replace=(before,after)=>{assert.equal(source.split(before).length,2,before);source=source.replace(before,after);};
  replace("from './script-plan.mjs'", "from './inspect.mjs'");
  source="import {control as fault} from './control.mjs';\n"+source;
  replace('  const slots = validateSelection(selection);',
    '  if (fault.selectionFault) selection = fault.selectionFault(selection);\n  const slots = validateSelection(selection);');
  replace('  ledgers.set(token, value);','  if (fault.code) fail(fault.code);\n  ledgers.set(token, value);');
  replace('  const value = ledgers.get(token);',
    '  let value = ledgers.get(token);\n  if (fault.state) value = fault.state(structuredClone(value));');
  replace('  validateHistory(next, validateSelection(next.selection));',
    '  if (fault.candidate) fault.candidate(next);\n  if (fault.code) fail(fault.code);\n  validateHistory(next, validateSelection(next.selection));');
  replace('  const sequence = value.attempts.length + 1, attempt = prior + 1;',
    '  const sequence = fault.sequence ?? value.attempts.length + 1, attempt = fault.attempt ?? prior + 1;');
  writeFileSync(join(directory,'script-ledger.mjs'),source);
  const api=await import(pathToFileURL(join(directory,'script-ledger.mjs')));
  return {api,control,directory,fault(code){control.code=code;},selectionFault(fn){control.selectionFault=fn;},
    validateHistory(token,attempts){control.state=value=>({...value,attempts});try {api.inspectScriptLedger(token);} finally {control.state=null;}}};
}

// Guarded expectation migration, independent of observed selection/report.
function migrate(value) {
  if (value && typeof value==='object') {
    if (value.selectionVersion===2 && value.kind==='script-blocked-selection') {
      const p=value.policy;
      assert.equal(p.id,'rift-script-blocked-v3'); assert.equal(p.files.length,242);
      assert.equal(p.closureSha256,'ec402a67cacb11ab30a8c004b8b85787ca013648c57025dd36ab2a46061aded2');
      assert.equal(p.closureSha256,createHash('sha256').update(JSON.stringify(p.files)).digest('hex'));
      assert.equal(p.files.find(f=>f.path==='tools/test262/script-plan.mjs').sha256,'c61ae04ef432aba0e5ab548cadb4fff3ed9848b771870da74f77f94791da52b8');
      assert.equal(p.files.find(f=>f.path==='tools/test262/script-ledger.mjs').sha256,'0921bc26ea39f6cb6c4583387553480a996ac4fd2f78a2f303c0a7a7c89e65dd');
      const edits={'tools/test262/script-plan.mjs':"ab20c1f78b31377ebb18f13741e1077a3f9a4bd772790f13bd0b20facae8210f",'tools/test262/script-ledger.mjs':"fae6321287e971662257621a06336dd1a52fda29b4becb0513749160010f3440"};
      for(const [path,sha256] of Object.entries(edits)) {
        assert.equal(p.files.filter(f=>f.path===path).length,1);
        p.files.find(f=>f.path===path).sha256=sha256;
      }
      p.id='rift-script-blocked-v4';
      p.closureSha256=createHash('sha256').update(JSON.stringify(p.files)).digest('hex');
      return value;
    }
    for(const child of Object.values(value)) migrate(child);
  }
  return value;
}
