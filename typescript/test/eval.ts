import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script"), maxSteps = 100000, maxCalls = 64) {
    const prepared = prepareBoundedScript({ id: "eval-caller", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps, maxCalls }), prepared.record).completion;
}
function expect(text: string, expected: Value = { kind: "boolean", value: true }, realm?: Realm): void {
    const result = run(text, realm);
    check(result.type === "normal" && sameValue(result.value, expected), text);
}
for (const text of [
    "eval('1+2')===3 && eval()===undefined && eval(undefined)===undefined",
    "var o={toString(){throw 1}};eval(o)===o&&eval(null)===null&&eval(true)===true&&eval(42)===42",
    "eval('')===undefined&&eval('var x')===undefined&&eval('1;var y;')===1",
    "function f(){var x=7;return eval('x')}f()===7",
    "function f(){eval('var x=7');return x}f()===7&&typeof x==='undefined'",
    "function f(){var x=1;eval('x=7');return x}f()===7",
    "function f(){var x=7;return (eval)('x')}f()===7",
    "function f(){var privateName=7;return (0,eval)('typeof privateName')}f()==='undefined'",
    "function f(){var privateName=7;return eval?.('typeof privateName')}f()==='undefined'",
    "function f(){var privateName=7;return ({e:eval}).e('typeof privateName')}f()==='undefined'",
    "function f(){var privateName=7;var e=eval;return e('typeof privateName')}f()==='undefined'",
    "function f(eval){var x=7;return eval('x')}f(eval)===7",
    "var e=eval;function f(){var x=7;return eval((eval=function(){return 2},'x'))}var r=f();eval=e;r===7",
    "function f(){function eval(s){return 7}return eval('missing')}f()===7",
    "function f(){'use strict';eval('var x=7;function g(){}');return typeof x+typeof g}f()==='undefinedundefined'",
    "function f(){eval('\"use strict\";var x=7');return typeof x}f()==='undefined'",
    "function f(){eval('let x=7;const y=8');return typeof x+typeof y}f()==='undefinedundefined'",
    "function f(){return eval('let x=7;()=>x')}f()()===7",
    "function f(){var x=7;return eval('eval(\"x\")')}f()===7",
    "eval('function f(){return 1}function f(){return 7}f()')===7",
    "eval('g();function g(){return 7}')===7",
    "function f(){return eval('arguments[0]')}f(7)===7",
    "function f(){return (()=>eval('arguments[0]'))()}f(7)===7",
    "function f(a){eval('arguments[0]=7');return a}f(1)===7",
    "function f(a){'use strict';eval('arguments[0]=7');return a}f(1)===1",
    "function f(a=eval('var x=7; x')){return a+x}f()===14",
    "function f(a=eval('typeof body')){var body=7;return a}f()==='undefined'",
    "function f(){return eval('this')}var o={f:f};o.f()===o",
    "function f(){'use strict';return eval('this')}f()===undefined",
    "(0,eval)('\"use strict\";this')===this",
    "function f(){eval('var x=1');return delete x&&typeof x==='undefined'}f()",
    "function f(){eval('var x=1');x=(delete x,7);return x===7&&delete x}f()",
    "function f(){eval('var x={valueOf(){delete x;return 1}}');x++;return x===2&&delete x}f()",
    "function f(){var x=1;eval('var x=7');return x===7&&!(delete x)}f()",
    "eval('var x=7');Object.getOwnPropertyDescriptor(this,'x').configurable&&delete x",
    "eval('function f(){}');Object.getOwnPropertyDescriptor(this,'f').configurable&&delete f",
    "var x=1;eval('var x=7');x===7&&!Object.getOwnPropertyDescriptor(this,'x').configurable",
    "function f(){let x=1;try{eval('var x=7')}catch(e){return e instanceof SyntaxError}return false}f()",
    "function f(){let x=1;try{eval('function x(){}')}catch(e){return e instanceof SyntaxError}return false}f()",
    "function f(){'use strict';try{eval('function g(a,a){}')}catch(e){return e instanceof SyntaxError}return false}f()",
    "function f(){try{eval('let x;let x')}catch(e){return e instanceof SyntaxError}return false}f()",
    "var sentinel={};var caught;try{eval('throw sentinel')}catch(e){caught=e}caught===sentinel",
    "function f(){var x=7;try{eval('throw 1')}catch(e){}return x}f()===7",
    "function f(){eval('{function g(){return 7}}');return g()}f()===7",
    "function f(){eval('delete g;{function g(){return 7}}');return g()===7&&delete g}f()",
    "function f(){let g=1;eval('{function g(){return 7}}');return g}f()===1",
    "eval('eval(\"1\");{function g(){return 7}}');g()===7",
    "function f(){try{throw 1}catch(e){eval('var e=7');if(e!==7)return false}return e===undefined}f()",
    "function f(){try{throw 1}catch(e){eval('{function e(){}}');if(e!==1)return false}return typeof e==='undefined'}f()",
    "eval.call(null,'1+2')===3&&eval.apply(null,['1+2'])===3&&eval.bind(null)('1+2')===3",
    "typeof eval==='function'&&eval.name==='eval'&&eval.length===1&&!eval.hasOwnProperty('prototype')",
    "eval.toString()==='function eval() { [native code] }'",
    "var caught=false;try{new eval('1')}catch(e){caught=e instanceof TypeError}caught",
    "var f=eval('(function(){return 7})');f.toString()==='function(){return 7}'&&f()===7",
]) expect(text);

