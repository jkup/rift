import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const setup = "function species(C){var o={};o[Symbol.species]=C;return o}";
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "regexp-split", text: setup + text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === expected, text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "'a1b2c'.split(RegExp('[0-9]')).join(',')", expected: "a,b,c" },
    { source: "'a1b2c'.split(RegExp('([0-9])')).join(',')", expected: "a,1,b,2,c" },
    { source: "'a1b2c'.split(RegExp('([0-9])'),3).join(',')", expected: "a,1,b" },
    { source: "'a1b2c'.split(RegExp('([0-9])'),2).join(',')", expected: "a,1" },
    { source: "var a='a-b'.split(RegExp('(-)|(x)'));a.length+':'+a[0]+':'+a[1]+':'+a[2]+':'+a.hasOwnProperty('2')+':'+a[3]", expected: "4:a:-:undefined:true:b" },
    { source: "'a-b-'.split(RegExp('-')).join(',')", expected: "a,b," },
    { source: "'-a-b'.split(RegExp('-')).join(',')", expected: ",a,b" },
    { source: "'abc'.split(RegExp('')).join(',')", expected: "a,b,c" },
    { source: "'ab'.split(RegExp('a*?')).join(',')", expected: "a,b" },
    { source: "'ab'.split(RegExp('a*')).join(',')", expected: ",b" },
    { source: "String(''.split(RegExp('')).length)+':'+(''.split(RegExp('a')).length)+':'+(''.split(RegExp('a'))[0])", expected: "0:1:" },
    { source: "String('abc'.split(RegExp('a'),0).length)+':'+('abc'.split(RegExp('a'),Infinity).length)", expected: "0:0" },
    { source: "'a-b-c'.split(RegExp('-'),4294967297).join(',')", expected: "a" },
    { source: "var r=RegExp('-','g'),token={valueOf(){throw 7}};r.lastIndex=token;'a-b'.split(r).join(',')+':'+(r.lastIndex===token)", expected: "a,b:true" },
    { source: "var r=RegExp('-');Object.defineProperty(r,'lastIndex',{writable:false});'a-b'.split(r).join(',')", expected: "a,b" },
    { source: "var flags='',r=RegExp('-');r.constructor=species(function(p,f){flags=f;return RegExp(p,f)});'a-b'.split(r).join(',')+':'+flags", expected: "a,b:y" },
    { source: "var flags='',r=RegExp('-','gy');r.constructor=species(function(p,f){flags=f;return RegExp(p,f)});'a-b'.split(r).join(',')+':'+flags", expected: "a,b:gy" },
    { source: "class R extends RegExp{constructor(p,f){super(p,f);this.extra=1}}var r=new R('-');'a-b'.split(r).join(',')", expected: "a,b" },
    { source: "var r=RegExp('-');r.constructor=species(null);RegExp=function(){throw 7};'a-b'.split(r).join(',')", expected: "a,b" },
    { source: "var order='',c={};Object.defineProperty(c,Symbol.species,{get(){order+='p';return function(rx,flags){order+='n'+(rx===r)+flags;return {exec(){throw 7}}}}});var r={get constructor(){order+='c';return c},get flags(){order+='f';return {toString(){order+='t';return 'g'}}}};var a=RegExp.prototype[Symbol.split].call(r,{toString(){order+='s';return 'a'}},{valueOf(){order+='l';return 0}});order+':'+a.length", expected: "scpftntruegyl:0" },
    { source: "var order='',splitter={exec(s){order+='e'+s;return null}},r={flags:'',constructor:species(function(){order+='n';return splitter})};RegExp.prototype[Symbol.split].call(r,'',{valueOf(){order+='l';return 3}}).length+':'+order", expected: "1:nle" },
    { source: "var marker={},splitter={exec(){this.lastIndex=1;return {length:2,1:marker}}},r={flags:'',constructor:species(function(){return splitter})};var a=RegExp.prototype[Symbol.split].call(r,'a');a.length+':'+(a[1]===marker)+':'+a[2]", expected: "3:true:" },
    { source: "var splitter={exec(){this.lastIndex=1;return {get length(){throw 7}}}},r={flags:'',constructor:species(function(){return splitter})};String(RegExp.prototype[Symbol.split].call(r,'a',1).length)", expected: "1" },
    { source: "var order='',splitter={exec(){this.lastIndex=1;return {length:3,get 1(){order+='1';return 'x'},get 2(){order+='wrong'}}}},r={flags:'',constructor:species(function(){return splitter})};RegExp.prototype[Symbol.split].call(r,'a',2).join(',')+':'+order", expected: ",x:1" },
    { source: "var r=RegExp('-');Object.defineProperty(r,'global',{get(){throw 7}});Object.defineProperty(r,'sticky',{get(){throw 8}});Object.defineProperty(r,'flags',{value:''});'a-b'.split(r).join(',')", expected: "a,b" },
    { source: "RegExp.prototype[Symbol.split].name+':'+RegExp.prototype[Symbol.split].length+':'+Object.getOwnPropertyDescriptor(RegExp.prototype,Symbol.split).enumerable", expected: "[Symbol.split]:2:false" },
    { source: "var a='😀'.split(RegExp(''));a.length+':'+a[0].charCodeAt(0)+':'+a[1].charCodeAt(0)", expected: "2:55357:56832" },
];
for (const test of cases) string(test.source, test.expected);
for (const flags of ["gu", "gv"]) {
    string("var seen='',splitter={exec(){seen+=this.lastIndex+',';return null}},r={flags:'" + flags + "',constructor:species(function(){return splitter})};RegExp.prototype[Symbol.split].call(r,'😀x').join(',')+':'+seen", "😀x:0,2,");
}
for (const source of ["RegExp.prototype[Symbol.split].call(1,'a')", "var r=RegExp('-');r.constructor=null;'a-b'.split(r)",
    "var r=RegExp('-');r.constructor=species(()=>{});'a-b'.split(r)", "'a-b'.split(RegExp('-'),Symbol())",
    "var splitter={exec(){return null}};Object.defineProperty(splitter,'lastIndex',{value:0});RegExp.prototype[Symbol.split].call({flags:'',constructor:species(function(){return splitter})},'a')"]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
string("var order='',r={get constructor(){order+='c';throw 7},get flags(){order+='wrong'}};try{RegExp.prototype[Symbol.split].call(r,{toString(){order+='s';return 'a'}})}catch(e){order+=e}order", "sc7");
string("var order='',r={constructor:species(function(){order+='n';throw 7}),get flags(){order+='f';return ''}};try{RegExp.prototype[Symbol.split].call(r,'a',{valueOf(){order+='wrong'}})}catch(e){order+=e}order", "fn7");
{
    const realm = fresh(), foreign = fresh(), descriptor = foreign.globalObject.getOwnProperty("RegExp");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("foreign constructor");
    realm.defineScriptGlobal("ForeignRegExp", { value: descriptor.value });
    realm.defineScriptGlobal("foreignArrayPrototype", { value: { kind: "object", object: foreign.arrayPrototype } });
    string("var r=RegExp('-'),a=ForeignRegExp.prototype[Symbol.split].call(r,'a-b');a.join(',')+':'+(Object.getPrototypeOf(a)===foreignArrayPrototype)", "a,b:true", realm);
    string("var seen=false,r=RegExp('-');r.constructor=undefined;var exec=ForeignRegExp.prototype.exec;ForeignRegExp.prototype.exec=function(s){seen=Object.getPrototypeOf(this)===ForeignRegExp.prototype;return exec.call(this,s)};ForeignRegExp.prototype[Symbol.split].call(r,'a-b');String(seen)", "true", realm);
}
{
    const realm = fresh(), prepared = prepareBoundedScript({ id: "regexp-split-budget", text: setup + "var splitter={exec(){this.lastIndex=1;return {length:Infinity}}},r={flags:'',constructor:species(function(){return splitter})};try{RegExp.prototype[Symbol.split].call(r,'a')}catch(e){'caught'}" }, realm);
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 200, maxCalls: 32 }), prepared.record).completion;
    check(result.type === "throw" && result.origin.kind === "resource-limit", "unbounded capture list bounded");
}
console.log("RegExp split passed");
