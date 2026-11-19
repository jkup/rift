import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as parser from '../../../build/node/src/parser.js';
const here=new URL('./',import.meta.url),matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',here))),results=[],failures=[];
for(const r of matrix.rows){
 if(r.expected.kind==='none')assert.deepEqual(parser.auditBoundedScriptBlockFunctions(r.text),r.expected,r.id);
 if(r.expected.kind!=='blocked')continue;
 // Explicitly a different source control. It tests the late veto independently;
 // it does not establish numeric continuation or certify the original source.
 const text=r.text.replace('42=7;','xx=7;'),actual=parser.auditBoundedScriptBlockFunctions(text);
 const expected=r.expected;
 if(actual.kind==='eligible'&&r.id.startsWith('M5-')){
  assert.equal(actual.candidates[0].ruleCode,'duplicate-block-lexical-function');
  const second=actual.candidates[0].second;
  assert.deepEqual(expected,{kind:'blocked',reason:'other-conflict',rejection:null,diagnostic:{phase:'parse',name:'SyntaxError',message:'duplicate-lexical: '+second.name,loc:second.loc}},r.id+' authored block veto');
 }
 else try{assert.deepEqual(actual,expected,r.id);}catch(e){failures.push({id:r.id,message:e.message});}
 results.push({id:r.id,text,actual,claim:'Current bounded audit on explicit reference-target neighbor, not future numeric audit.'});
}
const old=JSON.parse(readFileSync(new URL('../ts-035d4-p/semantic-matrix.json',here))).rows;
const nodes=()=>({source:{text:''},body:[],scopes:new Map(),declarations:new Map(),assignmentNameEligible:new Map()});
for(const r of old)assert.deepEqual(parser.parseBoundedScriptPreparation(r.futurePreparation.unit,nodes()),r.futurePreparation,r.id);
writeFileSync(new URL('probe-results.json',here),JSON.stringify({claim:'Existing Node build only; no guest execution or new parser.',results,failures,inheritedPreparationRows:old.length},null,2)+'\n');
assert.deepEqual(failures,[]);console.log(JSON.stringify({neighbors:results.length,inheritedPreparationRows:old.length}));
