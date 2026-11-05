import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {cases as inherited} from '../ts-035d-p/cases.mjs';
import {variants,blockers} from '../../../tools/test262/input.mjs';
import {parse,parseDeclarationPlan,parseBoundedScriptDeclarationPlan,auditScriptReturns,auditBoundedScriptBlockFunctions,parseBoundedScriptPreparation} from '../../../build/node/src/parser.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url)));
const audit=read('current-audit.json'),matrix=read('future-matrix.json');
const manifest=JSON.parse(readFileSync(root+'typescript/fixtures/assistance/test262-starter-corpus/manifest.json'));
const planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});
assert.deepEqual(planned,audit.planned);assert.equal(planned.length,60);assert(planned.every(x=>x.blockers.length));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const item of [...audit.sources,...audit.artifacts])assert.equal(sha(readFileSync(root+item.path)),item.sha256,item.path);
const owned=p=>p==='typescript/TASKS.md'||p==='typescript/docs/script-strict-parameter-audit.md'||p.startsWith('typescript/docs/validation/ts-035d3-p/');
assert.deepEqual(git('diff','f3672ee','--name-only').split('\n').filter(p=>p&&!owned(p)&&p!=='typescript/COORDINATION.md'),[]);
const taskPrefix=t=>t.split('### TS-035D3-P')[0].replaceAll('\r\n','\n');
assert.equal(taskPrefix(readFileSync(root+'typescript/TASKS.md','utf8')),taskPrefix(git('show','f3672ee:typescript/TASKS.md')));
for(const [id,text] of inherited.filter(([id])=>/^P\d+$/.test(id)||id==='L06'))assert.equal(matrix.find(r=>r.id===id).text,text,id);
const controls=[];
for(const row of matrix){
 const {id,text,expected}=row,old=audit.rows.find(r=>r.id===id);assert.equal(old.text,text);assert.equal(expected.kind,old.futureKind);
 const unit={id,text},nodes={assignmentNameEligible:new Map(),source:{text:''},body:[],scopes:new Map(),declarations:new Map()};
 const actual={legacy:parse(text),returns:auditScriptReturns(text),declaration:parseDeclarationPlan(unit),bounded:parseBoundedScriptDeclarationPlan(unit),D1:auditBoundedScriptBlockFunctions(text),D2:parseBoundedScriptPreparation(unit,nodes)};
 assert.deepEqual(actual,old.current,id);
 for(const c of expected.candidates??[]){
  assert.equal(text.slice(c.functionStart,c.functionStart+8),'function');assert.equal(text[c.functionEnd-1],'}');
  assert(c.first.start<c.second.start);assert(c.second.end<c.functionEnd);
  for(const s of [c.first,c.second]){assert.equal(text.slice(s.start,s.end),s.name);const lines=text.slice(0,s.start).split(/\r\n|[\r\n\u2028\u2029]/);assert.deepEqual(s.loc,{line:lines.length,column:lines.at(-1).length+1});}
 }
 if(expected.reason==='grammar-or-resource'){
  // Current parser run on distinct-formal neighbors, never future audit proof.
  const control=text.replaceAll('a,a','a,z').replaceAll('b,b','b,y');
  const result=parseBoundedScriptDeclarationPlan({id:'distinct-'+id,text:control});
  assert.equal(result.kind,'blocked',id);assert.deepEqual(result.rejection,expected.rejection,id);
  controls.push({id,text:control,current:result});
 }
}
assert.equal(matrix.find(r=>r.id==='R0').text,readFileSync(new URL('runtime-0.js',import.meta.url),'utf8'));
assert.equal(matrix.find(r=>r.id==='R1').text,readFileSync(new URL('runtime-1.js',import.meta.url),'utf8'));
writeFileSync(new URL('grammar-controls.json',import.meta.url),JSON.stringify({claim:'Current distinct-formal grammar/resource controls only; no continuation implementation.',controls},null,2)+'\n');
console.log(JSON.stringify({currentRows:matrix.length,entryPoints:6,grammarControls:controls.length,inheritedLiterals:16,protected:audit.protectedTracked,all60Blocked:true,futureImplemented:false}));
