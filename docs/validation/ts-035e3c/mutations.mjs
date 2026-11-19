// Actual isolated capture-source mutants; no installed source or authority seam.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const here="C:\\Users\\jonku\\code\\rift\\typescript\\docs\\validation\\ts-035e3c-p\\correction",base="C:\\Users\\jonku\\code\\rift\\typescript\\build\\ts035e3c-implementation-fg0jC1",out=mkdtempSync("C:\\Users\\jonku\\code\\rift\\typescript\\docs\\validation\\ts-035e3c\\mutations-");
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=readFileSync(resolve(base,'tools/test262/script-execution-inputs.mjs'),'utf8');
assert.equal(sha(source),'4fc40ed011acacc56f217d06949c9b9790f9cd1ffb2412294a0d6258e67d0547');
const literals=JSON.parse(gunzipSync(readFileSync(resolve(here,'expected-captures.json.gz'))));
const tables=JSON.parse(readFileSync(resolve(here,'capture-occurrence-tables.json'))).tables;
const vault=JSON.parse(readFileSync(resolve(here,'pinned-byte-identities.json'))).files;
const corpus='C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075';
const save=(name,v)=>writeFileSync(resolve(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function anchor(lane,scenario){
 return {files:tables[lane].map(file=>{
  const failed=scenario==='wrong-revision'||scenario==='first-file-unavailable'&&file.ordinal===0||
   scenario==='include-failure'&&file.slots.some(s=>s.occurrences.some(u=>u.path==='harness/sta.js'));
  return {ordinal:file.ordinal,path:file.path,inputError:failed?{status:'harness-error',stage:'input',reasonCode:scenario}:null,
   slots:failed&&scenario!=='include-failure'?null:file.slots.map((s,i)=>({
    id:s.slotId,path:file.path,variant:s.variant,goal:s.goal,blob:vault[file.path].blob,sourceSha256:vault[file.path].sha256,
    transformedSourceSha256:literals.expected[lane+'/success'][file.ordinal].slots[i].units.at(-1).transformedSha256,
    harness:s.occurrences.filter(u=>u.role==='harness').map(u=>({path:u.path,blob:u.blob,sha256:vault[u.path].sha256}))
   }))};
 })};
}
async function load(id,text){
 const mapped=text.replace(/from '(\.\/[^']+)'/g,(_full,p)=>`from '${pathToFileURL(resolve(base,'tools/test262',p)).href}'`);
 const path=resolve(out,id+'.mjs');writeFileSync(path,mapped+'\nexport {capture as testOnlyCapture};\n',{flag:'wx'});
 return (await import(pathToFileURL(path))).testOnlyCapture;
}
const normal=await load('baseline',source),baseline=[];
for(const lane of ['node','native'])for(const scenario of ['success','wrong-revision','include-failure','first-file-unavailable']){
 const actual=await normal({anchor:anchor(lane,scenario),options:{root:corpus}});
 assert.deepEqual(actual,literals.expected[lane+'/'+scenario]);baseline.push(lane+'/'+scenario);
}
for(const row of literals.synthetic){assert.deepEqual(await normal({anchor:row.anchor,options:{root:corpus}}),row.expectedFiles);baseline.push('synthetic/'+row.id);}
save('baseline.json',{passed:baseline});
const mutations=[{id:'root-constant-unit-id',from:"id:'u'+units.length",to:"id:'u0'",scenario:'success'}];
const unitValues={id:"'u0'",ordinal:'0',role:"'test'",path:"'test/corrupt.js'",blob:"'0'.repeat(40)",sourceSha256:"'0'.repeat(64)",transformedSha256:"'0'.repeat(64)",byteLength:'-1',transformedByteLength:'-1',sourceUnits:'-1',originalBase64:"''",transformedBase64:"''",transformedText:"'corrupt'"};
const slotValues={slotId:"'corrupt'",variant:"'raw'",goal:"'Module'",units:'[]'};
const fileValues={ordinal:'-1',path:"'test/corrupt.js'",state:"'input-error'",slots:'null'};
for(const [level,values,loop] of [
 ['unit',unitValues,'for(const f of files)for(const s of f.slots??[])for(const value of s.units)'],
 ['slot',slotValues,'for(const f of files)for(const value of f.slots??[])'],
 ['file',fileValues,'for(const value of files)']
])for(const [key,value] of Object.entries(values)){
 mutations.push({id:level+'-'+key+'-corrupt',code:loop+`value.${key}=${value};`,scenario:'success'});
 mutations.push({id:level+'-'+key+'-omit',code:loop+`delete value.${key};`,scenario:'success'});
}
for(const [id,code,scenario] of [
 ['unit-order','for(const f of files)for(const s of f.slots??[])s.units.reverse();','success'],
 ['unit-omission','for(const f of files)for(const s of f.slots??[])s.units.shift();','success'],
 ['unit-duplication','for(const f of files)for(const s of f.slots??[])s.units.push(structuredClone(s.units[0]));','success'],
 ['slot-order','for(const f of files)f.slots?.reverse();','success'],
 ['slot-omission','for(const f of files)f.slots?.pop();','success'],
 ['file-order','files.reverse();','success'],
 ['file-omission','files.pop();','success'],
 ['module-to-script','for(const f of files)for(const s of f.slots??[])if(s.goal==="Module")s.goal="Script";','success'],
 ['strict-prefix-self-consistent','for(const f of files)for(const s of f.slots??[])if(s.variant==="strict"){const u=s.units.at(-1);u.transformedText=Buffer.from(u.originalBase64,"base64").toString("utf8");u.transformedBase64=u.originalBase64;u.transformedSha256=u.sourceSha256;u.transformedByteLength=u.byteLength;u.sourceUnits=u.transformedText.length;}','success'],
 ['unknown-null-to-empty','for(const f of files)if(f.slots===null)f.slots=[];','wrong-revision'],
 ['include-error-state','for(const f of files)if(f.state==="input-error")f.state="captured";','include-failure'],
 ['partial-input-omission','files.shift();','first-file-unavailable']
])mutations.push({id,code,scenario});
const results=[];
for(const mutant of mutations){
 const from=mutant.from??'  return files;',to=mutant.to??('  '+mutant.code+'\n  return files;');
 assert.equal(source.split(from).length,2,mutant.id+' exact source guard');
 const text=source.replace(from,to),capture=await load(mutant.id,text);
 for(const lane of ['node','native']){
  // A setup/capture exception is a test failure, not a killed mutant. The new
  // whole-literal assertion must be the operation that rejects each result.
  const actual=await capture({anchor:anchor(lane,mutant.scenario),options:{root:corpus}});
  const expected=literals.expected[lane+'/'+mutant.scenario];let error=null;
  try{assert.deepEqual(actual,expected,'capture-literal/'+lane+'/'+mutant.scenario);}catch(e){error=e;}
  assert.equal(error?.code,'ERR_ASSERTION',mutant.id+' survived');
  const bytes=Buffer.from(JSON.stringify({id:mutant.id,lane,scenario:mutant.scenario,actual,expectedLiteral:lane+'/'+mutant.scenario,expectedSha256:sha(JSON.stringify(expected))},null,2)+'\n');
  const output=mutant.id+'-'+lane+'.json.gz';writeFileSync(resolve(out,output),gzipSync(bytes),{flag:'wx'});
  results.push({id:mutant.id,lane,scenario:mutant.scenario,sourceSha256:sha(text),output,error:'ERR_ASSERTION',fullLiteralRejected:true});
 }
}
save('mutation-contracts.json',mutations);save('results.json',{claim:'Isolated actual capture code mutants rejected by complete independent literals; no public token/grant',baseline,mutants:mutations.length,rejections:results.length,results});
console.log(JSON.stringify({out,baseline:baseline.length,mutants:mutations.length,rejections:results.length,guestLaunches:0,builds:0}));
