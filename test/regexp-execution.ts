import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "regexp-execution", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "var r=RegExp('(a)?b'),m=r.exec('xb');m[0]+':'+m[1]+':'+m.index+':'+m.input+':'+m.length+':'+m.groups+':'+m.hasOwnProperty('1')+':'+m.hasOwnProperty('groups')", expected: "b:undefined:1:xb:2:undefined:true:true" },
    { source: "var r=RegExp('a','g');r.exec('ba');var n=r.lastIndex;String(r.exec('ba')===null)+':'+n+':'+r.lastIndex", expected: "true:2:0" },
    { source: "var r=RegExp('a','y');var a=r.exec('ba');r.lastIndex=1;var b=r.exec('ba');String(a===null)+':'+b.index+':'+r.lastIndex", expected: "true:1:2" },
    { source: "var r=RegExp('a','gy');r.lastIndex=1;String(r.test('ba'))+':'+r.lastIndex+':'+r.test('ba')+':'+r.lastIndex", expected: "true:2:false:0" },
    { source: "var r=RegExp('a');r.lastIndex=99;String(r.test('a'))+':'+r.lastIndex+':'+r.test('b')+':'+r.lastIndex", expected: "true:99:false:99" },
    { source: "var r=RegExp('a'),calls=0;r.lastIndex={valueOf(){calls++;return 9}};r.test('a');String(calls)+':'+(typeof r.lastIndex)", expected: "1:object" },
    { source: "var r=RegExp('','g');r.lastIndex=1;var a=r.exec('a'),b=r.exec('a');a.index+':'+b.index+':'+r.lastIndex", expected: "1:1:1" },
    { source: "var r=RegExp('a','g');r.lastIndex=-4;String(r.test('a'))+':'+r.lastIndex", expected: "true:1" },
    { source: "var r=RegExp('a','g');r.lastIndex=Infinity;String(r.exec('a')===null)+':'+r.lastIndex", expected: "true:0" },
    { source: "var r=RegExp('a','y');r.lastIndex='1.9';String(r.test('ba'))+':'+r.lastIndex", expected: "true:2" },
    { source: "var r=RegExp('a','g');Object.defineProperty(r,'global',{get(){throw 7}});String(r.test('a'))+':'+r.lastIndex", expected: "true:1" },
    { source: "var r=RegExp('a');r.exec=3;String(r.test('a'))", expected: "true" },
    { source: "var order='',o={get exec(){order+='e';return function(s){order+=(this===o)+':'+s+':'+arguments.length;return {}}}};String(RegExp.prototype.test.call(o,{toString(){order+='s';return 'abc'}}))+':'+order", expected: "true:setrue:abc:1" },
    { source: "String(RegExp.prototype.test.call({exec(){return null}},'a'))", expected: "false" },
    { source: "var order='',r=RegExp('a');r.lastIndex={valueOf(){order+='l';return 0}};r.exec({toString(){order+='s';return 'a'}});order", expected: "sl" },
    { source: "var order='';try{RegExp.prototype.exec.call({}, {toString(){order+='wrong'}})}catch(e){order+=e instanceof TypeError}order", expected: "true" },
    { source: "var order='';try{RegExp.prototype.test.call(null,{toString(){order+='wrong'}})}catch(e){order+=e instanceof TypeError}order", expected: "true" },
    { source: "var order='';try{RegExp.prototype.test.call({}, {toString(){order+='s';throw 7}})}catch(e){order+=e}order", expected: "s7" },
    { source: "var r=RegExp('a');Object.defineProperty(r,'lastIndex',{writable:false});String(r.test('a'))+':'+r.lastIndex", expected: "true:0" },
    { source: "var m=RegExp('(a)?b','d').exec('xb');m.indices[0].join(',')+':'+m.indices[1]+':'+m.indices.hasOwnProperty('1')+':'+m.indices.groups+':'+m.indices.hasOwnProperty('groups')", expected: "1,2:undefined:true:undefined:true" },
    { source: "var m=RegExp('(a)(b)','d').exec('xab');m.indices[0].join(',')+':'+m.indices[1].join(',')+':'+m.indices[2].join(',')+':'+Object.keys(m).join(',')", expected: "1,3:1,2:2,3:0,1,2,index,input,groups,indices" },
    { source: "var m=RegExp('a').exec('a');String(m.hasOwnProperty('indices'))+':'+Object.keys(m).join(',')", expected: "false:0,index,input,groups" },
    { source: "var m=RegExp('(a(b)?)+').exec('aba');m[0]+':'+m[1]+':'+m[2]", expected: "aba:a:undefined" },
    { source: "var r=RegExp('.','dg');var a=r.exec('😀'),b=r.exec('😀');a[0].charCodeAt(0)+':'+b[0].charCodeAt(0)+':'+a.indices[0].join(',')+':'+b.indices[0].join(',')", expected: "55357:56832:0,1:1,2" },
    { source: "var r=RegExp('undefined');String(r.test())+':'+r.exec()[0]", expected: "true:undefined" },
    { source: "RegExp.prototype.exec.name+':'+RegExp.prototype.exec.length+':'+RegExp.prototype.test.name+':'+RegExp.prototype.test.length+':'+Object.getOwnPropertyDescriptor(RegExp.prototype,'exec').enumerable", expected: "exec:1:test:1:false" },
    { source: "var r=RegExp('a'),m=r.exec('a'),n=r.exec('a');String(m!==n)+':'+(Object.getPrototypeOf(m)===Array.prototype)", expected: "true:true" },
];
for (const test of cases) string(test.source, test.expected);
for (const source of ["RegExp.prototype.exec.call(RegExp.prototype,'a')", "RegExp.prototype.test.call({},'a')", "RegExp('a').exec(Symbol())",
    "RegExp.prototype.test.call({exec(){return 1}},'a')", "RegExp.prototype.test.call({exec(){return undefined}},'a')",
    "new RegExp.prototype.exec()", "new RegExp.prototype.test()", "var r=RegExp('a');r.lastIndex=Symbol();r.exec('a')"]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
for (const input of ["a", "b"]) string("var r=RegExp('a','g');Object.defineProperty(r,'lastIndex',{writable:false});try{r.exec('" + input + "');'wrong'}catch(e){String(e instanceof TypeError)}", "true");
for (const source of ["var r=RegExp('a');r.lastIndex={valueOf(){throw 7}};r.exec('a')", "RegExp.prototype.test.call({get exec(){throw 7}},'a')", "RegExp.prototype.test.call({exec(){throw 7}},'a')"]) {
    string("try{" + source + ";'wrong'}catch(e){String(e)}", "7");
}
{
    const realm = fresh(), foreign = fresh(), descriptor = foreign.globalObject.getOwnProperty("RegExp");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("foreign constructor");
    realm.defineScriptGlobal("ForeignRegExp", { value: descriptor.value });
    realm.defineScriptGlobal("foreignArrayPrototype", { value: { kind: "object", object: foreign.arrayPrototype } });
    string("var r=RegExp('(a)','d'),m=ForeignRegExp.prototype.exec.call(r,'a');String(Object.getPrototypeOf(m)===foreignArrayPrototype)+':'+(Object.getPrototypeOf(m.indices)===foreignArrayPrototype)+':'+(Object.getPrototypeOf(m.indices[0])===foreignArrayPrototype)", "true:true:true", realm);
    string("var r=ForeignRegExp('a'),m=RegExp.prototype.exec.call(r,'a');String(Object.getPrototypeOf(m)===Array.prototype)", "true", realm);
}
{
    const realm = fresh();
    string("var r=RegExp('(a+)+b','g');r.lastIndex=1;'ready'", "ready", realm);
    const prepared = prepareBoundedScript({ id: "regexp-budget", text: "try{r.exec('" + "a".repeat(40) + "')}catch(e){'caught'}" }, realm);
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 1000, maxCalls: 32 }), prepared.record).completion;
    check(result.type === "throw" && result.origin.kind === "resource-limit", "backtracking exhausts explicit budget");
    string("String(r.lastIndex)", "1", realm);
}
console.log("RegExp execution passed");
