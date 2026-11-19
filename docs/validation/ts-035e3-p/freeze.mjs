// Design artifacts only. Never writes an existing production/test/history file.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)), root=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(p,v)=>{mkdirSync(dirname(resolve(here,p)),{recursive:true});writeFileSync(resolve(here,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');};
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const protectedFiles=files.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p)&&!p.startsWith('typescript/docs/validation/ts-035e3-p/')&&p!=='typescript/docs/script-execution-receipts.md');
save('preservation.json',protectedFiles.map(path=>({path,sha256:hash(readFileSync(resolve(root,path)))})));
const paths=files.filter(p=>/^typescript\/(src\/.*\.ts|tools\/test262\/.*\.mjs|test\/script.*\.ts)$/.test(p));
save('closure.json',paths.map(path=>{const s=readFileSync(resolve(root,path),'utf8');return {path,sha256:hash(s),imports:[...s.matchAll(/^import .*?from ['"]([^'"]+)/gm)].map(m=>m[1]),exports:[...s.matchAll(/^export (?:async )?(?:function|class|const|interface|type) (\w+)/gm)].map(m=>m[1])};}));
const resultPath='typescript/tools/test262/script-result.mjs';
const original=readFileSync(resolve(root,resultPath),'utf8');
// The same private classifier remains the only classifier. This is a data
// constructor, deliberately incapable of authenticating transport/admission.
const addition=`
// Construct data only; callers must separately authenticate parent transport.
// Context and binding have the same trusted-host contract as assertScriptContext.
export function composeScriptEnvelope(json,context,binding) {
  need(arguments.length===3);
  need(record(context,{identity:identityShape,inputs:inputsShape,expectedNegative:negativeShape,blockers:array(blockerShape)}));
  const value=decode(json);
  need(record(value,{identity:identityShape,inputs:inputsShape,evidence:evidenceShape,observation:x=>resultShape(x,true)}));
  need(value.identity.mode==='conformance');
  value.classification={status:'host-fault',reasonCode:'protocol',
    blockers:structuredClone(context.blockers),expectedNegative:structuredClone(context.expectedNegative),
    observedPhase:null,observedConstructorName:null};
  checkCore(value,binding);
  value.classification=classification(value);
  // Classification adds bytes: enforce the final wire limit as well as draft.
  return assertScriptContext(parseScriptEnvelope(JSON.stringify(value),binding),context,binding);
}
`;
save('classifier-addition.txt',addition);
const proposed=original+addition;
save('proposals/script-result.mjs',proposed);
const testPath='typescript/tools/test262/script-observe-codec.test.mjs';
const oldTest=readFileSync(resolve(root,testPath),'utf8');
const from="assert.equal(readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('\\r\\n','\\n'),old.replace(from,to).replace(ruleFrom,ruleTo).replaceAll('\\r\\n','\\n'));";
if(oldTest.split(from).length!==2)throw Error('test anchor');
const suffixHash=hash(addition);
const to="const actual=readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('\\r\\n','\\n'),expected=old.replace(from,to).replace(ruleFrom,ruleTo).replaceAll('\\r\\n','\\n');assert.equal(actual.slice(0,expected.length),expected);const suffix=actual.slice(expected.length);assert.equal(suffix,name==='script-result.mjs'?"+JSON.stringify(addition)+":'');assert.equal(createHash('sha256').update(suffix).digest('hex'),name==='script-result.mjs'?'"+suffixHash+"':'"+hash('')+"');";
const proposedTest=oldTest.replace(from,to);
save('proposals/script-observe-codec.test.mjs',proposedTest);
save('proposal-manifest.json',[{path:resultPath,proposal:'proposals/script-result.mjs',before:hash(original),after:hash(proposed)},{path:testPath,proposal:'proposals/script-observe-codec.test.mjs',before:hash(oldTest),after:hash(proposedTest)}]);
console.log(JSON.stringify({protectedFiles:protectedFiles.length,closureFiles:paths.length,proposals:2}));
