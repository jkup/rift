// One-time design materialization only. Never installs or executes engine code.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const here=import.meta.dirname,root=resolve(here,'../../../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const save=(p,s)=>writeFileSync(resolve(here,'proposals',p),s,{flag:'wx'});
let observer=read('src/script-observation.ts');
function replace(a,b){assert.equal(observer.split(a).length,2,a);observer=observer.replace(a,b);}
replace('private mode: "script-observation" | "conformance" = "script-observation")','private mode: "script-observation" | "conformance" = "script-observation", private preflightControl: boolean = false)');
replace('            if (answer.result.kind !== "normal" || unit.role === "test") return answer;',
'            // The closed preflight route stops at the actual control harness, even\r\n'+
'            // when its oracle reports false. Never prepare the trailing test.\r\n'+
'            if (this.preflightControl && unit.id === "u" + (this.request.units.length - 2)) return answer;\r\n'+
'            if (answer.result.kind !== "normal" || unit.role === "test") return answer;');
const frozen=JSON.parse(read('test/fixtures/script-observation/frozen.json'));
let tail=`
// BEGIN closed conformance preflight prerequisite. Data only; no success token.
type PreflightRequest = { control: string; input: string; observation: ScriptObservationRequest };
function preflightNeed(ok: boolean, code: string): void { if (!ok) throw new Error("script-preflight/" + code); }
function preflightDecimal(text: string): number {
    preflightNeed(text.length > 0, "limit");
    for (let n = 0; n < text.length; n++) preflightNeed(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    preflightNeed(Number.isSafeInteger(value), "limit");
    return value;
}
function preflightSource(control: string, input: string): string {
    switch (control) {
`;
for(const row of frozen.h7)tail+=`        case ${JSON.stringify(row.id)}: return ${JSON.stringify(row.source)};\n`;
tail+=`        case "I01": return input === "alpha" ? ${JSON.stringify(frozen.preflightInput.sources[0])} : ${JSON.stringify(frozen.preflightInput.sources[1])};
    }
    throw new Error("script-preflight/control");
}
// Exact pinned Test262 originals, including comments and line endings. LICENSE:
// test/fixtures/harness-bundle/LICENSE, revision91c70759363c46557b694792bf34a2551a7af5ba.
const preflightAssert = ${JSON.stringify(read('test/fixtures/harness-bundle/assert.js'))};
const preflightSta = ${JSON.stringify(read('test/fixtures/harness-bundle/sta.js'))};
function parsePreflightArguments(args: string[]): PreflightRequest {
    preflightNeed(Array.isArray(args), "arguments");
    for (let n = 0; n < args.length; n++) preflightNeed(typeof args[n] === "string", "arguments");
    preflightNeed(args.length === 29 || args.length === 32, "argc");
    preflightNeed(args[0] === "conformance-preflight-v1", "purpose");
    preflightSource(args[1], "alpha");
    preflightNeed(args[2] === "alpha" || args[2] === "beta", "input");
    preflightNeed(args[3] === "conformance", "mode");
    preflightNeed(args[4] === "strict", "variant");
    preflightNeed(args[5] === "execute", "action");
    preflightNeed(producerIdentifier(args[6]), "nonce");
    preflightNeed(producerHash(args[7]), "request-hash");
    preflightNeed(args[8] === "-", "preflight");
    preflightNeed(args[9].length > 0, "result-path");
    const sourceUnits = preflightDecimal(args[10]), parseDepth = preflightDecimal(args[11]);
    const steps = preflightDecimal(args[12]), calls = preflightDecimal(args[13]);
    const evaluationDepth = preflightDecimal(args[14]), wallMs = preflightDecimal(args[15]);
    preflightDecimal(args[16]);
    const units: ObservationUnit[] = [];
    for (let n = 17; n < args.length; n += 3) {
        preflightNeed(args[n] === "u" + ((n - 17) / 3) && args[n + 1] === (n === args.length - 3 ? "test" : "harness") && args[n + 2].length > 0, "unit");
        units.push({ id: args[n], role: n === args.length - 3 ? "test" : "harness", text: "" });
    }
    preflightNeed(sourceUnits === 100000 && parseDepth === 128 && evaluationDepth === 256, "fixed-limit");
    preflightNeed(wallMs <= 2147483647, "wall-limit");
    return { control: args[1], input: args[2], observation: { nonce: args[6], requestSha256: args[7], action: "execute", preflightId: null, steps, calls, units } };
}
function preparePreflightRequest(args: string[], sourceTexts: string[]): PreflightRequest {
    const request = parsePreflightArguments(args), units = request.observation.units;
    preflightNeed(Array.isArray(sourceTexts) && sourceTexts.length === units.length, "source-texts");
    for (let n = 0; n < units.length; n++) preflightNeed(typeof sourceTexts[n] === "string", "source-texts");
    preflightNeed(sourceTexts[0] === preflightAssert, "harness-source");
    for (let n = 1; n < units.length - 2; n++) preflightNeed(sourceTexts[n] === preflightSta, "harness-source");
    preflightNeed(sourceTexts[units.length - 2] === preflightSource(request.control, request.input), "control-source");
    preflightNeed(sourceTexts[units.length - 1] === '"use strict";\\n', "test-source");
    for (let n = 0; n < units.length; n++) units[n].text = sourceTexts[n];
    return request;
}
export function validateConformancePreflightArguments(args: string[]): void { parsePreflightArguments(args); }
// Trusted positional string arrays, as in E3b; no callback/AST/Realm parameters.
export function produceConformancePreflightControl(args: string[], sourceTexts: string[]): { child: ChildV2; report: ScriptControlReport } {
    const request = preparePreflightRequest(args, sourceTexts);
    const attempt = new Attempt(request.observation, "conformance", true);
    attempt.controlSetup(request.control, request.input);
    const child = attempt.run();
    return { child, report: attempt.report() };
}
// END closed conformance preflight prerequisite.
`;
save('script-observation.ts',observer+tail.replaceAll('\n','\r\n'));
let driver=read('test/script-observation.ts');
driver=driver.replace('observeScriptControl, type ObservationUnit','observeScriptControl, validateConformancePreflightArguments, produceConformancePreflightControl, type ObservationUnit');
driver=driver.replace('function main(): void {','function main(): void {\r\n'+`    if (process.argv[2] === "conformance-preflight-v1") {
        const args = process.argv.slice(2);
        validateConformancePreflightArguments(args);
        const texts: string[] = [];
        for (let n = 17; n < args.length; n += 3) texts.push(readFileSync(args[n + 2], "utf8"));
        const result = produceConformancePreflightControl(args, texts);
        writeFileSync(args[9], scriptObservationJSONRecord(result.child), { encoding: "utf8", flag: "wx" });
        writeFileSync(args[9] + ".control.json", JSON.stringify(result.report), { encoding: "utf8", flag: "wx" });
        return;
    }
`.replaceAll('\n','\r\n'));
save('script-observation-driver-test.ts',driver);
const oldTest=read('tools/test262/script-producer.test.mjs');
const oldExports="['observeScriptControl','observeScripts','produceConformanceScripts','validateConformanceScriptArguments']";
assert.equal(oldTest.split(oldExports).length,2);
save('script-producer.test.mjs',oldTest.replace(oldExports,"['observeScriptControl','observeScripts','produceConformanceScripts','validateConformanceScriptArguments','produceConformancePreflightControl','validateConformancePreflightArguments']"));
console.log('Prepared3 whole-file replacements; no installed production changes');
