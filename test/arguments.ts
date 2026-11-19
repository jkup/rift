import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, sameValue, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function run(text: string, realm = new Realm((_line: string) => {}, "script"), steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "arguments", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    try { return evaluateScript(session, prepared.record).completion; }
    finally { check(session.inspect().active === null && session.inspect().calls === 0, "restored session"); }
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }), text);
}
for (const prefix of ["", "'use strict';"]) for (const source of [
    "function f(a){return arguments;}var x=f(1,2);x.length===2&&x[0]===1&&x[1]===2&&!Array.isArray(x)&&Object.prototype.toString.call(x)==='[object Arguments]';",
    "function f(){return arguments;}f()!==f()&&f().length===0;",
    "function f(){return ()=>arguments;}f(3,4)().length===2&&f(3)()[0]===3;",
    "function f(){return ()=>()=>arguments;}f(7)()()[0]===7;",
    "function f(){function g(){return arguments;}return [arguments[0],g(8)[0]];}f(7).join(',')==='7,8';",
    "function f(a=arguments[0]){return [a,arguments.length];}f(7).join(',')==='7,1'&&f().length===2;",
    "function f(a=()=>arguments){return a;}f(undefined,8)()[1]===8;",
    "function f(...rest){rest[0]=7;arguments[1]=8;return arguments[0]===1&&rest[1]===2;}f(1,2);",
    "function f(a=1){a=7;return arguments[0]===2;}f(2);",
    "function f(a=1){arguments[0]=7;return a===2;}f(2);",
    "function f(){return arguments;}var x=f(1,2);var sum=0;for(var n of x){sum+=n;}sum===3;",
    "function C(a){this.x=arguments[0];}new C(7).x===7;",
    "var o={m(a){return arguments[0];},set x(a){this.y=arguments[0];}};o.x=8;o.m(7)===7&&o.y===8;",
    "function f(){return arguments.length;}f.apply(null,[1,2])===2&&f.bind(null,1)(2,3)===3;",
    "typeof arguments==='undefined';",
]) passes(prefix + source);

for (const source of [
    "function f(a=arguments){var arguments;return a===arguments;}f();",
    "function f(a){a=7;return arguments[0];}f(1)===7;",
    "function f(a){arguments[0]=7;return a;}f(1)===7;",
    "function f(a){return [arguments,()=>a];}var x=f(1);x[0][0]=7;x[1]()===7;",
    "function f(a){return [arguments,function(v){a=v;}];}var x=f(1);x[1](7);x[0][0]===7;",
    "function f(a){a=7;return arguments;}var x=f();x.length===0&&!Object.hasOwn(x,'0');",
    "function f(a){delete arguments[0];arguments[0]=7;return a;}f(1)===1;",
    "function f(a){a=7;Object.freeze(arguments);a=8;return arguments[0];}f(1)===7;",
    "function f(a){Object.seal(arguments);a=7;return arguments[0];}f(1)===7;",
    "function f(a){Object.defineProperty(arguments,'0',{value:7,writable:false});a=8;return arguments[0];}f(1)===7;",
    "function f(){return arguments.callee===f;}f();",
    "function f(){var arguments;return arguments.length;}f(1,2)===2;",
    "function f(){arguments=7;return arguments;}f()===7;",
    "function f(arguments){return arguments;}f(7)===7;",
    "function f(...arguments){return arguments.length;}f(1,2)===2;",
    "function f(){let arguments=7;return arguments;}f()===7;",
    "function f(){function arguments(){return 7;}return arguments();}f()===7;",
    "function f(a=arguments){function arguments(){return 7;}return a.length===2&&arguments()===7;}f(undefined,8);",
    "function f(a=arguments){let arguments=7;return a.length===2&&arguments===7;}f(undefined,8);",
    "function f(){return (arguments)=>arguments;}f()(7)===7;",
    "function f(arguments=arguments){}var caught=false;try{f();}catch(e){caught=e instanceof ReferenceError;}caught;",
    "Function('a','arguments[0]=7;return a;')(1)===7;",
]) passes(source);

passes("'use strict';function f(a){a=7;return arguments[0];}f(1)===1;");
passes("'use strict';function f(a){arguments[0]=7;return a;}f(1)===1;");
for (const source of ["function f(){'use strict';return arguments;}", "function f(a=1){return arguments;}", "function f(...a){return arguments;}"])
    passes(source + "var n=0;var a=f();try{a.callee;}catch(e){if(e instanceof TypeError)n++;}try{a.callee=1;}catch(e){if(e instanceof TypeError)n++;}n===2;");

for (const source of [
    "'use strict';var arguments;", "'use strict';let arguments;", "'use strict';const arguments=1;",
    "'use strict';arguments=1;", "'use strict';arguments++;", "'use strict';arguments+=1;",
    "function f(arguments){'use strict';}", "function arguments(){'use strict';}",
    "'use strict';function f(arguments=1){}", "'use strict';(arguments)=>arguments;",
    "'use strict';try{}catch(arguments){}", "'use strict';function f(){function arguments(){}}",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    check(prepareBoundedScript({ id: "invalid-arguments", text: source }, realm).kind !== "ready", "strict restriction: " + source);
}
check(parse("function f(){return arguments;}").error !== null, "legacy boundary");
{
    const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
    const value = run("function f(a){return arguments;}f;", owner);
    if (value.type !== "normal" || value.value.kind !== "object" || value.value.object.callable === null) throw new Error("foreign function");
    const shell = new GuestObject(owner.functionPrototype, false, value.value.object.callable);
    caller.defineScriptGlobal("shell", { value: { kind: "object", object: shell } });
    caller.defineScriptGlobal("ownerPrototype", { value: { kind: "object", object: owner.objectPrototype } });
    const result = run("var a=shell(7);a[0]===7&&a.callee===shell&&Object.getPrototypeOf(a)===ownerPrototype;", caller);
    check(result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }), "actual callee identity and owning Realm");
    const strict = run("function g(){'use strict';return arguments;}g;", owner);
    if (strict.type !== "normal") throw new Error("strict foreign function");
    caller.defineScriptGlobal("strict", { value: strict.value });
    const thrown = run("strict().callee;", caller);
    check(thrown.type === "throw" && thrown.value.kind === "object" &&
        thrown.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "callee thrower Realm");
}
{
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "host-arguments", text: "function f(){return arguments;}" }, realm);
    if (prepared.kind !== "ready") throw new Error("host preparation");
    let ticks = 0;
    const context: OperationContext = { realm, call: (_f, _t, _a, _l): ValueCompletion => normal(),
        tick: (_l): ValueCompletion => { ticks++; return normal(); } };
    const value = prepared.record.materializeFunction(1, { kind: "global", record: realm.globalEnvironment }, null, context);
    if (value.type !== "normal" || value.value.kind !== "object" || value.value.object.callable?.kind !== "script-guest") throw new Error("host function");
    const environment = prepared.record.createFunctionEnvironment(value.value.object.callable, UNDEFINED, context);
    if (environment.type !== "normal") throw new Error("host environment");
    const before = ticks;
    let rejected = false;
    try { prepared.record.instantiateFunction(environment.environment, [], context); }
    catch (error) { rejected = error instanceof Error && error.message === "arguments initialization requires Script execution"; }
    check(rejected && ticks === before, "public setup cannot fabricate a callee");
}
console.log("Arguments passed");
