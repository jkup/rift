import { Realm } from "../src/realm.js";
import {
    sameValue,
    type Value,
    type ValueCompletion,
    type ThrowCompletion,
} from "../src/runtime.js";
import { parse } from "../src/parser.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(text: string, steps = 50000, realm = fresh()): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "optional-chain", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function expect(text: string, expected: Value): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, expected), text);
}
for (const source of [
    "null?.foo === undefined && undefined?.[0] === undefined && null?.() === undefined;",
    "null?.foo.bar().baz === undefined;",
    "var n=0;null?.[n++](n++).x;undefined?.(n++);n===0;",
    "var n=0;var o={};o.m?.(n++);o.m?.[n++];n===0;",
    "var n=0;var o={get m(){n++;return null;}};o.m?.(n++);n===1;",
    "var n=0;function root(){n++;return {x:{y:7}};}root()?.x.y===7&&n===1;",
    "var o={x:7,m(){return this.x;}};o?.m()===7&&o.m?.()===7&&o?.m?.()===7;",
    "var o={x:7,m(){return this.x;}};(o?.m)()===7&&(o?.m)?.()===7;",
    "var o={m(){return this;}};(true?o?.m:o.m)()===this&&(0,o?.m)()===this;",
    "var o={m(){'use strict';return this;}};(0,o?.m)?.()===undefined;",
    "'use strict';String.prototype.m=function(){return this;};'x'?.m() === 'x' && 'x'.m?.() === 'x';",
    "var o={m(){return {n:8};}};o?.m().n===8&&o.m?.().n===8;",
    "var caught=false;try{({x:null})?.x.y;}catch(e){caught=e instanceof TypeError;}caught;",
    "var caught=false;try{(null?.x).y;}catch(e){caught=e instanceof TypeError;}caught;",
    "var n=0;try{(null?.x)(n++);}catch(e){n+=e instanceof TypeError?10:100;}n===11;",
    "var n=0;try{({m:1}).m?.(n++);}catch(e){n+=e instanceof TypeError?10:100;}n===11;",
    "var n=0;try{null?.x;}catch(e){n++;}try{missing?.x;}catch(e){n+=e instanceof ReferenceError?10:100;}n===10;",
    "var ok=false;try{typeof missing?.x;}catch(e){ok=e instanceof ReferenceError;}ok;",
    "var ok=false;try{x?.m;let x;}catch(e){ok=e instanceof ReferenceError;}ok;",
    "var o={x:1};delete o?.x && !('x' in o) && delete null?.x && delete null?.[missing];",
    "var n=0;var o={get x(){n++;return 1;}};delete o?.x && n===0;",
    "var o={};Object.defineProperty(o,'x',{value:1});delete o?.x===false;",
    "'use strict';var o={};Object.defineProperty(o,'x',{value:1});var caught=false;try{delete o?.x;}catch(e){caught=e instanceof TypeError;}caught;",
    "var n=0;function f(){n++;return 3;}delete f?.() && n===1;",
    "var log='';var key={toString(){log+='K';return 'm';}};var o={get m(){log+='G';return function(x){log+='C';return this===o&&x===7;};}};function arg(){log+='A';return 7;}o?.[key]?.(arg())&&log==='KGAC';",
    "var e={},caught=false;var o={get x(){throw e;}};try{o?.x.y;}catch(q){caught=q===e;}caught;",
    "var e={},caught=false;try{({m(){throw e;}}).m?.();}catch(q){caught=q===e;}caught;",
    "var o={m(a,b){return this===o&&a===1&&b===2;}};o?.m(...[1,2]);",
    "function f(){return arguments?.[0];}f(7)===7;",
    "var o={m(f){return f(7)===7;}};o?.m(function(){return arguments[0];});",
    "var f=()=>({x:8})?.x;f()===8;",
    "function f(x=({x:7})?.x){return x;}f()===7;",
    "function f(){return null?.x;}f.toString()==='function f(){return null?.x;}';",
    "Function('return null?.x;')()===undefined;",
    "var o={C:function(){this.x=7;}};new (o?.C)().x===7;",
    "var o={x:null};(o?.x)?.y===undefined;",
    "var seen;Object.defineProperty(Number.prototype,'m',{get:function(){'use strict';seen=this;return function(){'use strict';return this;};}});(3)?.m?.()===3&&seen===3;",
    "var n=0;var it={};it[Symbol.iterator]=function(){n++;throw 1;};null?.(...it);n===0;",
    "var o={x:{y:1}};(o?.x).y=7;(o?.x).y++===7&&o.x.y===8;",
    "var n=0;delete (null?.x)?.[n++];n===0;",
    "var e={},caught=false;var key={toString(){throw e;}};try{delete ({})?.[key];}catch(q){caught=q===e;}caught;",
    "true?.3:0;",
]) {
    expect(
        source,
        source === "true?.3:0;" ? { kind: "number", value: 0.3 } : { kind: "boolean", value: true },
    );
}

