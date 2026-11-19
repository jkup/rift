import { parseBoundedScriptDeclarationPlan, parseBoundedScriptPreparation } from "../src/parser.js";
import type { DeclarationNodes } from "../src/script-declarations.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}
function nodes(): DeclarationNodes {
    return { assignmentNameEligible: new Map(), source: { text: "" }, body: [], scopes: new Map(), declarations: new Map() };
}
const invalid = [
    "while(false) async function f(){}",
    "do async function f(){} while(false);",
    "for(;false;) async function f(){}",
    "for(var x in {}) async function f(){}",
    "for(var x of []) async function f(){}",
    "if(false) async function f(){}",
    "if(true);else async function f(){}",
    "label: async function f(){}",
    "outer: inner: async function f(){}",
    "function outer(){while(false) async function f(){return 1}}",
    "class C{static{while(false) async function f(){}}}",
    "while(false) async /* comment */ function f(){}",
    "while(false) async function f(){await 1}",
    "console.log('no effect');while(false) async function f(){}",
    "globalThis.marker=1;while(false) async function f(){}",
];
for (const strict of [false, true]) {
    for (const source of invalid) {
        const text = (strict ? '"use strict";' : '') + source;
        const unit = { id: "async-statement", text };
        const original = parseBoundedScriptDeclarationPlan(unit);
        const result = parseBoundedScriptPreparation(unit, nodes());
        check(original.kind === "blocked" && original.rejection.kind === "unsupported-syntax", "planner stays non-certifying");
        check(result.kind === "blocked" && result.rejection.kind === "syntax-error" && result.rejection.ruleCode === "async-function-statement", text);
        if (original.kind === "blocked" && result.kind === "blocked") {
            check(JSON.stringify(original.diagnostic) === JSON.stringify(result.diagnostic), "original diagnostic");
        }
        let effects = 0;
        const realm = new Realm((_line: string) => { effects++; }, "script");
        realm.defineScriptGlobal("marker", { value: { kind: "number", value: 0 } });
        const prepared = prepareBoundedScript(unit, realm);
        check(prepared.kind === "blocked" && prepared.rejection.kind === "syntax-error", "public preparation");
        const marker = realm.globalObject.getOwnProperty("marker");
        check(effects === 0 && marker?.kind === "data" && marker.value.kind === "number" && marker.value.value === 0, "no preparation effects");
    }
}
for (const text of [
    "if(false)function f(){}",
    "label:function f(){}",
    "while(false){async function f(){}}", "do{async function f(){}}while(false);",
    "for(;false;){async function f(){}}", "for(var x in {}){async function f(){}}",
    "for(var x of []){async function f(){}}", "if(false){async function f(){}}",
    "if(true);else{async function f(){}}", "label:{async function f(){}}",
    "var async=0;while(false)async\nfunction f(){}",
    "var async=0;if(false)async\nfunction f(){}",
    "while(false)(async function f(){})();", "async function f(){return 1}",
]) {
    check(prepareBoundedScript({ id: "valid", text }, new Realm((_line: string) => {}, "script")).kind === "ready", "valid neighbor: " + text);
}
for (const text of [
    "while(false)function* f(){}", "while(false)async function* f(){}",
    "while(false)class C{}", "while(false)async function f(){};import x from 'x'",
    "while(false)async function f(){};with({}){}",
    "while(false)async function f(){};var x=;",
    "while(false)async function f(){};class C{#x;#x;}",
    "while(false)async function f(){};" + "(".repeat(300) + "0" + ")".repeat(300),
    "while(false)async function f(){};return;",
]) {
    const unit = { id: "unsupported", text };
    const original = parseBoundedScriptDeclarationPlan(unit);
    const result = parseBoundedScriptPreparation(unit, nodes());
    check(original.kind === "blocked" && result.kind === "blocked", "blocked neighbor");
    if (original.kind === "blocked" && result.kind === "blocked") {
        check(JSON.stringify(original.rejection) === JSON.stringify(result.rejection), "unsupported precedence: " + text);
        check(JSON.stringify(original.diagnostic) === JSON.stringify(result.diagnostic), "diagnostic precedence");
    }
}
for (const text of [
    "var ok=false;try{eval('while(false)async function f(){}')}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{(0,eval)('while(false)async function f(){}')}catch(e){ok=e instanceof SyntaxError}ok",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "eval", text }, realm);
    check(prepared.kind === "ready", "eval caller");
    if (prepared.kind !== "ready") continue;
    const result = evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "eval SyntaxError");
}
console.log("async statement certification passed");
