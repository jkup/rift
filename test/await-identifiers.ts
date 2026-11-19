import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}
function expectTrue(text: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "await-execution", text }, realm);
    check(prepared.kind === "ready", "prepare: " + text);
    if (prepared.kind !== "ready") {
        return;
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 10000, maxCalls: 64 }),
        prepared.record,
    ).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const executions = [
    "var await=6;await++;await===7",
    "let await=3;await+=4;await===7",
    "const await=7;await===7",
    "function f(await){return await}f(7)===7",
    "function f(await=7){return await}f()===7",
    "function f(...await){return await[0]}f(7)===7",
    "function await(){return 7}await()===7",
    "var f=function await(){return 7};f()===7",
    "var f=await=>await;f(7)===7",
    "var f=(await)=>await;f(7)===7",
    "var {await}={await:7};await===7",
    "var [await]=[7];await===7",
    "var await;({x:await}={x:7});await===7",
    "var await;[...await]=[7];await[0]===7",
    "var await=7;var o={await};o.await===7",
    "var out=0;try{throw 7}catch(await){out=await}out===7",
    "var out=0;await:while(true){out=7;break await}out===7",
    "var out=0;await:for(var i=0;i<3;i++){if(i<2)continue await;out=7}out===7",
    "var out=0;for(let await of [3,4])out+=await;out===7",
    "function* f(await){yield await}f(7).next().value===7",
    "class await{m(){return 7}}new await().m()===7",
    "var await=7;class C{x=await}new C().x===7",
    "class C{static{function f(await){return await}this.x=f(7)}}C.x===7",
    "var out=0;async function await(x){out=x}await(7);out===7",
    "var out=0;async function f(){function g(await){return await}out=g(7)}f();out===7",
    "var out=0;async function f(x=function(await){return await}){out=x(7)}f();out===7",
    "var await=7,out=0;async function f(){var g=()=>await;out=g()}f();out===7",
    "var await=7,out=0;async function f(){class C{x=await}out=new C().x}f();out===7",
    "var out=0;var f=async(x=function(await){return await})=>{out=x(7)};f();out===7",
    "var out=0;var f=async(x={await:7})=>{out=x.await};f();out===7",
    "function async(x){return x}var await=7;async(await)===7",
    "function async(x){return x}var await=7,x;async(x=await)===7&&x===7",
    "function async(x){return x}var await=7;async(async(await))===7",
    "var await=7;eval('await')===7",
    "eval('var await=7;await')===7",
    "Function('await','return await')(7)===7",
];
for (const text of executions) {
    expectTrue(text);
    expectTrue('"use strict";' + text);
}
for (const text of [
    "async function f(await){}",
    "async function f({await}){}",
    "async function f(x=await){}",
    "async function f(){var await=1}",
    "(async function await(){});",
    "async function f(){function await(){}}",
    "async await=>1;",
    "async(await)=>1;",
    "async({await})=>1;",
    "async(x=await)=>x;",
    "async(x=async(await))=>x;",
    "async(x=(await)=>1)=>x;",
    "async(x=class extends await{})=>x;",
    "async(x=class{[await](){}})=>x;",
    "async function f(){var g=(await)=>1}",
    "class C{static{var await=1}}",
    "class C{static{await:while(false){}}}",
]) {
    let effects = 0;
    const realm = new Realm((_line: string) => {
        effects++;
    }, "script");
    const prepared = prepareBoundedScript(
        { id: "await-invalid", text: 'console.log("no effect");' + text },
        realm,
    );
    check(prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax", text);
    check(effects === 0, "invalid preparation must not execute");
}
check(parse("var await=1;").rejection?.kind === "unsupported-syntax", "legacy admission unchanged");
console.log("await identifiers passed");