const realm = new Realm((_line: string) => {}, "script");
for (const text of [
    "var o={};o?.x=1;",
    "var o={};o?.x++;",
    "var o={};++o?.x;",
    "var o={};o?.x.y+=1;",
    "var o={};(o?.x)=1;",
    "new Object?.();",
    "new Object?.x();",
    "null?.;",
    "null?.1;",
    "null?.`x`;",
    "null?.x`x`;",
    "super?.x;",
]) {
    check(prepareBoundedScript({ id: "invalid-optional", text }, realm).kind === "blocked", text);
}
check(parse("null?.x;").error !== null, "legacy optional grammar remains excluded");
const bounded = run("var o={};o.x=o;" + "o" + "?.x".repeat(200) + ";", 50);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "chain steps bounded");
{
    const home = fresh(),
        other = fresh();
    const fn = run(
        "String.prototype.m=function(){return 7;};function f(){return 'x'?.m?.();}f;",
        5000,
        home,
    );
    if (fn.type !== "normal") {
        throw new Error("foreign chain setup");
    }
    other.defineScriptGlobal("f", { value: fn.value });
    const result = run("String.prototype.m=function(){return 8;};f();", 5000, other);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "number", value: 7 }),
        "chain uses defining Realm",
    );
}
{
    const r = fresh();
    const sentinel: ThrowCompletion = {
        type: "throw",
        origin: { kind: "guest" },
        value: { kind: "number", value: 7 },
        diagnostic: {
            phase: "runtime",
            name: "Sentinel",
            message: "identity",
            loc: { line: 9, column: 4 },
        },
    };
    const fail = r.createBuiltin(
        "fail",
        0,
        (_receiver, _args, _context, _loc): ValueCompletion => sentinel,
    );
    r.defineScriptGlobal("fail", { value: { kind: "object", object: fail } });
    check(run("fail?.();", 5000, r) === sentinel, "exact call abrupt completion");
    check(run("fail()?.x;", 5000, r) === sentinel, "abrupt base propagates before chain links");
    check(
        run("({get x(){return fail();}})?.x;", 5000, r) === sentinel,
        "exact getter abrupt completion",
    );
    const fault = new Error("optional host fault");
    const host = r.createBuiltin("host", 0, (_receiver, _args, _context, _loc): ValueCompletion => {
        throw fault;
    });
    r.defineScriptGlobal("host", { value: { kind: "object", object: host } });
    let escaped = false;
    try {
        run("try{host?.();}catch(e){1;}", 5000, r);
    } catch (e) {
        escaped = e instanceof Error && e === fault;
    }
    check(escaped, "host faults bypass guest catch");
}
const fatal = run("try{var o={};o.x=o;" + "o" + "?.x".repeat(200) + ";}catch(e){1;}", 50);
check(
    fatal.type === "throw" && fatal.origin.kind === "resource-limit",
    "chain resource failures bypass guest catch",
);
console.log("Optional chaining passed");
