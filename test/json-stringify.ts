import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { GuestObject, Value, ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function run(realm: Realm, text: string, maxSteps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "json-stringify", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare stringify: " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps, maxCalls: 64 }), prepared.record)
        .completion;
}
const cases = [
    ["JSON.stringify(null)", "null"],
    ["JSON.stringify(-0)", "0"],
    ["JSON.stringify([true,false,NaN,Infinity,-Infinity])", "[true,false,null,null,null]"],
    ["JSON.stringify([1,undefined,function(){},Symbol()])", "[1,null,null,null]"],
    ["JSON.stringify({a:undefined,b:function(){},c:Symbol(),d:1})", '{"d":1}'],
    [
        "var o={b:1,2:2,1:3,a:4};o[Symbol()]=5;Object.defineProperty(o,'hidden',{value:6});JSON.stringify(o)",
        '{"1":3,"2":2,"b":1,"a":4}',
    ],
    [
        "JSON.stringify([new Number(2),new String('x'),new Boolean(false),Object(Symbol())])",
        '[2,"x",false,{}]',
    ],
    ["var n=new Number(2);n.valueOf=function(){return 7};JSON.stringify(n)", "7"],
    ["var s=new String('x');s.toString=function(){return 'y'};JSON.stringify(s)", '"y"'],
    ["var b=new Boolean(true);b.valueOf=function(){throw 7};JSON.stringify(b)", "true"],
    [
        "var log='';var v={toJSON(k){log+='j'+k;return 3}};var s=JSON.stringify({a:v},function(k,v){log+='r'+k;return v});s+':'+log",
        '{"a":3}:rjara',
    ],
    ["var o={a:1,toJSON(k){return k+':'+(this===o)}};JSON.stringify(o)", '":true"'],
    ["JSON.stringify(1,function(k,v){return {toJSON(){throw 7},x:2}})", "BUDGET"],
    [
        "var first=true;JSON.stringify(1,function(k,v){if(first){first=false;return {toJSON(){throw 7},x:2}}return v})",
        '{"x":2}',
    ],
    [
        "JSON.stringify({a:1,b:2,c:3},['b','a','b',new String('c'),true,{},null])",
        '{"b":2,"a":1,"c":3}',
    ],
    [
        "var o=Object.create({a:1});Object.defineProperty(o,'b',{value:2});JSON.stringify(o,['a','b'])",
        '{"a":1,"b":2}',
    ],
    ["JSON.stringify([1,2],['1'])", "[1,2]"],
    ["JSON.stringify({a:1},[])", "{}"],
    ["JSON.stringify({a:[1,{}]},null,2)", '{\n  "a": [\n    1,\n    {}\n  ]\n}'],
    ["JSON.stringify({a:1},null,2.9)", '{\n  "a": 1\n}'],
    ["JSON.stringify({a:1},null,Infinity)", '{\n          "a": 1\n}'],
    ["JSON.stringify([1],null,'abcdefghijk')", "[\nabcdefghij1\n]"],
    ["JSON.stringify([1],null,{toString(){throw 8},valueOf(){throw 9}})", "[1]"],
    [
        "var log='';var k=new Number(1);k.toString=function(){log+='key';return 'a'};var s=new Number(2);s.valueOf=function(){log+='space';return 1};var out=JSON.stringify({a:3},[k],s);log+':'+out",
        'keyspace:{\n "a": 3\n}',
    ],
    [
        "var a=[1,2,3];JSON.stringify(a,function(k,v){if(k==='0')a.length=1;return v})",
        "[1,null,null]",
    ],
    ["var a=[1];JSON.stringify(a,function(k,v){if(k==='0')a.push(2);return v})", "[1]"],
    [
        "var o={a:1,b:2};JSON.stringify(o,function(k,v){if(k==='a'){delete o.b;o.c=3}return v})",
        '{"a":1}',
    ],
    [
        "var o={a:1,b:2};JSON.stringify(o,function(k,v){if(k==='a')Object.defineProperty(o,'b',{get(){return 8}});return v})",
        '{"a":1,"b":8}',
    ],
    ["var v={x:1};JSON.stringify([v,v])", '[{"x":1},{"x":1}]'],
    ["var o={};o.a=o;try{JSON.stringify(o)}catch(e){e.name}", "TypeError"],
    ["var a=[];a[0]=a;try{JSON.stringify(a)}catch(e){e.name}", "TypeError"],
    ["var a=[];a[0]=a;a.toJSON=function(){return 3};JSON.stringify(a)", "3"],
    ["var f=function(){};f.toJSON=function(){return 3};JSON.stringify(f)", "3"],
    [
        "var marker={};try{JSON.stringify({get toJSON(){throw marker}})}catch(e){e===marker?'same':'wrong'}",
        "same",
    ],
    [
        "var marker={};try{JSON.stringify(1,function(){throw marker})}catch(e){e===marker?'same':'wrong'}",
        "same",
    ],
    ["var s=Symbol();JSON.stringify({a:1},function(k,v){return k==='a'?s:v})", "{}"],
    [
        "var d=Object.getOwnPropertyDescriptor(JSON,'stringify'),r='';try{new JSON.stringify()}catch(e){r=e.name}d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r",
        "stringify:3:true:false:true:TypeError",
    ],
];
for (const [source, expected] of cases) {
    const result = run(fresh(), source, expected === "BUDGET" ? 1000 : 100000);
    if (expected === "BUDGET") {
        check(result.type === "throw" && result.origin.kind === "resource-limit", source);
    } else {
        check(
            result.type === "normal" &&
                result.value.kind === "string" &&
                result.value.value === expected,
            source,
        );
    }
}
for (const source of [
    "JSON.stringify()",
    "JSON.stringify(Symbol())",
    "JSON.stringify(function(){})",
    "JSON.stringify(1,function(){})",
]) {
    const result = run(fresh(), source);
    check(result.type === "normal" && result.value.kind === "undefined", source);
}
for (const [text, expected] of [
    ['"\\\b\t\n\f\r\0', '"\\"\\\\\\b\\t\\n\\f\\r\\u0000"'],
    ["\ud800", '"\\ud800"'],
    ["\udc00", '"\\udc00"'],
    ["\ud800x\udc00", '"\\ud800x\\udc00"'],
    ["\ud83d\ude00", '"\ud83d\ude00"'],
    ["\u2028\u2029", '"\u2028\u2029"'],
    ["abc", '"abc"'],
]) {
    const realm = fresh();
    realm.defineScriptGlobal("input", { value: { kind: "string", value: text } });
    const result = run(realm, "JSON.stringify(input)");
    check(JSON.stringify(text) === expected, "host quote control");
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        "UTF-16 quote literals",
    );
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own property");
    }
    return descriptor.value;
}
{
    const owner = fresh(),
        caller = fresh(),
        json = own(owner.globalObject, "JSON");
    if (json.kind !== "object") {
        throw new Error("JSON object");
    }
    caller.defineScriptGlobal("stringify", { value: own(json.object, "stringify") });
    caller.defineScriptGlobal("ownerPrototype", {
        value: { kind: "object", object: owner.objectPrototype },
    });
    const result = run(
        caller,
        "stringify(1,function(k,v){return Object.getPrototypeOf(this)===ownerPrototype})",
    );
    check(
        result.type === "normal" && result.value.kind === "string" && result.value.value === "true",
        "borrowed root Realm",
    );
}
{
    const result = run(
        fresh(),
        "var a=0;for(var i=0;i<5000;i++)a=[a];JSON.stringify(a).length",
        1000000,
    );
    check(
        result.type === "normal" && result.value.kind === "number" && result.value.value === 10001,
        "iterative deep serialization",
    );
}
{
    const realm = fresh();
    realm.defineScriptGlobal("input", { value: { kind: "string", value: "\0".repeat(10000) } });
    const result = run(realm, "try{JSON.stringify(input)}catch(e){'caught'}", 1000);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded output expansion",
    );
}
console.log("JSON stringify passed");
