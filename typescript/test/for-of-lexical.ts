import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "lexical-for-of", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + " " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, {kind:"boolean",value:true}), text);
}
for (const kind of ["let", "const"]) for (const prefix of ["", "'use strict';"]) {
    for (const source of [
        "var sum=0;for(K x of [1,2,3])sum+=x;sum===6&&typeof x==='undefined'&&!Object.hasOwn(this,'x');",
        "let x=7;for(K x of [1,2]){}x===7;",
        "var a=[];for(K x of [1,2,3])a.push(function(){return x;});a[0]()===1&&a[1]()===2&&a[2]()===3;",
        "var a=[];for(K x of [1,2]){let x=9;a.push(x);}a.join(',')==='9,9';",
        "var a=[];for(K x of [1,2]){for(K y of [3,4])a.push(function(){return x*10+y;});}a[0]()===13&&a[1]()===14&&a[2]()===23&&a[3]()===24;",
        "var a=[];for(K x of [1,2,3]){if(x===2)continue;a.push(function(){return x;});}a.length===2&&a[0]()===1&&a[1]()===3;",
        "var f;for(K x of [1,2]){f=function(){return x;};break;}f()===1;",
        "function f(){for(K x of [1,2])return function(){return x;};}f()()===1;",
        "let x=[1];var ok=false;try{for(K x of x){}}catch(e){ok=e instanceof ReferenceError;}ok&&x[0]===1;",
        "var ok=false;try{for(K x of typeof x){}}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var f;for(K x of (function(){f=function(){return x;};return [1];})()){}var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var f;for(K x of []){f=1;}f===undefined&&typeof x==='undefined';",
        "var sum=0;for(K of of [1,2])sum+=of;sum===3;",
        "var name='bad';for(K f of [function(){}])name=f.name;name==='';",
        "for(K x of []){var hoisted=1;}Object.hasOwn(this,'hoisted')&&hoisted===undefined;",
        "var sum=0;for(K x of new Set([1,2]))sum+=x;sum===3;",
        "var sum=0;for(K pair of new Map([[1,2],[3,4]]))sum+=pair[1];sum===6;",
        "var a=[];for(K x of 'A😀B')a.push(x);a.length===3&&a[1]==='😀';",
    ]) passes(prefix+source.replaceAll("K ",kind+" "));
    const setup="var trace='';var i=0;var it={next:function(){i++;return {value:i,done:i>2};}};var source={};source[Symbol.iterator]=function(){return it;};";
    passes(prefix+setup+"var x=9;for("+kind+" x of source){it.return=function(){trace+=x;return {};};break;}trace==='1'&&x===9;");
    passes(prefix+setup+"var x=9;var ok=false;try{for("+kind+" x of source){it.return=function(){trace+=x;return {};};throw 7;}}catch(e){ok=e===7;}ok&&trace==='1'&&x===9;");
    passes(prefix+setup+"it.return=function(){trace+='R';return {};};for("+kind+" x of source){continue;}trace===''&&i===3;");
    const result=run(prefix+"for("+kind+" x of [1,2]){x;}");
    check(result.type === "normal" && sameValue(result.value,{kind:"number",value:2}), "loop completion value");
    for (const body of ["var x;", "{var x;}", "{if(false){var x;}}"])
        check(prepareBoundedScript({id:"conflict",text:prefix+"for("+kind+" x of [])"+body},fresh()).kind === "conflict", "head/body var conflict");
}
passes("var a=[];for(let x of [1,2]){a.push(function(){return x;});x+=10;}a[0]()===11&&a[1]()===12;");
passes("var closed=0;var it={next:function(){return {value:1,done:false};},return:function(){closed++;return {};}};var source={};source[Symbol.iterator]=function(){return it;};var ok=false;try{for(const x of source)x=2;}catch(e){ok=e instanceof TypeError;}ok&&closed===1;");
passes("var f;for(let x of (function(){f=function(){x=2;};return [1];})()){}var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;");
for (const source of ["for(let x=1 of []){}", "for(const x=1 of []){}", "for(let x,y of []){}", "for(let [x] of []){}", "for(const {x} of []){}", "for(let x=0;x<1;x++){}", "for(const x=1;false;){}", "for await(let x of []){}", "for(let x of []) const y=1;"])
    if (source === "for(let x=0;x<1;x++){}" || source === "for(const x=1;false;){}") passes(source+"typeof x==='undefined';");
    else check(prepareBoundedScript({id:"unsupported",text:source},fresh()).kind !== "ready", "reject " + source);
const owner=fresh(),caller=fresh();
const fn=run("var f;for(const x of [1])f=function(){x=2;};f;",owner);
check(fn.type === "normal", "foreign closure setup");
if(fn.type === "normal")caller.defineScriptGlobal("f",{value:fn.value});
const failure=run("f();",caller);
check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "foreign iteration binding error Realm");
const bounded=run("var source={};source[Symbol.iterator]=function(){return {next:function(){return {value:1,done:false};},return:function(){throw 7;}};};for(let x of source){}",fresh(),200);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "iteration setup budget skips cleanup");
const text="for(const x of [1]){var y;let z=function(){return x;};}";
const plan=parseDeclarationPlan({id:"plan",text});
check(plan.kind === "complete", "plan ready");
if(plan.kind === "complete") {
    check(plan.scopes.length === 4 && plan.scopes[1].kind === "for-of" && plan.scopes[1].start === 0 && plan.scopes[1].end === text.length, "loop scope source range");
    check(plan.scopes[1].lexicalNames.join(',') === 'x' && plan.scopes[0].lexicalNames.length === 0 && plan.scopes[0].varNames.join(',') === 'y', "head lexical and body var ownership");
    check(plan.scopes[2].parent === 1 && plan.scopes[3].parent === 2 && plan.declarations[0].kind === "const" && plan.declarations[0].initializer === null, "loop child associations");
}
console.log("Lexical for-of passed");
