import { Realm } from "../src/realm.js";
import { sameValue, type ThrowCompletion, type ValueCompletion } from "../src/runtime.js";
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
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "locale-string", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string, realm = fresh()): void {
    const result = run(text, realm);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
for (const source of [
    "[1,2,3].toLocaleString()==='1,2,3'&&[].toLocaleString()==='';",
    "[1,null,undefined,,3].toLocaleString()==='1,,,,3';",
    "['a',true,false,[2,3]].toLocaleString()==='a,true,false,2,3';",
    "Array.prototype.toLocaleString.call({0:'x',2:7,length:3})==='x,,7';",
    "Array.prototype.toLocaleString.call('abc')==='a,b,c';",
    "var p={1:{toLocaleString(){return 'inherited';}}};var a=Object.create(p);a.length=3;Array.prototype.toLocaleString.call(a)===',inherited,';",
    "var a=[{toLocaleString(){a[1]='changed';a.push('extra');return 'first';}},'old'];a.toLocaleString()==='first,changed';",
    "var log='';var a={get length(){log+='L';return {valueOf(){log+='V';return 1;}};},get 0(){log+='E';return {get toLocaleString(){log+='M';return function(){log+='C';return {toString(){log+='S';return 'x';}};};}};}};Array.prototype.toLocaleString.call(a)==='x'&&log==='LVEMCS';",
    "var args=-1;var item={toLocaleString(){args=arguments.length;return 7;}};[item].toLocaleString('en',{x:1})==='7'&&args===0;",
    "var marker={};var o={toString(){return marker;}};o.toLocaleString()===marker;",
    "var o={toString(){return this===o&&arguments.length===0;}};o.toLocaleString(1,2);",
    "var method=Object.prototype.toLocaleString;var seen;Object.defineProperty(Number.prototype,'toString',{get:function(){'use strict';seen=this;return function(){'use strict';return this;};}});method.call(3)===3&&seen===3;",
    "var method=Object.prototype.toLocaleString;var seen;Object.defineProperty(String.prototype,'toString',{get:function(){'use strict';seen=this;return function(){'use strict';return this;};}});method.call('x')==='x'&&seen==='x';",
    "({}).toLocaleString()==='[object Object]'&&(true).toLocaleString()==='true'&&Symbol('s').toLocaleString()==='Symbol(s)';",
    "(1234.5).toLocaleString()==='1234.5'&&(-0).toLocaleString()==='0'&&(NaN).toLocaleString()==='NaN'&&(Infinity).toLocaleString()==='Infinity';",
    "Number.prototype.toLocaleString()==='0'&&new Number(7).toLocaleString()==='7';",
    "var poison={toString(){throw 1;},valueOf(){throw 2;}};(42).toLocaleString(poison,poison)==='42';",
    "Number.prototype.toString=function(){throw 1;};(7).toLocaleString()==='7';",
    "var d=Object.getOwnPropertyDescriptor(Array.prototype,'toLocaleString');d.writable&&!d.enumerable&&d.configurable&&d.value.length===0&&d.value.name==='toLocaleString';",
    "Object.prototype.toLocaleString.length===0&&Number.prototype.toLocaleString.length===0&&Number.prototype.toLocaleString!==Number.prototype.toString;",
    "var e={};var caught=false;try{[{toLocaleString(){throw e;}}].toLocaleString();}catch(q){caught=q===e;}caught;",
    "var e={};var caught=false;try{[{toLocaleString(){return {toString(){throw e;}};}}].toLocaleString();}catch(q){caught=q===e;}caught;",
]) {
    passes(source);
}

for (const source of [
    "Object.prototype.toLocaleString.call(null);",
    "Object.prototype.toLocaleString.call(undefined);",
    "Array.prototype.toLocaleString.call(null);",
    "Array.prototype.toLocaleString.call(undefined);",
    "Object.prototype.toLocaleString.call({toString:null});",
    "[{toLocaleString:3}].toLocaleString();",
    "[{toLocaleString(){return Symbol();}}].toLocaleString();",
    "Number.prototype.toLocaleString.call({valueOf(){return 7;}});",
    "Number.prototype.toLocaleString.call('7');",
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
{
    const realm = fresh(),
        other = fresh();
    const method = run("Array.prototype.toLocaleString;", realm);
    if (method.type !== "normal") {
        throw new Error("foreign method setup");
    }
    other.defineScriptGlobal("format", { value: method.value });
    run(
        "Number.prototype.toLocaleString=function(){'use strict';return this===3?'home':'bad';};",
        realm,
    );
    passes(
        "Number.prototype.toLocaleString=function(){return 'other';};format.call([3])==='home';",
        other,
    );
    const constructor = run("TypeError;", realm);
    if (constructor.type !== "normal") {
        throw new Error("foreign constructor setup");
    }
    other.defineScriptGlobal("HomeError", { value: constructor.value });
    passes(
        "var caught=false;try{format.call(null);}catch(e){caught=e.constructor===HomeError;}caught;",
        other,
    );
}
{
    const realm = fresh();
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
    const fail = realm.createBuiltin(
        "fail",
        0,
        (_receiver, _args, _context, _loc): ValueCompletion => sentinel,
    );
    realm.defineScriptGlobal("fail", { value: { kind: "object", object: fail } });
    check(
        run("[{toLocaleString:fail}].toLocaleString();", realm) === sentinel,
        "exact abrupt completion",
    );
}
const bounded = run(
    "try{Array.prototype.toLocaleString.call({length:1000000});}catch(e){1;}",
    fresh(),
    50,
);
check(
    bounded.type === "throw" && bounded.origin.kind === "resource-limit",
    "large array-like traversal stays bounded",
);
console.log("Locale string conversions passed");
