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
    "let [a,b]=[1,2];a===1&&b===2",
    "const [a,b=7]=[1];a===1&&b===7",
    "var [a,b]=[1,2];a===1&&b===2",
    "let [a=3,b=a+1]=[];a===3&&b===4",
    "let [[a,b]=[7,8],...c]=[undefined,9,10];a===7&&b===8&&c.join(',')==='9,10'",
    "let [...[a,b]]=[7,8];a===7&&b===8",
    "let [,a,,b]=[0,1,2,3];a===1&&b===3",
    "let [a,b]='😀x';a==='😀'&&b==='x'",
    "let [a=()=>7,b=function(){return 8}]=[];a.name==='a'&&b.name==='b'&&a()===7&&b()===8",
    "var ok=false;try{let [a=b,b=1]=[]}catch(e){ok=e instanceof ReferenceError}ok",
    "var ok=false;try{let [a=a]=[]}catch(e){ok=e instanceof ReferenceError}ok",
    "var a=7;var ok=false;try{let [a]=[a]}catch(e){ok=e instanceof ReferenceError}ok&&a===7",
    "var [a=b,b=1]=[];a===undefined&&b===1",
    "var [a,a]=[1,2];a===2",
    "const [a]=[1];var ok=false;try{a=2}catch(e){ok=e instanceof TypeError}ok&&a===1",
    "function f(){var [a=()=>arguments[0]]=[];return a()}f(7)===7",
    "function f(){let [a=()=>b,b=7]=[];return a}f()()===7",
    "function f(){return a;var [a]=[1]}f()===undefined",
    "let [a=eval('7')]=[];a===7",
    "var f;{let [a=3,b=()=>a]=[];f=b}f()===3",
    "var ok=false;try{let []=null}catch(e){ok=e instanceof TypeError}ok",
    "var log='';var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,get value(){throw 7}}},return(){log+='r';return {}}}};let [,]=xs;log==='r'",
    "var log='';var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:undefined}},return(){log+='r';throw 8}}};var ok=false;try{let [a=b,b]=xs}catch(e){ok=e instanceof ReferenceError}ok&&log==='r'",
    "var log='';var xs={};xs[Symbol.iterator]=function(){return {next(){throw 7},return(){log+='r';return {}}}};var ok=false;try{let [a]=xs}catch(e){ok=e===7}ok&&log===''"
]) expect(text);
for (const text of [
    "let [a,a]=[];", "const [a,a]=[];", "let [a]=[];var a;", "let [a];",
    "var [a];", "const [...a,]=[];", "let [...a=1]=[];", "let [a.x]=[];",
    "let [(a)]=[];", "let [1]=[];", "'use strict';let [eval]=[];",
    "if(true)let [a]=[];", "if(true)const [a]=[];"
]) {
    const prepared = prepareBoundedScript({ id: "invalid-array-binding", text }, new Realm((_line: string) => {}, "script"));
    check(prepared.kind !== "ready", "invalid declaration: " + text);
}
check(parse("let [a]=[1];").error !== null, "legacy parser boundary");
const limited = run("var xs={};xs[Symbol.iterator]=function(){return {next(){return {done:false,value:1}},return(){throw 7}}};try{let [...rest]=xs}catch(e){true}", 200);
check(limited.type === "throw" && limited.origin.kind === "resource-limit", "binding rest limit bypasses catch");
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
const foreign = run("function f(input){const [...rest]=input;return rest}f", 100000, owner);
if (foreign.type !== "normal") throw new Error("foreign setup");
caller.defineScriptGlobal("foreign", { value: foreign.value });
const rest = run("foreign([1,2])", 100000, caller);
check(rest.type === "normal" && rest.value.kind === "object" && rest.value.object.getPrototypeOf() === owner.arrayPrototype, "rest array defining Realm");
const foreignError = run("foreign(null)", 100000, caller);
check(foreignError.type === "throw" && foreignError.value.kind === "object" && foreignError.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "pattern error defining Realm");
console.log("Array binding patterns passed");