const realm = new Realm((_line: string) => {}, "script"), foreign = new Realm((_line: string) => {}, "script");
if (foreign.evalIntrinsic === null) throw new Error("missing foreign eval");
realm.defineScriptGlobal("foreignEval", { value: { kind: "object", object: foreign.evalIntrinsic }, writable: true, configurable: true });
expect("function f(eval){var privateName=7;return eval('typeof privateName')}f(foreignEval)==='undefined'", undefined, realm);
expect("foreignEval('this')", foreign.globalThisValue, realm);
expect("eval('var temporary=7')", { kind: "undefined" }, realm);
expect("let temporary=8;temporary===8&&this.temporary===7", undefined, realm);

for (const text of ["try{eval('class C{}')}catch(e){true}", "try{eval('return 1')}catch(e){true}", "try{eval('(function f(){return 7})')}catch(e){true}"]) {
    const result = run(text);
    check(result.type === "throw" && result.origin.kind === "unsupported-operation" && result.origin.capabilityCode === "runtime.eval-source", "unsupported eval stays fatal");
}
const limited = run("eval('while(true){}')", undefined, 100);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "shared step limit");
const recursion = run("function f(){return eval('f()')}f()", undefined, 100000, 8);
check(recursion.type === "throw" && recursion.origin.kind === "resource-limit", "shared call limit");
{
    const session = createScriptSession(), owner = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "outer", text: "eval('\\nthrow 7')" }, owner);
    if (prepared.kind !== "ready") throw new Error("throw preparation");
    const result = evaluateScript(session, prepared.record).completion, state = session.inspect();
    check(result.type === "throw" && result.value.kind === "number" && result.value.value === 7, "exact eval throw");
    check(state.active === null && state.calls === 0 && state.lastAbrupt?.unitId === "<eval>" && state.lastAbrupt.loc.line === 2, "eval source snapshot");
    check(state.lastAbrupt !== null && state.lastAbrupt.record.inspect().unit.text === "\nthrow 7", "original eval source retained");
}
{
    const session = createScriptSession(), owner = new Realm((_line: string) => {}, "script"), fault = new Error("eval host fault");
    owner.defineScriptGlobal("boom", { value: { kind: "object", object: owner.createBuiltin("boom", 0, (_receiver, _args, _context, _loc): ValueCompletion => { throw fault; }) } });
    const prepared = prepareBoundedScript({ id: "host fault", text: "var caught=false;try{eval('boom()')}catch(e){caught=true}" }, owner);
    if (prepared.kind !== "ready") throw new Error("host fault preparation");
    let seen = false;
    try { evaluateScript(session, prepared.record); }
    catch (error) { seen = error instanceof Error && error === fault; }
    check(seen && session.inspect().active === null && session.inspect().calls === 0, "host fault restoration");
    const recovery = prepareBoundedScript({ id: "recovery", text: "!caught&&eval('1+2')===3" }, owner);
    if (recovery.kind !== "ready") throw new Error("recovery preparation");
    const result = evaluateScript(session, recovery.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "same session recovery");
}
console.log("Eval passed");
