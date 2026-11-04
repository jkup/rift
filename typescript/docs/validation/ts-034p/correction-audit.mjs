// Static design check only: no parser changes and no guest execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../../../..');
const original=execFileSync('git',['show','de90653:typescript/docs/harness-prerequisites.md'],{cwd:root,encoding:'utf8'});
const current=readFileSync(new URL('../../harness-prerequisites.md',import.meta.url),'utf8');
const rows=s=>s.split(/\r?\n/).filter(l=>/^\| (C\d\d|B\d\d) \|/.test(l));
assert.deepEqual(rows(current),rows(original));assert.equal(rows(current).length,29);
const prefixes=[
 {id:'P14',source:'"use strict";try{throw 7;}catch(e){e;}',columns:[1,1,14,17,17,18,24,27,33,33,35,35,36,36]},
 {id:'P14R',source:'"use strict";try{throw 7;}catch(e){throw e;}',columns:[1,1,14,17,17,18,24,27,33,33,35,35,36,42]},
 {id:'P05',source:'"use strict";try{}catch(e){e;}',columns:[1,1,14,17,17]},
 {id:'P15F',source:'"use strict";try{throw 7;}catch(e){(function(){return e;});}',columns:[1,1,14,17,17,18,24,27,33,33,35,35,36,37,37]},
];
const design=readFileSync(new URL('h1-correction.md',import.meta.url),'utf8');
for(const p of prefixes){
 assert.ok(design.includes('`'+p.source+'`'));assert.ok(design.includes('`'+JSON.stringify(p.columns)+'`'));
 assert.equal(p.source.indexOf('try')+1,14);assert.equal(p.source[16],'{');
 if(p.id!=='P05'){
  assert.equal(p.source.indexOf('catch')+1,27);assert.equal(p.source[32],'e');assert.equal(p.source[34],'{');
 }
 p.prefixes=[0,7].flatMap(seed=>Array.from({length:p.columns.length+1},(_,k)=>({seed,k,maxSteps:seed+k,
  expectedSteps:seed+k+(k<p.columns.length?1:0),resource:k<p.columns.length,
  location:k<p.columns.length?{line:1,column:p.columns[k]}:null})));
}
const units={A:'"use strict";function a(){probe();}',B:'"use strict";function b(){1;probe();}',T:'"use strict";try{a();}catch(e){}b();'};
assert.equal(units.A.indexOf('probe')+1,27);assert.equal(units.B.indexOf('probe')+1,29);
for(const source of Object.values(units))assert.ok(design.includes(source));
const sha=s=>createHash('sha256').update(s).digest('hex');
writeFileSync(new URL('correction-audit.json',import.meta.url),JSON.stringify({mode:'Static future expectations; no guest execution or native claim',original:'de90653',preservedControlRows:rows(current).length,designSha256:sha(design),prefixes,units,consumedCompletion:{diagnostic:{line:900,column:9},callSites:[{unit:'A',line:1,column:27},{unit:'B',line:1,column:29}],finalSource:'B'}},null,2)+'\n');
console.log('PASS29 inherited literal rows;4 frozen prefix matrices/fresh+7;2 source sites; no guests executed');
