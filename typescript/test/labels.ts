import { Realm } from "../src/realm.js";
import { sameValue, type Value, type ValueCompletion } from "../src/runtime.js";
import { parse } from "../src/parser.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, steps = 50000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "labels", text }, fresh());
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function expect(text: string, expected: Value): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value, expected), text);
}
function passes(text: string): void { expect(text, { kind: "boolean", value: true }); }
for (const source of [
    "var n=0;outer:for(var i=0;i<3;i++){for(var j=0;j<3;j++){n++;if(j===1)break outer;}}n===2&&i===0;",
    "var n=0;outer:for(var i=0;i<3;i++){for(var j=0;j<3;j++){if(j===1)continue outer;n++;}}n===3&&i===3;",
    "var n=0;a:b:for(var i=0;i<3;i++){n++;if(i===0)continue a;if(i===1)continue b;}n===3&&i===3;",
    "var n=0;outer:while(n<3){n++;while(true){continue outer;}}n===3;",
    "var n=0,tests=0;outer:do{n++;while(true){continue outer;}}while(++tests<3);n===3&&tests===3;",
    "var n=0;block:{n=1;break block;n=2;}n===1;",
    "var n=0;outer:for(var i=0;i<3;i++){switch(i){case 1:break outer;default:n++;}n++;}n===2&&i===1;",
    "var n=0;outer:switch(1){case 1:while(true){n++;break outer;}n=7;}n===1;",
    "var keys='';outer:for(var k in {a:1,b:2}){while(true){keys+=k;continue outer;}}keys==='ab';",
    "var n=0;outer:for(var x of [1,2,3]){while(true){n+=x;continue outer;}}n===6;",
    "var fs=[];outer:for(let i=0;i<3;i++){fs.push(()=>i);continue outer;}fs[0]()===0&&fs[1]()===1&&fs[2]()===2;",
    "var fs=[];outer:for(let i of [1,2,3]){fs.push(()=>i);continue outer;}fs[0]()===1&&fs[1]()===2&&fs[2]()===3;",
    "var n=0;outer:for(var i=0;i<3;i++){try{continue outer;}finally{n++;}}n===3&&i===3;",
    "var n=0;outer:while(true){try{continue outer;}finally{n++;break outer;}}n===1;",
    "var n=0;a:while(true){b:{try{break a;}finally{break b;}}n++;break;}n===1;",
    "function f(){outer:while(true){try{break outer;}finally{return 7;}}return 3;}f()===7;",
    "var n=0;a:{n++;}a:{n++;}a:while(true){break;}n===2;",
    "a:var x=7;x===7;",
    "outer:{let x=7;var y=x;break outer;}y===7&&typeof x==='undefined';",
    "arguments:{break arguments;}eval:{break eval;}true;",
    "outer:while(true){function f(){outer:{return 7;}}break outer;}f()===7;",
    "var f=()=>{a:{return 7;}};f()===7;",
    "Function('a:{break a;}return 7;')()===7;",
    "function f(){a:{break a;}}f.toString()==='function f(){a:{break a;}}';",
]) passes(source);

for (const source of ["1;a:{break a;}", "a:{1;break a;}", "a:while(true){1;break a;}", "a:{b:{1;break a;}}", "a:try{1;break a;}finally{9;}"])
    expect(source, { kind: "number", value: 1 });
for (const source of ["1;a:if(true)break a;", "a:try{throw 1;}finally{break a;}", "a:while(true){break\na;}"])
    expect(source, { kind: "undefined" });

const iterators = "var log='';function make(name){var n=0;var it={next(){n++;return {value:n,done:n>2};},return(){log+=name;return {};}};it[Symbol.iterator]=function(){return this;};return it;}";
passes(iterators + "var sum=0;outer:for(var x of make('O')){for(var y of make('I')){sum+=x;continue outer;}}sum===3&&log==='II';");
passes(iterators + "outer:for(var x of make('O')){for(var y of make('I')){break outer;}}log==='IO';");
passes(iterators + "var sum=0;a:b:for(var x of make('O')){sum+=x;continue a;}sum===3&&log==='';");
passes(iterators + "var e={};var caught=false;try{outer:for(var x of make('O')){var inner=make('I');inner.return=function(){log+='X';throw e;};for(var y of inner){continue outer;}}}catch(q){caught=q===e;}caught&&log==='XO';");
passes(iterators + "var e={},other={};var outerIt=make('O');outerIt.return=function(){log+='O';throw other;};var caught=false;try{outer:for(var x of outerIt){var inner=make('I');inner.return=function(){log+='I';throw e;};for(var y of inner){break outer;}}}catch(q){caught=q===e;}caught&&log==='IO';");

for (const text of [
    "a:{a:;}", "break missing;", "while(true){continue missing;}", "a:{continue a;}",
    "a:{while(true){continue a;}}", "a:if(true)while(true){continue a;}",
    "a:while(true){function f(){break a;}}", "a:while(true){var f=()=>{continue a;};}",
    "a:while(true){var o={m(){break a;}};}", "a:let x;", "a:const x=1;", "a:function f(){}",
    "a:{break;}",
]) {
    const prepared = prepareBoundedScript({ id: "invalid-label", text }, fresh());
    check(prepared.kind === "blocked" && prepared.rejection.kind === "unsupported-syntax" && prepared.diagnostic.phase === "parse", text);
}
check(parse("a:{break a;}").error !== null, "legacy label grammar stays excluded");
const bounded = run("outer:while(true){try{continue outer;}finally{1;}}", 100);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit", "labelled loop is bounded");
let deep = "";
for (let i = 0; i < 130; i++) deep += "label" + i + ":";
const rejected = prepareBoundedScript({ id: "label-depth", text: deep + ";" }, fresh());
check(rejected.kind === "blocked" && rejected.rejection.kind === "resource-limit", "label nesting is bounded");
console.log("Labelled statements passed");
