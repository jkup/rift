// Authoring tool: copies proposals/evidence only; never runs a guest or compiler.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(resolve(root,p));
const save=(p,v)=>writeFileSync(resolve(here,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const replace=(s,from,to)=>{assert.equal(s.split(from).length,2,from);return s.replace(from,to);};
const manifest=[];
let s=read('typescript/src/script-observation.ts').toString();
const nl=s.includes('\r\n')?'\r\n':'\n';
s='import { validateScriptProducerRequest, type ScriptProducerRequest } from "./script-producer-request.js";'+nl+s;
s=replace(s,'constructor(private request: ScriptObservationRequest) {','constructor(private request: ScriptObservationRequest, private mode: "script-observation" | "conformance" = "script-observation") {');
s=replace(s,'mode: "script-observation", operation, source,','mode: this.mode, operation, source,');
s+=nl+[
'// Mode selects wire data, not admission. Only the parent can verify preflight.',
'export function produceConformanceScripts(request: ScriptProducerRequest): ChildV2 {',
'    validateScriptProducerRequest(request);',
'    const observation: ScriptObservationRequest = { nonce: request.nonce, requestSha256: request.requestSha256,',
'        action: request.action, preflightId: request.preflightId, steps: request.limits.steps, calls: request.limits.calls,',
'        units: request.units.map(unit => ({ id: unit.id, role: unit.role, text: unit.text })) };',
'    return new Attempt(observation, "conformance").run();',
'}', ''].join(nl);
function proposal(path,body){const proposal='proposals/'+path.split('/').at(-1);save(proposal,body);manifest.push({path,proposal,before:hash(read(path)),after:hash(Buffer.from(body))});}
proposal('typescript/src/script-observation.ts',s);
s=read('typescript/src/script-observation-driver.ts').toString();
s=replace(s,'import { observeScripts, type ObservationUnit }','import { observeScripts, produceConformanceScripts, type ObservationUnit }');
s='import { parseScriptProducerArguments } from "./script-producer-request.js";'+nl+s;
s=replace(s,'    const args = process.argv.slice(2);','    const args = process.argv.slice(2);'+nl+[
'    if (args[0] === "conformance") {',
'        const parsed = parseScriptProducerArguments(args);',
'        // All controls and occurrence roles are checked before any source read.',
'        for (let n = 0; n < parsed.sourcePaths.length; n++)',
'            parsed.request.units[n].text = readFileSync(parsed.sourcePaths[n], "utf8");',
'        const result = produceConformanceScripts(parsed.request);',
'        writeFileSync(parsed.resultPath, scriptObservationJSONRecord(result), { encoding: "utf8", flag: "wx" });',
'        return;',
'    }'].join(nl));
proposal('typescript/src/script-observation-driver.ts',s);
save('proposal-manifest.json',manifest);
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
save('preservation.json',tracked.filter(p=>!['typescript/TASKS.md','typescript/COORDINATION.md'].includes(p)&&!p.startsWith('typescript/docs/validation/ts-035e3b-p/')&&p!=='typescript/docs/script-execution-producer.md').map(path=>({path,sha256:hash(read(path))})));
const candidates=tracked.filter(p=>/^typescript\/(src|test|tools)\/.*\.(ts|mjs)$/.test(p));
const closure=candidates.map(path=>{const bytes=read(path),text=bytes.toString();return {path,sha256:hash(bytes),imports:[...text.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(m=>m[1]),exports:[...text.matchAll(/export\s+(?:async\s+)?(?:function|class|type|const)\s+(\w+)/g)].map(m=>m[1]),producerReferences:text.split(/\r?\n/).flatMap((line,n)=>/script-observation|script-result|script-driver-result|script-plan|script-ledger|composeScriptEnvelope/.test(line)?[{line:n+1,text:line}]:[])};});
save('closure.json',closure);
save('new-file-manifest.json',[{path:'typescript/src/script-producer-request.ts',proposal:'proposals/script-producer-request.ts',sha256:hash(readFileSync(resolve(here,'proposals/script-producer-request.ts')))}]);
console.log(JSON.stringify({oldProposals:manifest.length,baseline:tracked.length,closure:closure.length}));
