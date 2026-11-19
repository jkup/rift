import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const here=import.meta.dirname,prior=resolve(here,'../../ts-035e3b-p');
const raw=JSON.parse(readFileSync(join(prior,'future-producer-literals.json'))).find(r=>r.request.mode==='conformance'&&r.request.variant==='raw');
const rows=[];
for(const [id,index,error] of [['record-as-variant',1,'variant'],['record-as-limit',7,'limit'],['record-as-role',15,'unit'],['extra-record-argument',17,'argc']]){
 const argv=[...raw.argv];argv[index]=JSON.stringify(raw.request);
 const tokens=[...new Set(argv.filter(a=>a.startsWith('SOURCE-')))];assert.equal(tokens.length,1);
 rows.push({id,setupClass:'ordinary-controls',argv,files:tokens.map(token=>({token,present:true,text:'"use strict";\n0;'})),error:'script-producer/'+error,expectedDriver:{exitCode:70,stdout:'',stderr:'Script observation driver fault\n',childPresent:false},provenance:'future OS string-vector spoof control; neither native execution nor exact error priority measured'});
}
writeFileSync(join(here,'positional-record-spoofs.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
const file=join(here,'proposals/script-producer.test.mjs'),before=readFileSync(file,'utf8');
writeFileSync(join(here,'initial/script-producer.test.mjs'),before,{flag:'wx'});
const addition=`
test('record JSON cannot replace positional controls in either OS entrypoint',()=>{
 const rows=JSON.parse(readFileSync('docs/validation/ts-035e3b/request-boundary/positional-record-spoofs.json'));
 assert.equal(rows.length,4);
 for(const row of rows)assert.throws(()=>validateConformanceScriptArguments(row.argv),{message:row.error});
 for(const lane of ['node','native'])for(const row of rows){
  const {args,result}=setupNegative(row,mkdtempSync(resolve('build','producer-record-spoof-')));
  const node=lane==='node',entry=resolve(node?'build/node/src/script-observation-driver.js':'build/native/script-observation-driver.exe');
  const p=spawnSync(node?process.execPath:entry,node?[entry,...args]:args,{encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(p.error,undefined);assert.equal(p.signal,null);assert.equal(p.status,row.expectedDriver.exitCode,row.id);
  assert.equal(p.stdout,row.expectedDriver.stdout);assert.equal(p.stderr.replaceAll('\\r\\n','\\n'),row.expectedDriver.stderr);assert.equal(existsSync(result),false);
 }
});
`.replaceAll('\n','\r\n');
const after=before+addition;writeFileSync(file,after);
const manifest=JSON.parse(readFileSync(join(here,'proposal-manifest.json')));manifest.find(r=>r.path.endsWith('/script-producer.test.mjs')).after=createHash('sha256').update(after).digest('hex');
writeFileSync(join(here,'proposal-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Frozen four pure-argv/eight future checked-source OS spoof controls; no child launches.');
