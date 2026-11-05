// Adapted implementation controls; see test-source-identities.json. Production copies use actual checkout bytes.
import {createHash as sourceHash} from 'node:crypto';
// Bounded copied-proposal fault controls. Hooks exist ONLY in these evidence copies.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {readFileSync,writeFileSync,mkdirSync,cpSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const own=resolve('docs/validation/ts-035e2c'),run=mkdtempSync(join(own,'faults-'));
const root=join(run,'isolated');mkdirSync(root);
writeFileSync(join(run,'actual-source-identities.json'),JSON.stringify(['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs'].map(path=>({path,sha256:createHashForSource(readFileSync(path))})),null,2)+'\n');
function createHashForSource(bytes){return sourceHash('sha256').update(bytes).digest('hex');}

const read=p=>JSON.parse(readFileSync(p));
function copy(path){mkdirSync(dirname(join(root,path)),{recursive:true});cpSync(path,join(root,path),{recursive:true});}
for(const path of ['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs','tools/test262/input.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json','node_modules/yaml'])copy(path);
const modules=join(root,'tools/test262');
writeFileSync(join(modules,'fault.mjs'),'export const c={trace:[],fail:null,after:false};\n');
const {c}=await import(pathToFileURL(join(modules,'fault.mjs')));
writeFileSync(join(modules,'io.mjs'),`
import * as fs from 'node:fs/promises';import {c} from './fault.mjs';
async function operation(name,fn) {
 c.trace.push(name);
 const fail=c.fail===name;
 if(fail && !c.after) {c.fail=null;throw Object.assign(Error('injected '+name),{code:c.errno??'EIO'});}
 const result=await fn();
 if(fail && c.after) {c.fail=null;throw Object.assign(Error('after '+name),{code:'EIO'});}
 return result;
}
export const mkdir=(...a)=>operation('mkdir',()=>fs.mkdir(...a));
export const lstat=(...a)=>operation('lstat',()=>fs.lstat(...a));
export const realpath=(...a)=>operation('realpath',()=>fs.realpath(...a));
export const link=(...a)=>operation('link',()=>fs.link(...a));
export const unlink=(...a)=>operation('unlink',()=>fs.unlink(...a));
export const readFile=(...a)=>operation('read',()=>fs.readFile(...a));
export async function open(...a){const h=await operation('open',()=>fs.open(...a));return {
 writeFile:async b=>operation('write',async()=>{if(c.partial){await h.writeFile(b.subarray(0,17));throw Error('partial write');}return h.writeFile(b);}),
 sync:()=>operation('sync',()=>h.sync()),close:()=>operation('close',()=>h.close())};}
`);
writeFileSync(join(modules,'context.mjs'),`
import {assertScriptSelectionCurrent as check,inspectScriptSelection} from './script-plan.mjs';
import {c} from './fault.mjs';export {inspectScriptSelection};
export async function assertScriptSelectionCurrent(t){c.trace.push('context');if(c.context)throw Error('context fault');return check(t);}
`);
let source=readFileSync(join(modules,'script-ledger.mjs'),'utf8');
source=source.replace("from 'node:fs/promises'","from './io.mjs'").replace("from './script-plan.mjs'","from './context.mjs'");
source="import {c} from './fault.mjs';\n"+source;
source=source.replace('function acknowledge(state, pending) {',"function acknowledge(state, pending) {\n  if(c.ack){c.ack=false;storeFail('indeterminate');}");
// Private faults; deliberately not production exports.
source+=`\nexport function privateControl(token, action) {
 const state=stores.get(token);
 if(action==='inspect')return {pending:state.pending,anchor:state.anchor,owner:state.owner,
   value:ledgers.get(state.owner),diagnostics:structuredClone(state.diagnostics),busy:state.busy};
 if(action==='counter')state.anchor.generation=Number.MAX_SAFE_INTEGER;
 if(action==='history') {const v=structuredClone(ledgers.get(state.owner));v.attempts.push({});ledgers.set(state.owner,v);}
 if(action==='report')state.anchor.bytes=Buffer.from(state.anchor.bytes.toString().replace('"exitCode": 2','"exitCode": 1'));
}\n`;
writeFileSync(join(modules,'script-ledger.mjs'),source);
const plan=await import(pathToFileURL(join(modules,'script-plan.mjs'))),api=await import(pathToFileURL(join(modules,'script-ledger.mjs')));
const input=await import(pathToFileURL(join(modules,'input.mjs'))),{manifest}=await input.frozenManifest();
const options={root:'C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075',revision:input.REVISION,lane:'node',paths:[manifest.entries[0].path]};
const results=[];let serial=0;
function record(id,data={}){results.push({id,...data});writeFileSync(join(run,'results.json'),JSON.stringify(results,null,2)+'\n');}
function reset(){Object.assign(c,{trace:[],fail:null,after:false,partial:false,context:false,ack:false,errno:null});}
function error(prefix,code){return e=>{assert.equal(Object.getPrototypeOf(e),Error.prototype);assert.equal(e.message,prefix+'/'+code);assert.deepEqual(Object.keys(e),[]);return true;};}
const reject=(p,code)=>assert.rejects(p,error('script-ledger-store',code));
async function fresh(){reset();const st=await plan.prepareScriptSelection(options),l=api.newScriptLedger(st),id=api.inspectScriptLedger(l).selection.files[0].slots[0].id,dir=join(run,'store-'+serial++),s=await api.createScriptLedgerStore(dir,l);return {l,id,dir,s};}
for(const mode of ['published','absent','already-unlinked']) {
 const {l,id,dir,s}=await fresh();api.appendScriptPolicy(l,id);
 const ledgerBefore=api.inspectScriptLedger(l),reportBefore=api.reportScriptLedger(l);
 if(mode==='absent')c.fail='link';
 else {c.fail='unlink';c.after=mode==='already-unlinked';}
 await reject(api.checkpointScriptLedger(s),'indeterminate');
 const initial=api.privateControl(s,'inspect'),bytes=Buffer.from(initial.pending.bytes);
 assert(initial.pending);assert.equal(initial.busy,false);
 assert.deepEqual(initial.diagnostics,[{stage:mode==='absent'?'link':'unlink',code:'EIO'}]);
 const expected=[...initial.diagnostics],rounds=[];
 if(mode!=='already-unlinked') for(const errno of ['EACCES','EBUSY']) {
   reset();c.fail='unlink';c.errno=errno;
   await reject(api.resolveScriptLedgerCheckpoint(s),'indeterminate');
   expected.push({stage:'resolve-cleanup-unlink',code:errno});
   const state=api.privateControl(s,'inspect');
   assert.equal(state.pending,initial.pending);assert.equal(state.anchor,initial.anchor);
   assert.equal(state.owner,initial.owner);assert.equal(state.value,initial.value);
   assert.equal(state.busy,false);assert.deepEqual(state.pending.bytes,bytes);
   assert.deepEqual(state.diagnostics,expected);
   for(const name of ['inspectScriptLedger','reportScriptLedger'])assert.throws(()=>api[name](l),error('script-ledger','owner'));
   assert.throws(()=>api.appendScriptPolicy(l,id,'retry'),error('script-ledger','owner'));
   await reject(api.checkpointScriptLedger(s),'owner');
   assert(!c.trace.some(op=>['open','write','sync','close','link'].includes(op)));
   if(mode==='published')assert.deepEqual(await fs.readFile(join(dir,'checkpoint-0.json')),bytes);
   else await assert.rejects(fs.stat(join(dir,'checkpoint-0.json')),{code:'ENOENT'});
   rounds.push({errno,diagnostics:state.diagnostics,pendingRetained:true,ownerLocked:true,trace:[...c.trace]});
 }
 reset();const resolved=await api.resolveScriptLedgerCheckpoint(s);
 assert.equal(resolved===null,mode==='absent');
 const final=api.privateControl(s,'inspect');
 assert.equal(final.pending,null);assert.equal(final.busy,false);
 assert.equal(final.owner,initial.owner);assert.equal(final.value,initial.value);
 assert.deepEqual(final.diagnostics,expected);
 assert.deepEqual(api.inspectScriptLedger(l),ledgerBefore);assert.deepEqual(api.reportScriptLedger(l),reportBefore);
 assert(!c.trace.some(op=>['open','write','sync','close','link'].includes(op)));
 if(mode==='absent'){assert.equal(final.anchor,initial.anchor);assert.deepEqual(await fs.readdir(dir),[]);}
 else {
   assert.equal(final.anchor.generation,0);assert.equal(final.anchor.token,resolved);
   assert.deepEqual(await fs.readFile(join(dir,'checkpoint-0.json')),bytes);
   assert.deepEqual(await fs.readdir(dir),['checkpoint-0.json']);
 }
 await reject(api.resolveScriptLedgerCheckpoint(s),'owner');
 record(mode,{rounds,finalDiagnostics:final.diagnostics,unchangedLedgerAndReport:true,
   resolution:resolved===null?'absent-unlocked-no-publication':'acknowledged-once',
   enoentAddsNoDiagnostic:mode==='already-unlinked',noLinkOrAppendRetry:true});
}
console.log(JSON.stringify({run,scenarios:results.length,repeatedCleanupFailures:4,recoveries:3}));
