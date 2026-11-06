import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join} from 'node:path';
const here=import.meta.dirname,source=fs.readFileSync(join(here,'reader.mjs'),'utf8');
const fixtures=JSON.parse(fs.readFileSync(join(here,'../ts-035e3g-empty-p/empty-fixtures.json'))).cases;
const plans=[
 ['old-restriction','empty-pointer-60','if(!s.rawSize&&s.rawOffset>b.length)','if(!s.rawSize&&s.rawOffset)'],
 ['empty-slice-hash','empty-pointer-60','if(s.rawSize&&s.rawOffset)s.rawSha256=','if(s.rawOffset)s.rawSha256='],
 ['normalize-pointer','empty-pointer-60','if(!s.rawSize&&s.rawOffset>b.length)', 'if(!s.rawSize)s.rawOffset=0;\n  if(!s.rawSize&&s.rawOffset>b.length)'],
 ['out-of-range-accepted','empty-past-eof',"if(!s.rawSize&&s.rawOffset>b.length)reject('RAW_POINTER',p+20);",''],
 ['nonempty-pointer-unchecked','nonempty-missing-pointer',"if(s.rawSize&&!s.rawOffset&&!(s.characteristics&128))reject('RAW_POINTER',p+20);",'']
];
const results=[];
for(const [id,fixture,old,next] of plans){
 assert.equal(source.split(old).length-1,1,id);
 const mutated=source.replace(old,next);
 const {inspectCoff}=await import('data:text/javascript;base64,'+Buffer.from(mutated).toString('base64'));
 const f=fixtures.find(f=>f.id===fixture);assert(f);
 const actual=inspectCoff(Buffer.from(f.bytesHex,'hex'));
 let assertion;try{assert.deepEqual(actual,f.expected);}catch(e){assertion=e;}
 assert.equal(assertion?.code,'ERR_ASSERTION',id+' must fail full-result assertion');
 results.push({id,fixture,old,next,actual,expected:f.expected,intendedAssertionFailed:true});
}
fs.writeFileSync(process.argv[2],JSON.stringify({status:'passed',mutants:results,realObjectsInterpreted:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({mutants:results.length,status:'passed'}));
