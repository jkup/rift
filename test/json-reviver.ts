import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(realm: Realm, text: string, maxSteps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "json-reviver", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare reviver: " + text);
    return evaluateScript(createScriptSession({maxSteps, maxCalls: 64}), prepared.record).completion;
}
const cases = [
    ["JSON.parse('2',function(k,v){return k+':'+v+':'+arguments.length})", ":2:2"],
    ["JSON.parse('2',function(k,v){return Object.keys(this).join(',')+':'+(this[k]===v)+':'+(Object.getPrototypeOf(this)===Object.prototype)})", ":true:true"],
    ["var log='';JSON.parse('{\"b\":[1,2],\"a\":3}',function(k,v){log+=k+',';return v});log", "0,1,b,a,,"],
    ["var log='';JSON.parse('{\"2\":2,\"1\":1,\"a\":0}',function(k,v){log+=k+',';return v});log", "1,2,a,,"],
    ["var a=JSON.parse('[1,2]',function(k,v){if(k==='0')return;return v});a.length+':'+(0 in a)+':'+a[1]", "2:false:2"],
    ["var a=JSON.parse('{\"a\":1,\"b\":2}',function(k,v){if(k==='a')return;return v});Object.keys(a).join(',')", "b"],
    ["typeof JSON.parse('null',function(){})", "undefined"],
    ["JSON.parse('[0]',function(k,v){if(k==='')return 9;return v})+''", "9"],
    ["var log='';var o=JSON.parse('{\"a\":1,\"b\":2}',function(k,v){log+=k+':'+v+',';if(k==='a'){this.b=7;this.c=8}return v});log.slice(0,8)+':'+o.c", "a:1,b:7,:8"],
    ["var log='';JSON.parse('[1,2,3]',function(k,v){if(k==='0')this.length=1;if(k!=='')log+=k+':'+v+',';return v});log", "0:1,1:undefined,2:undefined,"],
    ["var log='';JSON.parse('[1]',function(k,v){if(k==='0')this.push(2);log+=k+',';return v});log", "0,,"],
    ["var o=JSON.parse('{\"a\":1,\"b\":2}',function(k,v){if(k==='a')Object.freeze(this);return 7});o+''", "7"],
    ["var o=JSON.parse('{\"a\":1}',function(k,v){if(k==='a'){Object.freeze(this);return}return v});o.a+''", "1"],
    ["var o=JSON.parse('{\"a\":1}',function(k,v){if(k==='a'){Object.freeze(this);return 9}return v});o.a+''", "1"],
    ["var o=JSON.parse('{\"a\":1,\"b\":2}',function(k,v){if(k==='a'){delete this.b;Object.setPrototypeOf(this,{b:8})}return v});o.b+':'+Object.hasOwn(o,'b')", "8:true"],
    ["var log='';var o=JSON.parse('{\"a\":1,\"b\":2}',function(k,v){if(k==='a')Object.defineProperty(this,'b',{get(){log+='get';return 8},configurable:true});return v});log+':'+o.b+':'+Object.getOwnPropertyDescriptor(o,'b').writable", "get:8:true"],
    ["var o=JSON.parse('{\"__proto__\":1}',function(k,v){return k==='__proto__'?4:v});o.__proto__+':'+(Object.getPrototypeOf(o)===Object.prototype)", "4:true"],
    ["var log='';JSON.parse('{\"x\":1,\"x\":2}',function(k,v){if(k==='x')log+=v;return v});log", "2"],
    ["var marker={};try{JSON.parse('[1]',function(){throw marker})}catch(e){e===marker?'same':'wrong'}", "same"],
    ["var called=false;try{JSON.parse('[',function(){called=true})}catch(e){e.name+':'+called}", "SyntaxError:false"],
    ["JSON.parse('2',{get call(){throw 8}})+''", "2"],
    ["JSON.parse('1',function(k,v){return JSON.parse('2',function(k,w){return w+v})})+''", "3"],
    ["var log='';JSON.parse('{\"a\":0,\"b\":0}',function(k,v){if(k==='a')this.b={x:3};log+=k+',';return v});log", "a,x,b,,"],
    ["var marker={};try{JSON.parse('{\"a\":0,\"b\":0}',function(k,v){if(k==='a')Object.defineProperty(this,'b',{get(){throw marker}});return v})}catch(e){e===marker?'same':'wrong'}", "same"],
];
for (const [source, expected] of cases) {
    const result = run(fresh(), source);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, source);
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own property");
    return descriptor.value;
}
{
    const owner = fresh(), caller = fresh(), json = own(owner.globalObject, "JSON");
    if (json.kind !== "object") throw new Error("JSON object");
    caller.defineScriptGlobal("parse", {value: own(json.object, "parse")});
    caller.defineScriptGlobal("ownerPrototype", {value: {kind: "object", object: owner.objectPrototype}});
    const result = run(caller, "parse('1',function(k,v){return Object.getPrototypeOf(this)===ownerPrototype})");
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "borrowed root Realm");
}
{
    const realm = fresh();
    realm.defineScriptGlobal("deep", {value: {kind: "string", value: "[".repeat(5000)+"0"+"]".repeat(5000)}});
    const result = run(realm, "var count=0;JSON.parse(deep,function(k,v){count++;return v});count", 1000000);
    check(result.type === "normal" && result.value.kind === "number" && result.value.value === 5001, "iterative deep traversal");
}
for (const source of [
    "JSON.parse('{\"a\":0,\"b\":0}',function(k,v){if(k==='a')this.b=this;return v})",
    "JSON.parse('[0]',function(k,v){if(k==='0')while(true){};return v})",
]) {
    const result = run(fresh(), source, 1000);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "bounded reviver");
}
console.log("JSON reviver passed");
