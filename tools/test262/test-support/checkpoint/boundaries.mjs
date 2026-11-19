import {corpusRoot, scratchRoot} from '../environment.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const run=resolve(process.argv[2]);assert(run.startsWith(join(scratchRoot,'run-')));
const root=join(run,'isolated'),url=n=>pathToFileURL(join(root,'tools/test262/'+n));
const api=await import(url('script-ledger.mjs')),p=await import(url('script-plan.mjs')),input=await import(url('input.mjs'));
const {manifest}=await input.frozenManifest();
const options={root:corpusRoot,revision:input.REVISION,lane:'node',paths:[manifest.entries[0].path]};
const selected=await p.prepareScriptSelection(options),ledger=api.newScriptLedger(selected),s=await api.createScriptLedgerStore(join(run,'boundary-store'),ledger),cp=await api.checkpointScriptLedger(s);
const log=[];
const error=(prefix,code)=>e=>{assert.equal(e.message,prefix+'/'+code);assert.equal(Object.getPrototypeOf(e),Error.prototype);assert.deepEqual(Object.keys(e),[]);return true;};
async function reject(id,fn,code,prefix='script-ledger-store'){await assert.rejects(fn(),error(prefix,code));log.push({id,error:prefix+'/'+code});}
assert.deepEqual(Object.keys(api).sort(),['appendScriptPolicy','checkpointScriptLedger','createScriptLedgerStore','inspectScriptLedger','newScriptLedger','reopenScriptLedger','reportScriptLedger','resolveScriptLedgerCheckpoint']);
assert.deepEqual(['createScriptLedgerStore','checkpointScriptLedger','resolveScriptLedgerCheckpoint','reopenScriptLedger'].map(n=>api[n].length),[2,1,1,1]);
assert.deepEqual(Object.keys(p).sort(),['assertScriptSelectionCurrent','inspectScriptSelection','prepareScriptSelection']);assert.equal(p.assertScriptSelectionCurrent.length,1);
for(const name of ['checkpointScriptLedger','resolveScriptLedgerCheckpoint','reopenScriptLedger']){
 await reject(name+'-arity0',()=>api[name](),'arguments');await reject(name+'-arity2',()=>api[name]({},{}),'arguments');
 for(const fake of [undefined,null,1,1n,Symbol(),{},structuredClone(s),ledger,selected])await reject(name+'-forgery-'+typeof fake,()=>api[name](fake),'token');
}
let calls=0;const fake={get directory(){calls++;throw 0;},toString(){calls++;throw 0;}};
for(const path of [null,undefined,1,[],fake,''])await reject('create-type',()=>api.createScriptLedgerStore(path,{}),'arguments');
await reject('create-arity0',()=>api.createScriptLedgerStore(),'arguments');await reject('create-arity3',()=>api.createScriptLedgerStore('x',{},{}),'arguments');
await reject('token-before-path',()=>api.createScriptLedgerStore('relative',{}),'token');
await reject('owner-before-path',()=>api.createScriptLedgerStore('relative',ledger),'owner');
for(const name of ['checkpointScriptLedger','reopenScriptLedger'])await reject('proxy-'+name,()=>api[name](new Proxy(s,{get(){calls++;throw 0;}})),'token');
assert.equal(calls,0);
const foreign=await import(url('script-ledger.mjs').href+'?foreign'),foreignLedger=foreign.newScriptLedger(selected);
await reject('foreign-ledger',()=>api.createScriptLedgerStore(join(run,'foreign'),foreignLedger),'token');
await reject('foreign-store',()=>foreign.checkpointScriptLedger(s),'token');await reject('foreign-checkpoint',()=>foreign.reopenScriptLedger(cp),'token');
await reject('context-arity',()=>p.assertScriptSelectionCurrent(),'arguments','script-plan');
await reject('context-foreign',()=>p.assertScriptSelectionCurrent({}),'token','script-plan');
assert.equal(await p.assertScriptSelectionCurrent(selected),undefined);
const before=api.inspectScriptLedger(ledger),report=api.reportScriptLedger(ledger);
const authority=join(root,'tools/test262/script-capabilities.json'),closure=join(root,'tools/test262/script-ledger.mjs'),file=join(run,'boundary-store/checkpoint-0.json');
const [a,b,c]=await Promise.all([readFile(authority),readFile(closure),readFile(file)]);
try{
 await writeFile(authority,'{}');await writeFile(closure,Buffer.concat([b,Buffer.from('\n')]));await writeFile(file,'tampered');
 await reject('authority-before-closure',()=>p.assertScriptSelectionCurrent(selected),'authority','script-plan');
 await reject('context-before-bytes',()=>api.reopenScriptLedger(cp),'context');
 await writeFile(authority,a);
 await reject('closure-drift',()=>p.assertScriptSelectionCurrent(selected),'drift','script-plan');
 await reject('noop-checks-context',()=>api.checkpointScriptLedger(s),'context');
 await writeFile(closure,b);
 await reject('bytes-after-context',()=>api.reopenScriptLedger(cp),'bytes');
}finally{await writeFile(authority,a);await writeFile(closure,b);await writeFile(file,c);}
assert.deepEqual(api.inspectScriptLedger(ledger),before);assert.deepEqual(api.reportScriptLedger(ledger),report);
assert.equal(await api.checkpointScriptLedger(s),cp);
await api.reopenScriptLedger(cp);await reject('spent-before-bytes',()=>api.reopenScriptLedger(cp),'owner');
await writeFile(join(run,'boundary-checks.json'),JSON.stringify({calls,checks:log.length,log},null,2)+'\n');
console.log(JSON.stringify({checks:log.length,getters:calls,arityExports:true,contextAndBytesAtomic:true}));
