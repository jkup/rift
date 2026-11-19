import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}
function expectTrue(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "yield-execution", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") return;
    const result = evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const executions = [
    "var yield=6;yield++;yield===7",
    "let yield=3;yield+=4;yield===7",
    "const yield=7;yield===7",
    "function f(yield){return yield}f(7)===7",
    "function f(yield=7){return yield}f()===7",
    "function f(...yield){return yield[0]}f(7)===7",
    "function yield(){return 7}yield()===7",
    "var f=function yield(){return 7};f()===7",
    "var f=yield=>yield;f(7)===7",
    "var f=(yield)=>yield;f(7)===7",
    "var {yield}={yield:7};yield===7",
    "var [yield]=[7];yield===7",
    "var yield;({x:yield}={x:7});yield===7",
    "var yield;[...yield]=[7];yield[0]===7",
    "var yield=7;var o={yield};o.yield===7",
    "var out=0;try{throw 7}catch(yield){out=yield}out===7",
    "var out=0;yield:while(true){out=7;break yield}out===7",
    "var out=0;yield:for(var i=0;i<3;i++){if(i<2)continue yield;out=7}out===7",
    "var out=0;for(let yield of [3,4])out+=yield;out===7",
    "function* yield(){yield 7}yield().next().value===7",
    "function* f(){function g(yield){return yield}yield g(7)}f().next().value===7",
    "function* f(x=function(yield){return yield}){yield x(7)}f().next().value===7",
    "function* f(){var g=function yield(){return 7};yield g()}f().next().value===7",
    "var yield=7;function* f(){var g=()=>yield;return g()}f().next().value===7",
    "var yield=7;function* f(x=()=>yield){return x()}f().next().value===7",
    "function* f(){var o={m(yield){return yield}};return o.m(7)}f().next().value===7",
    "var out=0;async function f(yield){out=yield}f(7);out===7",
    "var out=0;var f=async yield=>{out=yield};f(7);out===7",
    "var out=0;var f=async(yield)=>{out=yield};f(7);out===7",
    "var yield=7;eval('yield')===7",
    "eval('var yield=7;yield')===7",
    "Function('yield','return yield')(7)===7",
    'var ok=false;try{eval("\\\"use strict\\\";var yield=1")}catch(e){ok=e instanceof SyntaxError}ok',
    'function f(){"use strict";try{eval("var yield=1")}catch(e){return e instanceof SyntaxError}}f()',
    '"use strict";var o={yield:7};o.yield===7',
    '"use strict";function* f(){yield 7}f().next().value===7',
];
for (const text of executions) expectTrue(text);
for (const text of [
    '"use strict";var yield=1;',
    '"use strict";yield;',
    '"use strict";yield:while(false){break yield;}',
    'function yield(){"use strict";}',
    'function* yield(){"use strict";}',
    'function f(yield){"use strict";}',
    'class C{x=yield}',
    'class C{m(yield){}}',
    'class C{static{function f(yield){return yield}}}',
]) {
    let effects = 0;
    const realm = new Realm((_line: string) => { effects++; }, "script");
    const prepared = prepareBoundedScript({ id: "yield-strict", text: text + ';console.log("no effect");' }, realm);
    check(prepared.kind === "blocked" && prepared.rejection.kind === "syntax-error" && prepared.rejection.ruleCode === "strict-reserved-identifier", text);
    check(effects === 0, "strict preparation must not execute");
}
for (const text of [
    "function* f(yield){}",
    "function* f({yield}){}",
    "function* f(x=yield){}",
    "function* f(){var yield=1}",
    "(function* yield(){});",
    "function* f(){function yield(){}}",
    "function* f(){var g=(yield)=>1;}",
    "function* f(){var g=async(yield)=>1;}",
    "function* f(){var g=(x=yield 1)=>x;}",
    '"use strict";var yield=1;import x from "x";',
    '"use strict";var yield=1;var x=;',
]) {
    const prepared = prepareBoundedScript({ id: "yield-unsupported", text }, new Realm((_line: string) => {}, "script"));
    check(prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax", text);
}
check(parse("var yield=1;").rejection?.kind === "unsupported-syntax", "legacy admission unchanged");
check(executions.length === 36, "execution denominator");
console.log("yield identifiers passed");
