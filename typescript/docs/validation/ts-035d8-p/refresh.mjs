// Editorial refresh only. Never load or apply proposed production code.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as p from '../../../build/node/src/parser.js';
const here=new URL('./',import.meta.url),prior=new URL('../ts-035d7-p/',here),root=new URL('../../../../',here);
const base='dbee9bd895a9d73fc4f588eaa1bceb863417117a',oldBase='041982113d292a9035ea644bdb3eae104963942f';
const read=f=>readFileSync(new URL(f,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const write=(name,value)=>{const u=new URL(name,here);mkdirSync(new URL('./',u),{recursive:true});writeFileSync(u,value);};
const json=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
for(const name of ['references.json','cases.mjs','inputs/alpha.js','inputs/beta.js'])write(name,readFileSync(new URL(name,prior)));
// The accepted literal oracle is reused verbatim, then checked against actual D7.
const matrix=JSON.parse(readFileSync(new URL('semantic-matrix.json',prior)));
for(const row of matrix.rows)assert.deepEqual(p.auditBoundedScriptLexicalStatements(row.text),row.expected,row.id);
matrix.base=base;matrix.claim='Actual accepted D7 audit equals every inherited full literal; dispatch/producer literals are future obligations for both hosts.';
json('semantic-matrix.json',matrix);
for(const name of ['inherited-preparations.json.gz','inherited-manifest.json'])write(name,readFileSync(new URL(name,prior)));
const inherited=JSON.parse(gunzipSync(readFileSync(new URL('inherited-preparations.json.gz',here))));
const inheritedAudits=inherited.rows.map(r=>({scope:r.scope,id:r.id,audit:p.auditBoundedScriptLexicalStatements(r.text)}));
assert(inheritedAudits.every(r=>r.audit.kind!=='eligible'));
json('inherited-audits.json',{base,rows:inheritedAudits});
for(const name of ['probe.mjs','wire.mjs','controls.mjs','verify.mjs','check.mjs','proposals.mjs']){
 let s=readFileSync(new URL(name,prior),'utf8').replaceAll(oldBase,base).replaceAll('ts-035d7-p/','ts-035d8-p/').replaceAll('script-lexical-statement-rule.md','script-lexical-statement-dispatch.md').replaceAll('accepted D6','accepted D7').replaceAll('TS-035D7-P','TS-035D8-P');
 if(name==='probe.mjs')s=s.replace('for(const row of matrix.rows){','for(const row of matrix.rows){assert.deepEqual(p.auditBoundedScriptLexicalStatements(row.text),row.expected,row.id);').replace('No native/new audit implementation.','No native/future dispatch implementation.');
 if(name==='check.mjs')s=s.replace(/for\(const e of json\('original-oracle\/manifest.json'\)\).*?;\r?\n/,'').replace('no build, new audit, future emission or native test','no build, future emission or native test');
 if(name==='proposals.mjs'){
  const at=s.indexOf('const tree=');
  s=s.slice(0,at)+`edit('typescript/docs/validation/ts-035d7/validate.mjs',"assert.deepEqual(actual.ordinary,i<140?row.current:row.expected.result,row.id+' eight ordinary');","assert.deepEqual(actual.ordinary,i<140?{...row.current,preparation:row.futurePreparation}:row.expected.result,row.id+' eight ordinary');");\n`+s.slice(at);
  s=s.replace('changes.size,5','changes.size,6').replaceAll('five future codec migrations','six future dispatch migrations').replaceAll('identity in D7; exact separately reviewed future dispatch migration','exact reviewed future dispatch migration');
 }
 if(name==='verify.mjs')s=s.replace('changes,5','changes,6');
 write(name,s);
}
const tree=execFileSync('git',['ls-tree','-r',base],{cwd:root,encoding:'utf8'}).trim().split('\n').map(l=>{const [a,path]=l.split('\t');return {path,blob:a.split(' ')[2]};});
const own=f=>['typescript/TASKS.md','typescript/COORDINATION.md','typescript/docs/script-lexical-statement-dispatch.md'].includes(f)||f.startsWith('typescript/docs/validation/ts-035d8-p/');
const priorAudit=JSON.parse(readFileSync(new URL('audit.json',prior)));
const artifacts=priorAudit.artifacts.map(e=>({...e,sha256:hash(read(e.path))}));
json('audit.json',{base,node:process.version,claim:'212 records/70 gates inherited; no full build/native or dispatch run.',protectedInventory:tree.filter(e=>!own(e.path)).map(e=>({...e,sha256:hash(read(e.path))})),artifacts,planned:priorAudit.planned});
const pattern=/lexical-declaration-statement|lexical-rule|parse\.declaration-statement|parseBoundedScriptPreparation|futurePreparation|row\.current|r\.current|ruleCode:one|statement-rule|assignment-rule/;
json('source-consumers.json',{base,pattern:pattern.source,consumers:tree.filter(e=>e.path.startsWith('typescript/')&&/\.(ts|mjs)$/.test(e.path)).flatMap(e=>{const lines=read(e.path).toString().split(/\r?\n/).flatMap((text,i)=>pattern.test(text)?[{line:i+1,text}]:[]);return lines.length?[{...e,sha256:hash(read(e.path)),lines}]:[];})});
const changes=[];
function production(path,from,to){let c=changes.find(c=>c.path===path);if(!c){c={path,original:read('typescript/'+path).toString(),proposed:read('typescript/'+path).toString()};changes.push(c);}assert.equal(c.proposed.split(from).length,2,path);c.proposed=c.proposed.replace(from,to);}
const signature='export function parseBoundedScriptPreparation(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {';
production('src/parser.ts',signature,signature+`
    const original = parseBoundedScriptPreparationBeforeLexicalAudit(unit, nodes);
    if (original.kind !== "blocked" || original.rejection.kind !== "unsupported-syntax" ||
        original.rejection.capabilityCode !== "parse.declaration-statement") return original;
    const audit = auditBoundedScriptLexicalStatements(original.unit.text);
    if (audit.kind !== "eligible") return original;
    const first = audit.candidates[0];
    if (first === undefined) throw new Error("eligible lexical audit requires candidate");
    return { kind: "blocked", goal: "Script", unit: original.unit,
        rejection: { kind: "syntax-error", ruleCode: "lexical-declaration-statement" },
        diagnostic: { phase: "parse", name: "SyntaxError", message: "lexical declaration is not allowed in Statement position",
            loc: { line: first.keyword.loc.line, column: first.keyword.loc.column } } };
}
// Preserve D6 dispatch, its original rejection and retained nodes before retry.
function parseBoundedScriptPreparationBeforeLexicalAudit(unit: ScriptSourceUnit, nodes: DeclarationNodes): DeclarationPlanResult {`);
production('src/script-observation.ts','rejection.ruleCode !== "assignment-target")','rejection.ruleCode !== "assignment-target" && rejection.ruleCode !== "lexical-declaration-statement")');
production('src/script-observation-types.ts','| "assignment-target";','| "assignment-target" | "lexical-declaration-statement";');
for(const file of ['tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs'])production(file,"'duplicate-strict-parameter','assignment-target']","'duplicate-strict-parameter','assignment-target','lexical-declaration-statement']");
for(const c of changes)write('production-proposal/'+c.path,c.proposed);
json('production-manifest.json',{base,claim:'Editorial full file proposals, not imported/compiled/applied.',entries:changes.map(c=>({path:c.path,originalSha256:hash(c.original),proposedSha256:hash(c.proposed),originalBytes:Buffer.from(c.original).toString('base64'),proposedBytes:Buffer.from(c.proposed).toString('base64')}))});
console.log(JSON.stringify({audits:matrix.rows.length,inherited:inheritedAudits.length,production:changes.length}));
