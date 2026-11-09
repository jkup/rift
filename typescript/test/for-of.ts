import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "for-of", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    const session = createScriptSession({maxSteps: steps, maxCalls: 64});
    const result = evaluateScript(session, prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0, "restored session");
    return result;
}
function expect(text: string, expected: Value): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, expected), text);
}
function passes(text: string): void { expect(text, {kind: "boolean", value: true}); }

for (const source of [
    "var sum=0;for(var x of [1,2,3])sum+=x;sum===6&&x===3;",
    "var sum=0;var x;for(x of [1,2,3])sum+=x;sum===6&&x===3;",
    "var a=[];for(var x of [1,,3])a.push(x);a.length===3&&a[1]===undefined;",
    "var a=[];for(var x of 'A😀B')a.push(x);a.length===3&&a[1]==='😀';",
    "var a=[];for(var x of new Set([2,1,2]))a.push(x);a.join(',')==='2,1';",
    "var a=[];for(var x of new Map([[1,2],[3,4]]))a.push(x.join(':'));a.join(',')==='1:2,3:4';",
    "var of=[1,2];var sum=0;for(var of of of)sum+=of;sum===3&&of===2;",
    "var out=[];for(var x of [1,2,3]){if(x===2)continue;out.push(x);}out.join(',')==='1,3';",
    "var sum=0;for(var x of [1,2]){for(var y of [3,4]){sum+=x*y;break;}}sum===9;",
    "var a=[];for(var x of [1,2])a.push(function(){return x;});a[0]()===2&&a[1]()===2;",
    "var a=[];for(var x of [1,2]){let y=x;a.push(function(){return y;});}a[0]()===1&&a[1]()===2;",
    "var calls=0;function source(){calls++;return [1,2];}for(var x of source()){}calls===1;",
    "for(var x of []){}Object.hasOwn(this,'x')&&x===undefined;",
    "var o={};var n=0;for(o[n++] of [4,5]){}n===2&&o[0]===4&&o[1]===5;",
    "var n=0;function target(){n++;return {};}for(target().x of []){}n===0;",
    "var o={};for(o.x of [function(){}]){}o.x.name==='';",
    "function f(){for(var x of [1,2])return x;}f()===1;",
    "'use strict';var x;for(x of [1,2]){}x===2;",
    "var a=[1,2];var out=[];for(var x of a){out.push(x);if(x===1)a.push(3);}out.join(',')==='1,2,3';",
]) passes(source);
expect("99;for(var x of []){}", {kind: "undefined"});
expect("for(var x of [1,2]){x;}", {kind: "number", value: 2});
expect("for(var x of [1,2]){7;break;}", {kind: "number", value: 7});
expect("for(var x of [1,2]){x;continue;}", {kind: "number", value: 2});

