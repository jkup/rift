import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, steps = 100000, realm = new Realm((_line: string) => {}, "script")) {
    const prepared = prepareBoundedScript({ id: "array-pattern", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function expect(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    "var a,b;var input=[1,2];([a,b]=input)===input&&a===1&&b===2",
    "var a=1,b=2;[a,b]=[b,a];a===2&&b===1",
    "var a,b,c;[a,b=7,c=8]=[1,null];a===1&&b===null&&c===8",
    "var a,b;[a=3,b=a+1]=[];a===3&&b===4",
    "var a,b;[[a,b]=[7,8]]=[];a===7&&b===8",
    "var a,b;[[a],b]=[[7],8];a===7&&b===8",
    "var a,b;[a,...b]=[1,2,3];a===1&&Array.isArray(b)&&b.join(',')==='2,3'",
    "var a;[...a]=[];Array.isArray(a)&&a.length===0",
    "var a,b;[...[a,b]]=[7,8];a===7&&b===8",
    "var a,b;[,a,,b]=[0,1,2,3];a===1&&b===3",
    "var a,b;[a,b]='😀x';a==='😀'&&b==='x'",
    "var a,b;[a=()=>7,b=function(){return 8}]=[];a.name==='a'&&b.name==='b'&&a()===7&&b()===8",
    "var o={};[o.x=function(){}]=[];o.x.name===''",
    "var a,b;[a,b]=[1,2],a+=b;a===3",
    "var a,b;[a]=([b]=[7]);a===7&&b===7",
    "var a;try{[a]=null}catch(e){e instanceof TypeError}",
    "const a=1;try{[a]=[2]}catch(e){e instanceof TypeError&&a===1}",
    "var a;[a]=[];a===undefined",
    "function f(){[arguments[0]]=[7];return arguments[0]}f(1)===7",
    "function f(){var a;[a=()=>arguments[0]]=[];return a()}f(7)===7"
]) expect(text);
const prefix = "var log='';var iterator={};var xs={};xs[Symbol.iterator]=function(){log+='i';return iterator};";
for (const text of [
    "iterator.next=function(){log+='n';return {done:false,get value(){throw 7}}};iterator.return=function(){log+='r';return {}};[,]=xs;log==='inr'",
    "iterator.next=function(){throw 7};iterator.return=function(){log+='r';return {}};[]=xs;log==='ir'",
    "var a,b;iterator.next=function(){log+='n';return {done:true,get value(){throw 7}}};iterator.return=function(){throw 8};[a,b=3]=xs;log==='in'&&a===undefined&&b===3",
    "var a;iterator.next=function(){throw 7};iterator.return=function(){log+='r';return {}};try{[a]=xs}catch(e){e===7&&log==='i'}",
    "var a;iterator.next=function(){return {get done(){throw 7}}};iterator.return=function(){log+='r';return {}};try{[a]=xs}catch(e){e===7&&log==='i'}",
    "var a;iterator.next=function(){return {done:false,get value(){throw 7}}};iterator.return=function(){log+='r';return {}};try{[a]=xs}catch(e){e===7&&log==='i'}",
    "var a;iterator.next=function(){return {done:false,value:undefined}};iterator.return=function(){log+='r';throw 8};function fail(){throw 7}try{[a=fail()]=xs}catch(e){e===7&&log==='ir'}",
    "var a;iterator.next=function(){return {done:false,value:1}};iterator.return=function(){throw 8};try{[a]=xs}catch(e){e===8&&a===1}",
    "var a;iterator.next=function(){return {done:false,value:1}};iterator.return=function(){return 1};try{[a]=xs}catch(e){e instanceof TypeError&&a===1}",
    "var o={};var key={toString(){log+='k';return 'x'}};function target(){log+='t';return o}iterator.next=function(){log+='n';return {done:false,get value(){log+='v';return 7}}};iterator.return=function(){log+='r';return {}};[target()[key]]=xs;log==='itnvkr'&&o.x===7",
    "var o={};var key={toString(){return 'old'}};iterator.next=function(){key.toString=function(){return 'new'};return {done:false,value:7}};iterator.return=function(){return {}};[o[key]]=xs;o.new===7&&o.old===undefined",
    "function target(){throw 7}iterator.next=function(){log+='n';return {}};iterator.return=function(){log+='r';return {}};try{[target().x]=xs}catch(e){e===7&&log==='ir'}",
    "var a;iterator.next=function(){return {done:false,value:1}};iterator.return=function(){log+='o';return {}};try{[[a]]=xs}catch(e){e instanceof TypeError&&log==='io'}",
    "var a;var inner={};inner[Symbol.iterator]=function(){return {next(){return {done:false,value:undefined}},return(){log+='c';throw 8}}};iterator.next=function(){return {done:false,value:inner}};iterator.return=function(){log+='o';throw 9};function fail(){throw 7}try{[[a=fail()]]=xs}catch(e){e===7&&log==='ico'}",
    "var a;iterator.next=function(){return {done:false,value:1}};iterator.return=function(){log+='r';return {}};function rhs(){log+='q';return xs}[a]=rhs();a===1&&log==='qir'"
]) expect(prefix + text);
const realm = new Realm((_line: string) => {}, "script");
for (const text of ["[...a,]=[]", "[...a,b]=[]", "[...a=1]=[]", "[1]=[]", "[(a=1)]=[]", "([a])=[]", "[a]+=b", "[o?.x]=[]", "'use strict';[arguments]=[]", "'use strict';[eval]=[]"]) {
    const prepared = prepareBoundedScript({ id: "invalid-pattern", text }, realm);
    check(prepared.kind !== "ready", "must reject: " + text);
}
check(parse("[a]=[1];").error !== null, "legacy parser unchanged");
const limited = run(prefix + "var a;iterator.next=function(){return {done:false,value:1}};iterator.return=function(){throw 7};try{[...a]=xs}catch(e){true}", 200);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "unbounded rest cannot catch limits");
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const foreign = run("function f(input){var rest;[...rest]=input;return rest}f", 100000, owner);
if (foreign.type !== "normal") throw new Error("foreign setup");
caller.defineScriptGlobal("foreign", { value: foreign.value });
const rest = run("foreign([1,2])", 100000, caller);
check(rest.type === "normal" && rest.value.kind === "object" && rest.value.object.getPrototypeOf() === owner.arrayPrototype, "rest array defining Realm");
const foreignError = run("foreign(null)", 100000, caller);
check(foreignError.type === "throw" && foreignError.value.kind === "object" && foreignError.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "pattern error defining Realm");
console.log("Array assignment patterns passed");
