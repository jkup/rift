import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import {
    auditBoundedScriptNumericAssignments,
    auditBoundedScriptNumericSeparators,
    parse,
} from "../src/parser.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "duplicate-parameter", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
for (const text of [
    "function f(a,a){return a}f(1,7)===7&&f(1)===undefined&&f()===undefined&&f.length===2",
    "var f=function(a,a){return a};f(1,7)===7",
    "function f(a,a){a=7;return arguments[0]===1&&arguments[1]===7}f(1,2)",
    "function f(a,a){arguments[0]=7;return a===2&&arguments[0]===7&&arguments[1]===2}f(1,2)",
    "function f(a,a){arguments[1]=7;return a===7&&arguments[0]===1}f(1,2)",
    "function f(a,a){a=7;return arguments[0]===1&&!(1 in arguments)}f(1)",
    "function f(a,a){arguments[0]=7;return a===undefined}f(1)",
    "function f(a,b,a,b){a=7;b=8;return arguments[0]===1&&arguments[1]===2&&arguments[2]===7&&arguments[3]===8}f(1,2,3,4)",
    "function f(a,a){Object.defineProperty(arguments,'1',{value:7,writable:false});a=8;return a===8&&arguments[1]===7}f(1,2)",
    "function f(a,a){delete arguments[1];a=7;arguments[1]=8;return a===7&&arguments[0]===1}f(1,2)",
    "function f(a,a){Object.defineProperty(arguments,'1',{get:function(){return 9}});a=7;return a===7&&arguments[1]===9}f(1,2)",
    "function f(a,a){var saved=arguments;return function(x){a=x;return saved[0]===1&&saved[1]===x}}f(1,2)(7)",
    "function f(a,a){var a;return a}f(1,7)===7",
    "function f(a,a){function a(){return 7}return arguments[1]===a&&a()===7}f(1,2)",
    "function f(arguments,arguments){return arguments}f(1,7)===7",
    "function f(a,a){eval('a=7');return arguments[1]===7}f(1,2)",
    "eval('function f(a,a){return a}f(1,7)')===7",
    "Function('a','a','return a')(1,7)===7",
    "var ok=false;try{eval('\"use strict\";function f(a,a){}')}catch(e){ok=e instanceof SyntaxError}ok",
    "var ok=false;try{eval('function f(a,a){\"use strict\"}function g(b,b){}')}catch(e){ok=e instanceof SyntaxError}ok",
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "'use strict';function f(a,a){}",
    "function f(a,a){'use strict'}",
    "var f=(a,a)=>a",
    "function f(a,a=1){}",
    "function f(a,...a){}",
    "var o={m(a,a){}}",
    "class C{m(a,a){}}",
    "function f(a,a){let a}",
]) {
    check(
        prepareBoundedScript(
            { id: "invalid-parameters", text },
            new Realm((_line: string) => {}, "script"),
        ).kind !== "ready",
        text,
    );
}
check(
    auditBoundedScriptNumericAssignments("1=2;function f(a,a){}").kind === "eligible",
    "supported sloppy function permits numeric audit",
);
check(
    auditBoundedScriptNumericSeparators("1_;function f(a,a){class C extends B{}}").kind ===
        "eligible",
    "default derived class permits numeric certification",
);
check(parse("function f(a,a){}").error !== null, "legacy boundary");
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
const foreign = run("function f(a,a){a=7;return arguments}f", 100000, owner);
if (foreign.type !== "normal") {
    throw new Error("foreign function setup");
}
caller.defineScriptGlobal("foreign", { value: foreign.value });
const mapped = run("foreign(1,2)", 100000, caller);
check(
    mapped.type === "normal" &&
        mapped.value.kind === "object" &&
        mapped.value.object.getPrototypeOf() === owner.objectPrototype,
    "arguments defining Realm",
);
const limited = run("function f(a,a){while(true){}}try{f(1,2)}catch(e){}", 100);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "fatal call budget");
console.log("Duplicate parameters passed");