const setup = "var trace='';var i=0;var it={next:function(){trace+='N';i++;return {value:i,done:i>2};}};var source={};source[Symbol.iterator]=function(){trace+='I';return it;};";
passes(setup+"it.return=function(){trace+='R';return {};};for(var x of source){trace+='B';}trace==='INBNBN';");
passes(setup+"it.return=function(){trace+='R';return {};};for(var x of source){trace+='B';continue;}trace==='INBNBN';");
passes(setup+"it.return=function(){trace+=this===it?'R':'X';return {};};for(var x of source){trace+='B';break;}trace==='INBR';");
passes(setup+"it.return=function(){trace+='R';return {};};function f(){for(var x of source)return 7;}f()===7&&trace==='INR';");
passes(setup+"Object.defineProperty(it,'next',{get:function(){trace+='G';return function(){trace+='N';i++;return {value:i,done:i>2};};}});for(var x of source){}trace==='IGNNN';");
passes(setup+"var o={};function key(){trace+='K';return 'x';}for(o[key()] of source){trace+='B';}trace==='INKBNKBN'&&o.x===2;");
passes(setup+"for(var x of source){it.next=function(){throw 9;};}i===3;");
passes(setup+"it.return=function(){trace+='R';return {};};for(var x of source){switch(x){case 1:break;}trace+='B';}trace==='INBNBN';");
for (const bad of ["1", "function(){return 1;}", "function(){throw 7;}"]) {
    passes(setup+"it.return="+bad+";var caught=false;try{for(var x of source)break;}catch(e){caught="+(bad.includes("throw")?"e===7":"e instanceof TypeError")+";}caught;");
    passes(setup+"it.return="+bad+";var caught=false;try{for(var x of source)throw 9;}catch(e){caught=e===9;}caught;");
}
for (const absent of ["null", "undefined"]) passes(setup+"it.return="+absent+";for(var x of source)break;trace==='IN';");
passes(setup+"Object.defineProperty(it,'return',{get:function(){trace+='R';throw 7;}});var ok=false;try{for(var x of source)throw 9;}catch(e){ok=e===9;}ok&&trace==='INR';");
passes(setup+"Object.defineProperty(it,'return',{get:function(){throw 7;}});function f(){for(var x of source)return 9;}var ok=false;try{f();}catch(e){ok=e===7;}ok;");
passes(setup+"it.return=function(){trace+='R';return {};};var o={};Object.defineProperty(o,'x',{set:function(v){throw 7;}});var ok=false;try{for(o.x of source){trace+='B';}}catch(e){ok=e===7;}ok&&trace==='INR';");
passes(setup+"it.return=function(){trace+='R';return {};};function target(){throw 7;}var ok=false;try{for(target().x of source){}}catch(e){ok=e===7;}ok&&trace==='INR';");
passes("'use strict';"+setup+"it.return=function(){trace+='R';return {};};var ok=false;try{for(missing of source){}}catch(e){ok=e instanceof ReferenceError;}ok&&trace==='INR';");
for (const next of ["function(){throw 7;}", "function(){return 1;}", "function(){var r={};Object.defineProperty(r,'done',{get:function(){throw 7;}});return r;}", "function(){var r={done:false};Object.defineProperty(r,'value',{get:function(){throw 7;}});return r;}"]) {
    passes(setup+"it.next="+next+";it.return=function(){trace+='R';return {};};var ok=false;try{for(var x of source){}}catch(e){ok=true;}ok&&trace==='I';");
}
for (const value of ["null", "undefined", "1", "{}", "{length:2}"]) passes("var ok=false;try{for(var x of "+value+"){}}catch(e){ok=e instanceof TypeError;}ok;");
for (const source of ["for(var x=1 of []){}", "for(var x,y of []){}", "for(1 of []){}", "for(let x of []){}", "for(const x of []){}", "for await(var x of []){}", "for(var [x] of []){}", "for(var x of []) let y=1;"]) {
    if (source === "for(let x of []){}" || source === "for(const x of []){}" || source === "for(var [x] of []){}") {
        passes(source+"typeof x==='undefined';");
        continue;
    }
    check(prepareBoundedScript({id: "unsupported", text: source},fresh()).kind !== "ready", "reject " + source);
}
check(parse("for(var x of []){}").error !== null, "legacy parser rejects for-of");
const realm = fresh();
const bounded = run(setup+"it.next=function(){return {value:1,done:false};};it.return=function(){trace+='R';return {};};for(var x of source){}",realm,200);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "iteration budget");
const trace = run("trace;",realm);
check(trace.type === "normal" && sameValue(trace.value,{kind:"string",value:"I"}), "engine stop skips cleanup");
const cleanupStop = run(setup+"it.return=function(){while(true){}};for(var x of source)throw 7;",fresh(),200);
check(cleanupStop.type === "throw" && cleanupStop.origin.kind === "resource-limit", "cleanup engine stop overrides guest throw");
const owner = fresh(), caller = fresh();
const foreign = run("var it={next:function(){return {value:1,done:false};},return:function(){throw new URIError('close');}};var source={};source[Symbol.iterator]=function(){return it;};source;",owner);
check(foreign.type === "normal", "foreign setup");
if (foreign.type === "normal") caller.defineScriptGlobal("source",{value:foreign.value});
const foreignThrow = run("for(var x of source)break;",caller);
check(foreignThrow.type === "throw" && foreignThrow.value.kind === "object" && foreignThrow.value.object.getPrototypeOf() === owner.getErrorPrototype("URIError"), "foreign cleanup throw Realm");
run("it.return=function(){return 1;};",owner);
const localThrow = run("for(var x of source)break;",caller);
check(localThrow.type === "throw" && localThrow.value.kind === "object" && localThrow.value.object.getPrototypeOf() === caller.getErrorPrototype("TypeError"), "cleanup validation Realm");
console.log("Synchronous for-of passed");
