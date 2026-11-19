import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const inputs=[
 ['triple','"use strict"; {function f(){} function f(){} function f(){}}','eligible',[[24,39],[24,54]]],
 ['nested-order','"use strict"; {function f(){ {function g(){} function g(){}} } function f(){}}','eligible',[[39,54],[24,72]]],
 ['same-scope-var','"use strict"; {function f(){} function f(){} var f;}','other-conflict'],
 ['later-formal','"use strict"; {function f(){} function f(){}} function g(a){let a;}','other-conflict'],
 ['later-switch','"use strict"; {function f(){} function f(){}} switch(0){case 0:function g(){} function g(){}}','other-conflict'],
 ['later-sloppy','function a(){"use strict"; {function f(){} function f(){}}} {function g(){}}','scope-restriction'],
 ['later-catch-var','"use strict"; {function f(){} function f(){}} try{}catch(e){{var e;}}','scope-restriction'],
 ['propagated-var','"use strict"; {function f(){} function f(){} {var f;}}','other-conflict'],
 ['mixed-later-name','"use strict"; {function f(){} function f(){} function g(){} let g;}','other-conflict'],
 ['parameter-after','"use strict"; {function f(){} function f(){}} function g(a,a){}','grammar-or-resource'],
 ['R0-mode','"use strict"; {function alpha(){} function other(){}}','none'],
 ['R1-mode','function outer(){"use strict"; {function beta(){} function other(){}}}','none'],
];
const results=[];
for(const lane of process.argv.includes('--node')?['node']:['node','native'])for(const [id,text,kind,pairs]of inputs){
 const path='build/ts035d1-inputs/extra-'+id+'.js';writeFileSync(path,text);
 const r=spawnSync(lane==='node'?process.execPath:'build/native/script-strict-rule-audit.exe',lane==='node'?['build/node/test/script-strict-rule-audit.js',path,id]:[path,id],{encoding:'utf8',timeout:60000});
 results.push({lane,id,text,status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr});
 writeFileSync('docs/validation/ts-035d1/extra-results'+(process.argv.includes('--node')?'-node':'')+'.json',JSON.stringify(results,null,2)+'\n');
 assert.equal(r.status,0);const result=JSON.parse(r.stdout),a=result.audit;
 if(kind==='eligible'){assert.equal(a.kind,kind,id);assert.equal(a.sourceUnits,text.length);assert.equal(a.consumedUnits,text.length);assert.deepEqual(a.candidates.map(c=>[c.first.start,c.second.start]),pairs,id);}
 else if(kind==='none'){
  assert.equal(a.kind,'none');const plan=result.ordinary.bounded;assert.equal(plan.kind,'complete');
  assert.equal(plan.strictness.ownStrict,id==='R0-mode');assert.equal(plan.strictness.inheritedStrict,false);
  if(id==='R1-mode'){assert.equal(plan.functions[0].strictness.ownStrict,true);assert.equal(plan.functions[0].strictness.inheritedStrict,false);}
  for(const scope of plan.scopes.filter(s=>s.kind==='block'))assert.equal(scope.strict,true);
  for(const f of plan.functions.slice(id==='R1-mode'?1:0)){assert.equal(f.strictness.ownStrict,false);assert.equal(f.strictness.inheritedStrict,true);}
 }
 else {assert.equal(a.kind,'blocked',id);assert.equal(a.reason,kind,id);}
}
console.log('PASS '+results.length+' additional full-source veto, triple and nested ordering controls');
