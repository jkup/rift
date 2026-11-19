import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {inputs,root} from '../ts-033a/baseline.mjs';
import {cases} from '../ts-033a/cases.mjs';
const here=import.meta.dirname, scratch=join(root,'build/ts033d1-metadata-input'); mkdirSync(scratch,{recursive:true});
const evidence=join(here,'metadata-complete'); mkdirSync(evidence,{recursive:true});
const baseline=JSON.parse(readFileSync(join(here,'../ts-033a/baseline.json')));
const lanes=process.argv.slice(2); assert.ok(lanes.length && lanes.every(x=>['node','native'].includes(x)));
const results=[];
try {
for(const lane of lanes){
 for(let i=0;i<inputs.length;i++){
  const [id,source]=inputs[i]; const file=join(scratch,'source.js');writeFileSync(file,source);
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-metadata.exe'),lane==='node'?['build/node/test/script-metadata.js',file,id]:[file,id],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024});
  results.push({lane,id,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});

  assert.equal(r.status,0,id);assert.equal(r.signal,null,id);assert.equal(r.error,undefined,id);assert.equal(r.stderr,'',id);
  const record=JSON.parse(r.stdout), old=baseline[i];assert.equal(old.id,id);
  assert.deepEqual(record.parse,old.parse,id+' exact full legacy parse');assert.deepEqual(record.audit,old.audit,id+' exact return audit');
  const m=record.metadata;assert.deepEqual(m.unit,{id,text:source});assert.equal(m.goal,'Script');assert.equal(Object.hasOwn(m,'body'),false);
  if(old.parse.error){
   assert.deepEqual(Object.keys(m).sort(),['kind','goal','unit','rejection','diagnostic'].sort());
   assert.equal(m.kind,'blocked');assert.deepEqual(m.rejection,old.parse.rejection);assert.deepEqual(m.diagnostic,old.parse.error);
  }else{assert.equal(m.kind,'complete');assert.equal(m.consumedUnits,source.length);}
  const expected=cases.find(x=>x[0]===id);
  if(expected){
   if(typeof expected[2]==='string'){
    assert.equal(m.kind,'blocked',id);assert.equal(m.rejection.capabilityCode??m.rejection.ruleCode??m.rejection.guardCode,expected[2],id);
   }else{
    assert.equal(m.kind,'complete',id);assert.equal(m.strictness.strict,expected[2],id);assert.equal(m.strictness.inheritedStrict,false);
    assert.deepEqual(m.functions.map(f=>[f.strictness.ownStrict,f.strictness.inheritedStrict]),expected[3],id);
    for(const f of m.functions) assert.equal(f.strictness.strict,f.strictness.ownStrict||f.strictness.inheritedStrict);
   }
  }
  // Literal offsets and source locations are independent of lexer/parser output.
  if(id==='D01'){
   assert.deepEqual(m.strictness,{ownStrict:true,inheritedStrict:false,strict:true,directives:[{start:0,end:12,statementEnd:13,loc:{line:1,column:1},raw:'"use strict"',useStrict:true}]});
   assert.deepEqual(m.functions,[{start:14,end:40,bodyStart:26,loc:{line:1,column:15},enclosingFunctionStart:null,strictness:{ownStrict:false,inheritedStrict:true,strict:true,directives:[]}}]);
  }
  if(id==='D02') assert.deepEqual(m.strictness.directives,[{start:0,end:7,statementEnd:8,loc:{line:1,column:1},raw:"'other'",useStrict:false},{start:9,end:21,statementEnd:22,loc:{line:1,column:10},raw:"'use strict'",useStrict:true}]);
  if(id==='line-spans'){
   assert.deepEqual(m.strictness.directives,[{start:5,end:12,statementEnd:13,loc:{line:2,column:1},raw:'"other"',useStrict:false},{start:14,end:26,statementEnd:27,loc:{line:3,column:1},raw:"'use strict'",useStrict:true}]);
   assert.deepEqual(m.functions.map(f=>[f.start,f.end,f.bodyStart,f.loc]),[[28,62,40,{line:4,column:1}]]);
   assert.deepEqual(m.functions[0].strictness.directives,[{start:43,end:48,statementEnd:49,loc:{line:5,column:1},raw:'"own"',useStrict:false}]);
  }
  if(id==='siblings') assert.deepEqual(m.functions.map(f=>[f.start,f.end,f.bodyStart,f.enclosingFunctionStart]),[[0,41,12,null],[26,40,38,0],[42,56,54,null]]);
 }
 console.log(lane+': '+inputs.length+' exact legacy parse/audit records; '+cases.length+' literal metadata cases passed');
}
} finally {
 // One write per lane avoids Windows repeated-open failures; all assertions above are unchanged.
 for(const lane of lanes) {
  writeFileSync(join(evidence,'metadata-'+lane+'.json'),JSON.stringify(results.filter(x=>x.lane===lane),null,2)+'\n');
 }
}
writeFileSync(join(evidence,'matrix-summary.json'),JSON.stringify({base:'1f81bb2f6eae3ffe9efad8e051599db739ef3f71',lanes,rows:inputs.length,metadataCases:cases.length,inputSha256:createHash('sha256').update(JSON.stringify(inputs)).digest('hex')},null,2)+'\n');
