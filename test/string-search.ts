import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "string-search", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
function passes(text: string, realm = fresh()): void {
    const result = run(text, realm);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), text);
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own " + key);
    return descriptor.value;
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.globalObject.bootstrapDefine(name, {value, writable: true, enumerable: true, configurable: true});
}

for (const source of [
    "'abc'.includes('b')&&!'abc'.includes('b',2)&&'abc'.includes('b',1.9)&&'abc'.includes('a',-1)&&'abc'.includes('a',NaN)&&!'abc'.includes('a',Infinity);",
    "'abc'.startsWith('ab')&&! 'abc'.startsWith('b')&&'abc'.startsWith('b',1.9)&&'abc'.startsWith('a',-Infinity)&&!'abc'.startsWith('c',Infinity);",
    "'abc'.endsWith('bc')&&'abc'.endsWith('b',2.9)&&!'abc'.endsWith('b',1)&&'abc'.endsWith('c',Infinity)&&!'abc'.endsWith('a',-Infinity);",
    "'abc'.endsWith('c',undefined)&&!'abc'.endsWith('c',null)&&!'abc'.endsWith('c',NaN)&&'abc'.endsWith('',null);",
    "'undefined'.includes()&&'undefined'.startsWith()&&'undefined'.endsWith()&&!''.includes();",
]) passes(source);

for (const name of ["includes", "startsWith", "endsWith"]) {
    const f = "String.prototype." + name;
    passes("let d=Object.getOwnPropertyDescriptor(String.prototype,'"+name+"');d.value.name==='"+name+"'&&d.value.length===1&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    passes("''."+name+"('')&&'abc'."+name+"('',Infinity)&&'abc'."+name+"('',-Infinity);");
    passes(f+".call(123,'123')&&"+f+".call(true,'true')&&"+f+".call(Object('abc'),'abc');");
    passes("let trace='';let r={};r[Symbol.toPrimitive]=function(h){trace+='R'+h;return 'x';};let s={};Object.defineProperty(s,Symbol.match,{get:function(){trace+='M';return false;}});s[Symbol.toPrimitive]=function(h){trace+='S'+h;return 'x';};let p={};p[Symbol.toPrimitive]=function(h){trace+='P'+h;return "+(name === "endsWith" ? "1" : "0")+";};"+f+".call(r,s,p)&&trace==='RstringMSstringPnumber';");
    for (const matcher of ["true", "1", "'x'", "{}", "function(){throw 9;}"]) {
        passes("let s={toString:function(){throw 1;}};s[Symbol.match]="+matcher+";let p={valueOf:function(){throw 2;}};let caught=false;try{"+f+".call('x',s,p);}catch(e){caught=e instanceof TypeError;}caught;");
    }
    for (const matcher of ["false", "0", "''", "null", "undefined", "NaN"]) {
        passes("let s={toString:function(){return 'x';}};s[Symbol.match]="+matcher+";'x'."+name+"(s);");
    }
    passes("Object.defineProperty(String.prototype,Symbol.match,{get:function(){throw 1;}});'x'."+name+"('x');");
    passes("let p={};let s=Object.create(p);let seen=false;Object.defineProperty(p,Symbol.match,{get:function(){seen=this===s;return false;}});s.toString=function(){return 'x';};'x'."+name+"(s)&&seen;");
    passes("let seen=false;let s=Object('x');Object.defineProperty(String.prototype,Symbol.match,{get:function(){seen=this===s;return false;}});'x'."+name+"(s)&&seen;");
    for (const stage of ["receiver", "match", "search", "position"]) {
        const receiver = stage === "receiver" ? "{toString:function(){throw marker;}}" : "'x'";
        const match = stage === "match" ? "throw marker;" : "return false;";
        const search = stage === "search" ? "throw marker;" : "return 'x';";
        const position = stage === "position" ? "throw marker;" : "throw 99;";
        passes("let marker={};let s={toString:function(){"+search+"}};Object.defineProperty(s,Symbol.match,{get:function(){"+match+"}});let p={valueOf:function(){"+position+"}};let caught=false;try{"+f+".call("+receiver+",s,p);}catch(e){caught=e===marker;}caught;");
    }
    for (const expression of [f+".call(null,'x')", f+".call(undefined,'x')", f+".call(Symbol(),'x')", "'x'."+name+"(Symbol())", "'x'."+name+"('x',Symbol())", "new String.prototype."+name+"()"] ) {
        const result = run(expression + ";");
        check(result.type === "throw" && result.diagnostic.name === "TypeError", expression);
    }
    const bounded = run("let s={toString:function(){while(true){}}};'x'."+name+"(s);", fresh(), 150);
    check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "coercion budget " + name);
    const loop = run("while(true){'x'."+name+"('x');}", fresh(), 150);
    check(loop.type === "throw" && loop.origin.kind === "resource-limit", "call budget " + name);
    const owner = fresh(), caller = fresh();
    seed(caller, "foreign", own(owner.stringPrototype, name));
    const foreign = run("foreign.call(null,'x');", caller);
    check(foreign.type === "throw" && foreign.value.kind === "object" && foreign.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "error Realm " + name);
    check(new Realm((_line: string) => {}).stringPrototype.getOwnProperty(name) === undefined, "legacy search absent " + name);
}

const unicodeCases = [
    {s:"a\u0000b", q:"\u0000", start:1, end:2},
    {s:"\ud83d\ude00", q:"\ud83d", start:0, end:1},
    {s:"\ud83d\ude00", q:"\ude00", start:1, end:2},
    {s:"\ud83d\ude00", q:"\ud83d\ude00", start:0, end:2},
    {s:"\ud800A\udc00", q:"\ud800", start:0, end:1},
    {s:"\ud800A\udc00", q:"\udc00", start:2, end:3},
    {s:"e\u0301", q:"\u0301", start:1, end:2},
];
for (const c of unicodeCases) {
    const realm = fresh();
    seed(realm, "input", {kind:"string", value:c.s});
    seed(realm, "needle", {kind:"string", value:c.q});
    passes("input.includes(needle,"+c.start+")&&input.startsWith(needle,"+c.start+")&&input.endsWith(needle,"+c.end+")&&!input.includes(needle,"+(c.start+1)+")&&!input.endsWith(needle,"+(c.end-1)+");", realm);
}
console.log("String search predicates passed");
