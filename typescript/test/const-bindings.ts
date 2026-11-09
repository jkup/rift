import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse, parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "const", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + " " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), text);
}
for (const prefix of ["", "'use strict';"]) {
    for (const source of [
        "const x=3;x===3&&!Object.hasOwn(this,'x');",
        "const x=undefined;x===undefined;",
        "const x={a:1};x.a=2;x.a===2;",
        "const x=function(){return 7;};x.name==='x'&&x()===7;",
        "const x=3;{const x=4;if(x!==4)throw 1;}x===3;",
        "function f(){const x=3;return function(){return x;};}f()()===3;",
        "function f(x){const y=x+1;return y;}f(3)===4;",
        "var f;{const x=7;f=function(){return x;};}f()===7;",
        "var ok=false;switch(1){case 1:const x=3;ok=x===3;break;}ok;",
        "var ok=false;try{throw 3;}catch(e){const x=e+1;ok=x===4;}ok;",
        "var a=[];for(var i=0;i<2;i++){const x=i;a.push(function(){return x;});}a[0]()===0&&a[1]()===1;",
        "const x=3;var ok=false;try{for(x of [4]){}}catch(e){ok=e instanceof TypeError;}ok&&x===3;",
    ]) passes(prefix+source);
    for (const assignment of ["x=4", "x+=1", "x++", "++x", "x--", "--x"]) {
        passes(prefix+"const x=3;var ok=false;try{"+assignment+";}catch(e){ok=e instanceof TypeError;}ok&&x===3;");
        passes(prefix+"function f(){const x=3;var ok=false;try{"+assignment+";}catch(e){ok=e instanceof TypeError;}return ok&&x===3;}f();");
        passes(prefix+"{const x=3;var ok=false;try{"+assignment+";}catch(e){ok=e instanceof TypeError;}if(!ok||x!==3)throw 1;}true;");
    }
    for (const expression of ["x", "typeof x", "x=2", "x+=1", "x++"]) {
        passes(prefix+"var ok=false;try{"+expression+";}catch(e){ok=e instanceof ReferenceError;}const x=3;ok&&x===3;");
        passes(prefix+"function f(){var ok=false;try{"+expression+";}catch(e){ok=e instanceof ReferenceError;}const x=3;return ok&&x===3;}f();");
    }
    passes(prefix+"var n=0;const x=1;try{x=(n=2);}catch(e){}n===2&&x===1;");
    passes(prefix+"var n=0;const x={valueOf:function(){n++;return 1;}};var ok=false;try{x++;}catch(e){ok=e instanceof TypeError;}ok&&n===1&&typeof x==='object';");
    passes(prefix+"var ok=false;try{const x=x;}catch(e){ok=e instanceof ReferenceError;}ok;");
    passes(prefix+"var ok=false;try{const x=(x=1);}catch(e){ok=e instanceof ReferenceError;}ok;");
}
passes("const x=1;delete x===false&&x===1;");
passes("var ok=false;switch(0){case 0:try{x;}catch(e){ok=e instanceof ReferenceError;}break;case 1:const x=3;}ok;");
for (const source of ["const x;", "const x=1,y=2;", "const [x]=[1];", "if(true)const x=1;", "while(false)const x=1;", "for(const x of []){}", "for(const x=1;false;){}", "const eval=1;"]) {
    if (source === "const [x]=[1];") { passes(source+"x===1;"); continue; }
    if (source === "const eval=1;") {
        passes(source+"eval===1;");
        check(prepareBoundedScript({id:"strict-eval-binding",text:'"use strict";'+source},fresh()).kind !== "ready", "strict eval binding rejected");
        continue;
    }
    if (source === "for(const x of []){}" || source === "for(const x=1;false;){}") {
        passes(source+"typeof x==='undefined';");
        continue;
    }
    check(prepareBoundedScript({id:"unsupported",text:source},fresh()).kind !== "ready", "reject " + source);
}
for (const source of ["const x=1;const x=2;", "const x=1;let x;", "let x;const x=1;", "const x=1;var x;", "const x=1;function x(){}", "function f(x){const x=1;}", "{const x=1;var x;}", "switch(1){case 1:const x=1;break;case 2:const x=2;}"]) {
    check(prepareBoundedScript({id:"conflict",text:source},fresh()).kind === "conflict", "conflict " + source);
}
const realm=fresh();
check(run("const saved=7;",realm).type === "normal", "global initialization");
const write=run("saved=9;",realm);
check(write.type === "throw" && write.diagnostic.name === "TypeError", "cross-script write");
const read=run("saved;",realm);
check(read.type === "normal" && sameValue(read.value,{kind:"number",value:7}), "cross-script read");
for(const source of ["const saved=8;", "let saved;", "var saved;"]) {
    const result=run(source,realm);
    check(result.type === "throw" && result.diagnostic.name === "SyntaxError", "cross-script redeclaration");
}
const interrupted=fresh();
const failed=run("const pending=missing;",interrupted);
check(failed.type === "throw", "failed initializer");
const uninitialized=run("pending=1;",interrupted);
check(uninitialized.type === "throw" && uninitialized.diagnostic.name === "ReferenceError", "failed initialization retains TDZ");
const owner=fresh(),caller=fresh();
const fn=run("const x=1;function assign(){x=2;}assign;",owner);
check(fn.type === "normal", "foreign function");
if(fn.type === "normal")caller.defineScriptGlobal("assign",{value:fn.value});
const foreign=run("assign();",caller);
check(foreign.type === "throw" && foreign.value.kind === "object" && foreign.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "foreign assignment error Realm");
const bounded=run("function f(){while(true){}}const x=f();",fresh(),200);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "initializer resource limit");
const plan=parseDeclarationPlan({id:"plan",text:"const x=function(){const y=2;return y;};"});
check(plan.kind === "complete" && plan.declarations.length === 2 && plan.declarations[0].kind === "const" && plan.declarations[1].kind === "const", "const declaration plan");
check(parse("const x=1;").error !== null, "legacy parser unchanged");
const branch = parse("if(true)const x=1;");
check(branch.rejection?.kind === "unsupported-syntax" && branch.rejection.capabilityCode === "parse.unexpected", "legacy const branch rejection unchanged");
console.log("Const bindings passed");
