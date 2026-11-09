import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "lexical-for", text}, realm);
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
for (const prefix of ["", "'use strict';"]) {
    for (const source of [
        "var sum=0;for(let i=0;i<3;i++)sum+=i;sum===3&&typeof i==='undefined'&&!Object.hasOwn(this,'i');",
        "let i=9;for(let i=0;i<3;i++){}i===9;",
        "var a=[];for(let i=0;i<3;i++)a.push(function(){return i;});a[0]()===0&&a[1]()===1&&a[2]()===2;",
        "var f;for(let i=(f=function(){return i;})&&0;i<3;i++){}f()===0;",
        "var a=[];for(let i=0;(a.push(function(){return i;}))&&i<3;i++){}a.length===4&&a[0]()===0&&a[1]()===1&&a[3]()===3;",
        "var a=[];for(let i=0;i<3;(a.push(function(){return i;}))&&i++){}a[0]()===1&&a[1]()===2&&a[2]()===3;",
        "var a=[];for(let i=0;i<3;i++){a.push(function(){return i;});i++;}a.length===2&&a[0]()===1&&a[1]()===3;",
        "var a=[];for(let i=0;i<3;i++){a.push(function(){return i;});continue;}a[0]()===0&&a[2]()===2;",
        "var a=[];for(let i=0;i<3;i++){try{continue;}finally{a.push(function(){return i;});}}a[0]()===0&&a[2]()===2;",
        "var f;for(let i=0;;i++){f=function(){return i;};break;}f()===0;",
        "function f(){for(let i=7;;i++)return function(){return i;};}f()()===7;",
        "var a=[];for(let i=0;i<2;i++){for(let j=0;j<2;j++)a.push(function(){return i*10+j;});}a[0]()===0&&a[1]()===1&&a[2]()===10&&a[3]()===11;",
        "var a=[];for(let i=0;i<2;i++){let i=9;a.push(i);}a.join(',')==='9,9';",
        "var ok=false;try{for(let i=i;false;){}}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var ok=false;try{for(let i=typeof i;false;){}}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var f;try{for(let i=(f=function(){return i;})&&i;false;){}}catch(e){}var ok=false;try{f();}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var ok=false;for(let i;;){ok=i===undefined;break;}ok;",
        "for(let i=0;false;){var hoisted=7;}hoisted===undefined&&Object.hasOwn(this,'hoisted');",
        "var f;for(const i=function(){};false;){ }for(let i=function(){};;){f=i;break;}f.name==='i';",
        "var n=0;var f;for(const i=7;n<2;n++){f=function(){return i;};}n===2&&f()===7;",
        "var ok=false;try{for(const i=0;i<2;i++){}}catch(e){ok=e instanceof TypeError;}ok;",
        "var ok=false;try{for(const i=i;false;){}}catch(e){ok=e instanceof ReferenceError;}ok;",
        "var f;var n=0;for(const i={x:0};n<2;n++){i.x++;f=function(){return i.x;};}f()===2;",
        "var i=9;try{for(let i=0;(function(){throw 1;})();){}}catch(e){}i===9;",
        "var i=9;try{for(let i=0;;(function(){throw 1;})()){}}catch(e){}i===9;",
    ]) passes(prefix+source);
    for (const kind of ["let","const"]) for (const body of ["var i;","{var i;}","{if(false){var i;}}"])
        check(prepareBoundedScript({id:"conflict",text:prefix+"for("+kind+" i=0;false;)"+body},fresh()).kind === "conflict", "head/body var conflict");
    const completion=run(prefix+"for(let i=0;i<3;i++){i;}");
    check(completion.type === "normal" && sameValue(completion.value,{kind:"number",value:2}),"completion value");
    const empty=run(prefix+"7;for(let i=0;false;i++){}");
    check(empty.type === "normal" && empty.value.kind === "undefined","zero iterations completion");
}
for(const text of ["for(let i var j;;){}","for(const i;;){}","for(let i=0,j=1;false;){}","for(let [i]=[];false;){}","for(let i in {}){}","for(let i=0;;)let x=1;","for(let i=0;;)const x=1;"])
    check(prepareBoundedScript({id:"unsupported",text},fresh()).kind !== "ready","reject "+text);
const owner=fresh(),caller=fresh();
const fn=run("var f;for(const i=0;;){f=function(){i=1;};break;}f;",owner);
check(fn.type === "normal","foreign setup");
if(fn.type === "normal")caller.defineScriptGlobal("f",{value:fn.value});
const failure=run("f();",caller);
check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),"foreign error Realm");
for (const source of ["for(let i=0;;i++){}","for(const i=0;;){}"])
    for(const budget of [0,10,50,200]) {
        const result=run(source,fresh(),budget);
        check(result.type === "throw" && result.origin.kind === "resource-limit","bounded loop");
    }
const text="for(let i=function(){return i;};false;){var y;let z;}";
const plan=parseDeclarationPlan({id:"plan",text});
check(plan.kind === "complete","plan ready");
if(plan.kind === "complete") {
    check(plan.scopes[1].kind === "for-lexical" && plan.scopes[1].start === 0 && plan.scopes[1].end === text.length,"loop range");
    check(plan.scopes[1].lexicalNames.join(',') === 'i' && plan.scopes[0].varNames.join(',') === 'y',"declaration ownership");
    check(plan.scopes[2].parent === 1 && plan.scopes[3].parent === 1 && plan.declarations[0].initializer !== null,"initializer and body scopes");
}
console.log("Lexical for passed");
