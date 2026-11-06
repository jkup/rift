import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const here=import.meta.dirname,prior=resolve(here,'../../ts-035e3b-p'),out=join(here,'proposals');mkdirSync(out);
const read=n=>readFileSync(join(prior,'proposals',n),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const lf=s=>s.replaceAll('\r\n','\n'),crlf=s=>lf(s).replaceAll('\n','\r\n');
let helper=lf(read('script-producer-request.ts'));
helper=helper.replaceAll('export type ','type ');
helper=helper.slice(helper.indexOf('type ProducerLimits'));
helper=helper.replace(/function keys\([\s\S]*?\n}\n/,'');
helper=helper.replace(/\/\/ Typed ordinary host data[\s\S]*?export function parseScriptProducerArguments\(args: string\[\]\): ScriptProducerArguments \{/,'function parseProducerArguments(args: string[]): ScriptProducerRequest {');
helper=helper.replace('    need(text.length > 0, "limit");','    if (text.length === 0) throw new Error("script-producer/limit");');
helper=helper.replace('function parseProducerArguments(args: string[]): ScriptProducerRequest {','function parseProducerArguments(args: string[]): ScriptProducerRequest {\n    need(Array.isArray(args), "arguments");\n    for (let n = 0; n < args.length; n++) need(typeof args[n] === "string", "arguments");');
helper=helper.replace('    const sourcePaths: string[] = [];\n','').replace('        sourcePaths.push(args[n + 2]);\n','');
helper=helper.replace('    validateRequest(request, false);\n    return { request, resultPath: args[6], sourcePaths };',`    // Decimal syntax already guarantees nonnegative safe integers. Check fixed
    // limits only after every triple, preserving the positional error order.
    need(limits.sourceUnits === 100000 && limits.parseDepth === 128 && limits.evaluationDepth === 256, "fixed-limit");
    need(limits.wallMs <= 2147483647, "wall-limit");
    need(request.variant === "raw" ? request.units.length === 1 && request.preflightId === null : request.preflightId !== null, "variant-preflight");
    return request;`);
for(const [from,to] of [['need','producerNeed'],['id','producerIdentifier'],['hash','producerHash'],['decimal','producerDecimal']])helper=helper.replaceAll(new RegExp('\\b'+from+'(?=\\()','g'),to);
assert(!helper.includes('export '));assert(!helper.includes('Object.keys'));assert(!helper.includes('validateRequest'));
helper+=`
function prepareProducerRequest(args: string[], sourceTexts: string[]): ScriptProducerRequest {
    const request = parseProducerArguments(args);
    producerNeed(Array.isArray(sourceTexts) && sourceTexts.length === request.units.length, "source-texts");
    for (let n = 0; n < request.units.length; n++) {
        producerNeed(typeof sourceTexts[n] === "string", "source-texts");
        request.units[n].text = sourceTexts[n];
    }
    if (request.variant === "strict")
        producerNeed(request.units[request.units.length - 1].text.startsWith('"use strict";\\n'), "strict-transform");
    return request;
}

// Positional data only: no public API accepts or returns a producer request record.
// Ordinary string arrays; extra array properties are ignored. No hostile-object guarantee.
export function validateConformanceScriptArguments(args: string[]): void { parseProducerArguments(args); }
`;
const producer=`
// Mode selects wire data, not admission. Only the parent can verify preflight.
export function produceConformanceScripts(args: string[], sourceTexts: string[]): ChildV2 {
    const request = prepareProducerRequest(args, sourceTexts);
    const observation: ScriptObservationRequest = { nonce: request.nonce, requestSha256: request.requestSha256,
        action: request.action, preflightId: request.preflightId, steps: request.limits.steps, calls: request.limits.calls,
        units: request.units.map(unit => ({ id: unit.id, role: unit.role, text: unit.text })) };
    return new Attempt(observation, "conformance").run();
}
`;
let observation=lf(read('script-observation.ts'));
observation=observation.replace(/^import \{ validateScriptProducerRequest[^\n]+\n/,'');
observation=observation.slice(0,observation.indexOf('// Mode selects wire data, not admission.'));
observation+='// BEGIN private positional conformance request construction.\n'+helper+'// END private positional conformance request construction.\n'+producer;
let driver=lf(read('script-observation-driver.ts'));
driver=driver.replace(/^import \{ parseScriptProducerArguments[^\n]+\n/,'');
driver=driver.replace('observeScripts, produceConformanceScripts, type ObservationUnit','observeScripts, validateConformanceScriptArguments, produceConformanceScripts, type ObservationUnit');
driver=driver.replace(`        const parsed = parseScriptProducerArguments(args);
        // All controls and occurrence roles are checked before any source read.
        for (let n = 0; n < parsed.sourcePaths.length; n++)
            parsed.request.units[n].text = readFileSync(parsed.sourcePaths[n], "utf8");
        const result = produceConformanceScripts(parsed.request);
        writeFileSync(parsed.resultPath, scriptObservationJSONRecord(result), { encoding: "utf8", flag: "wx" });`, `        validateConformanceScriptArguments(args);
        // All controls and occurrence roles are checked before any source read.
        const sourceTexts: string[] = [];
        for (let n = 14; n < args.length; n += 3) sourceTexts.push(readFileSync(args[n + 2], "utf8"));
        const result = produceConformanceScripts(args, sourceTexts);
        writeFileSync(args[6], scriptObservationJSONRecord(result), { encoding: "utf8", flag: "wx" });`);
assert(!driver.includes('parsed.'));assert(!driver.includes('script-producer-request'));
let test=lf(read('script-producer.test.mjs'));
test=test.replace("import {parseScriptProducerArguments,validateScriptProducerRequest} from '../../build/node/src/script-producer-request.js';","import * as producer from '../../build/node/src/script-observation.js';\nconst {validateConformanceScriptArguments,produceConformanceScripts}=producer;");
test=test.replaceAll('parseScriptProducerArguments(row.argv)','validateConformanceScriptArguments(row.argv)').replace('validateScriptProducerRequest(row.request)','validateConformanceScriptArguments(row.argv)');
test+=`
test('revised positional API rejects records and has no public request constructor or validator',()=>{
 assert.deepEqual(Object.keys(producer).sort(),['observeScriptControl','observeScripts','produceConformanceScripts','validateConformanceScriptArguments'].sort());
 assert.equal(validateConformanceScriptArguments.length,1);assert.equal(produceConformanceScripts.length,2);
 const raw=read('future-producer-literals.json').find(r=>r.request.mode==='conformance'&&r.request.variant==='raw');
 const fakeArray=Object.assign(Object.create(Array.prototype),{...raw.argv,length:raw.argv.length});
 for(const value of [raw.request,{},null,fakeArray,[raw.request],new Array(raw.argv.length)]){
  assert.throws(()=>validateConformanceScriptArguments(value),{message:'script-producer/arguments'});
  assert.throws(()=>produceConformanceScripts(value,[]),{message:'script-producer/arguments'});
 }
 for(const value of [raw.request,{},null,[],[{}],[undefined]])assert.throws(()=>produceConformanceScripts(raw.argv,value),{message:'script-producer/source-texts'});
 const strict=read('future-producer-literals.json').find(r=>r.request.mode==='conformance'&&r.request.variant==='strict');
 assert.throws(()=>produceConformanceScripts(strict.argv,strict.request.units.map(()=> '0;')),{message:'script-producer/strict-transform'});
 const decorated=[...raw.argv];decorated.extra=raw.request;
 validateConformanceScriptArguments(decorated); // Array properties are not request fields.
});
`;
const manifest=[];
for(const [file,source] of [['script-observation.ts',observation],['script-observation-driver.ts',driver],['script-producer.test.mjs',test]]){
 const bytes=crlf(source),path='typescript/'+(file.endsWith('.mjs')?'tools/test262/':'src/')+file;
 writeFileSync(join(out,file),bytes,{flag:'wx'});manifest.push({operation:'replace',path,proposal:'proposals/'+file,before:hash(read(file)),after:hash(bytes)});
}
manifest.push({operation:'remove-unshipped-file',path:'typescript/src/script-producer-request.ts',before:hash(read('script-producer-request.ts')),after:null,reason:'All request types/construction are lexical in script-observation.ts; no public record APIs remain.'});
writeFileSync(join(here,'proposal-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
writeFileSync(join(here,'private-parser-fragment.ts'),helper,{flag:'wx'});
console.log(JSON.stringify(manifest,null,2));
