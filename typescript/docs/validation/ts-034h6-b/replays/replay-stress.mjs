import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../../..');
const scratch=join(root,'build/ts033d1-stress');mkdirSync(scratch,{recursive:true});
const inputs=[{id:'review-reproduction',text:'1'+'+1'.repeat(15000)+';',strict:false,functions:[]}];
// Hand-built source segments define exact function ranges independently of the
// parser. The first function lies below the full chain; the final operand/key/
// argument contains another, so skipping either side cannot pass.
for(const kind of ['binary','member','call']) for(const scriptStrict of [false,true]){
 const prefix=(scriptStrict?'"use strict";':'')+'console.log("MUST_NOT_RUN");';
 const outer='function outer(){"use strict";';
 const seed='function(){return function(){};}';
 const far='function(){}';
 const chain=(kind==='binary'?'+1':kind==='member'?'.x':'()').repeat(15000);
 const ending=kind==='binary'?'+'+far:kind==='member'?'['+far+']':'('+far+')';
 const body='('+seed+')'+chain+ending+';';
 const sibling='function sibling(){}';
 const text=prefix+outer+body+'}'+sibling;
 const start=prefix.length, first=start+outer.length+1, nested=first+18;
 const final=start+outer.length+seed.length+2+chain.length+1;
 const outerEnd=start+outer.length+body.length+1;
 const row=(start,end,bodyStart,parent,own,inherited)=>({start,end,bodyStart,parent,own,inherited,strict:own||inherited});
 inputs.push({id:kind+'-'+scriptStrict,text,strict:scriptStrict,functions:[
  row(start,outerEnd,start+16,null,true,scriptStrict),
  row(first,first+seed.length,first+10,start,false,true),
  row(nested,nested+far.length,nested+10,first,false,true),
  row(final,final+far.length,final+10,start,false,true),
  row(outerEnd,text.length,outerEnd+18,null,false,scriptStrict),
 ]});
}
// Source cap boundary with a shallow parser stack and nearly 50,000 AST links.
inputs.push({id:'near-source-cap',text:'1'+'+1'.repeat(49999)+';',strict:false,functions:[]});
const results=[];
try {
for(const lane of process.argv.slice(2)){
 assert.ok(['node','native'].includes(lane));
 for(const row of inputs){
  const file=join(scratch,'source.js');writeFileSync(file,row.text);
  const args=[file,row.id,'summary'];if(lane==='node')args.unshift('build/node/test/script-metadata.js');
  const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-metadata.exe'),args,{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024});
  results.push({lane,id:row.id,sourceUnits:row.text.length,sourceSha256:createHash('sha256').update(row.text).digest('hex'),expected:row.functions,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
  assert.equal(r.status,0,row.id);assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(r.stderr,'');
  const record=JSON.parse(r.stdout),m=record.metadata;
  assert.equal(record.parseError,null);assert.deepEqual(record.audit,{kind:'complete',goal:'Script',sourceUnits:row.text.length,consumedUnits:row.text.length,candidates:[]});
  assert.equal(m.kind,'complete');assert.deepEqual(m.unit,{id:row.id,text:row.text});assert.equal(m.consumedUnits,row.text.length);assert.equal(m.strictness.strict,row.strict);
  assert.deepEqual(m.functions.map(f=>({start:f.start,end:f.end,bodyStart:f.bodyStart,parent:f.enclosingFunctionStart,own:f.strictness.ownStrict,inherited:f.strictness.inheritedStrict,strict:f.strictness.strict})),row.functions,row.id);
 }
 console.log(lane+': '+inputs.length+' deep-chain runtime-source controls pass; no source effects or truncation');
}

} finally {
 // Keep the partial original attempt; write the completed attempt once.
 writeFileSync(join(import.meta.dirname,'stress-final-results.json'),JSON.stringify(results,null,2)+'\n');
}
