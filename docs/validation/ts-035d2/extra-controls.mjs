import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const rows=[
 ['body-entry','throw 19;',null],
 ['early-before-effect','"use strict"; throw 19; {function f(){} function f(){}}','duplicate-block-lexical-function'],
 ['effect-before-pair','"use strict"; this.effect=1; {function f(){} function f(){}}','duplicate-block-lexical-function'],
 ['function-mode','function outer(){"use strict"; {function f(){} function f(){}}}','duplicate-block-lexical-function'],
 ['escaped-directive','"use\\x20strict"; {function f(){} function f(){}}',null],
 ['same-id-alpha',readFileSync('fixtures/script-strict-rule-dispatch/alpha.js','utf8'),'duplicate-block-lexical-function'],
 ['same-id-beta',readFileSync('fixtures/script-strict-rule-dispatch/beta.js','utf8'),'duplicate-block-lexical-function'],
];
mkdirSync('build/ts035d2-extra',{recursive:true});const results=[];
for(const lane of ['node','native'])for(const [name,text,rule] of rows){
 const path='build/ts035d2-extra/'+name+'.js';writeFileSync(path,text);
 const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-rule-dispatch.exe',lane==='node'?['build/node/test/script-strict-rule-dispatch.js',path,'same-id']:[path,'same-id'],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 results.push({lane,name,status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr});writeFileSync('docs/validation/ts-035d2/extra-results.json',JSON.stringify(results,null,2)+'\n');assert.equal(r.status,0,name+r.stderr);
 const a=JSON.parse(r.stdout);
 if(rule){assert.equal(a.preparation.rejection.ruleCode,rule);assert.equal(a.preparation.unit.text,text);for(const c of a.contexts){assert.equal(c.result.ruleCode,rule);assert.equal(c.testBodyEvaluated,false);assert.equal(c.inspection,null);assert.equal(c.operation.phase,'parse');}}
 else if(name==='body-entry'){
  assert.equal(a.contexts[0].result.kind,'normal');assert.equal(a.contexts[0].testBodyEvaluated,false);
  for(const i of [1,2,3]){assert.equal(a.contexts[i].result.kind,'throw');assert.equal(a.contexts[i].operation.phase,'body');}
 }else {assert.equal(a.preparation.kind,'blocked');assert.equal(a.preparation.rejection.kind,'unsupported-syntax');}
}
console.log('PASS 14 supplemental body-entry, rejected-effects, actual-source and directive controls');
