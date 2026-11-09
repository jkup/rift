import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"exponentiation",text},realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + prepared.kind + " " + text);
    const session = createScriptSession({maxSteps:steps,maxCalls:32});
    const result = evaluateScript(session,prepared.record).completion;
    const state = session.inspect();
    check(state.active === null && state.calls === 0 && state.depth === 0,"restored session");
    return result;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && sameValue(result.value,{kind:"boolean",value:true}),text);
}
const cases: [string, number][] = [
    ["2 ** 3",8], ["2 ** 3 ** 2",512], ["(2 ** 3) ** 2",64], ["2 * 3 ** 2",18],
    ["2 ** 3 * 2",16], ["2 ** -2",0.25], ["(-2) ** 3",-8], ["(-2) ** 4",16],
    ["9 ** 0.5",3], ["(-2) ** 0.5",NaN], ["NaN ** 0",1], ["NaN ** -0",1],
    ["1 ** NaN",NaN], ["0 ** 0",1], ["0 ** -1",Infinity], ["(-0) ** 3",-0],
    ["(-0) ** 2",0], ["(-0) ** -3",-Infinity], ["(-0) ** -2",Infinity],
    ["Infinity ** -1",0], ["(-Infinity) ** -3",-0], ["(-Infinity) ** -2",0],
    ["(-Infinity) ** 3",-Infinity], ["(-Infinity) ** 2",Infinity],
    ["1 ** Infinity",NaN], ["(-1) ** -Infinity",NaN], ["2 ** Infinity",Infinity],
    ["0.5 ** Infinity",0], ["2 ** -Infinity",0], ["0.5 ** -Infinity",Infinity],
    ["'2' ** '3'",8], ["true ** 2",1], ["null ** 2",0], ["undefined ** 0",1],
    ["2 ** 3 + 1",9], ["2 ** (3 + 1)",16], ["(!0) ** 3",1], ["(void 0) ** 0",1],
];
for (const [source,expected] of cases) {
    const result=run(source+";");
    check(result.type === "normal" && sameValue(result.value,{kind:"number",value:expected}),source);
}
for (const prefix of ["","'use strict';"]) {
    for (const source of [
        "var x=2;var y=3;x **= y **= 2;x===512&&y===9;",
        "var x=2;var r=x **= 3;r===8&&x===8;",
        "var x=2;x **= (x=3);x===8;",
        "var x=2;var r=x++ ** 3;r===8&&x===3;",
        "var x=2;var r=++x ** 2;r===9&&x===3;",
        "var x=2;var r=2 ** ++x;r===8&&x===3;",
        "var x=2;var r=2 ** x++;r===4&&x===3;",
        "var a={x:2};var old=a;a.x **= (a={x:7});isNaN(old.x)&&a.x===7;",
        "var s='';var a={valueOf:function(){s+='L';return 2;}};function r(){s+='R';return {valueOf:function(){s+='N';return 3;}};}var v=a ** r();v===8&&s==='RLN';",
        "var s='';var a={valueOf:function(){s+='L';throw 1;}};var b={valueOf:function(){s+='R';throw 2;}};var e=0;try{a ** b;}catch(x){e=x;}e===1&&s==='L';",
        "var s='';var a={valueOf:function(){s+='L';return 2;}};var e=0;try{a ** (function(){throw 7;})();}catch(x){e=x;}e===7&&s==='';",
        "var s='';var b={valueOf:function(){s+='R';return 2;}};var ok=false;try{Symbol() ** b;}catch(e){ok=e instanceof TypeError;}ok&&s==='';",
        "var ok=false;try{2 ** Symbol();}catch(e){ok=e instanceof TypeError;}ok;",
        "var hints='';var a={};a[Symbol.toPrimitive]=function(h){hints+=h;return 2;};a ** a===4&&hints==='numbernumber';",
        "const x=2;var rhs=0;var ok=false;try{x **= (rhs=3);}catch(e){ok=e instanceof TypeError;}ok&&rhs===3&&x===2;",
        "var rhs=0;var ok=false;try{missing **= (rhs=3);}catch(e){ok=e instanceof ReferenceError;}ok&&rhs===0;",
    ]) passes(prefix+source);
}
passes("var trace='';var o={};Object.defineProperty(o,'x',{get:function(){trace+='G';return 2;},set:function(v){trace+='S'+v;}});var key={toString:function(){trace+='K';return 'x';}};function base(){trace+='B';return o;}function rhs(){trace+='R';return 3;}var v=base()[key] **= rhs();v===8&&trace==='BKGRS8';");
passes("var n=0;var o={};Object.defineProperty(o,'x',{get:function(){return 2;},set:function(v){n=v;throw 7;}});var e=0;try{o.x **= 3;}catch(x){e=x;}e===7&&n===8;");
for (const source of ["-2 ** 3;","+2 ** 3;","!2 ** 3;","typeof x ** 2;","void 0 ** 2;","delete x ** 2;","2 ** -2 ** 3;","2 **= 3;","x **;","x *** 2;","x ** = 2;"])
    check(prepareBoundedScript({id:"invalid",text:source},fresh()).kind !== "ready","reject "+source);
for (const source of ["2 ** 3;","x **= 2;"])
    check(parse(source).error !== null,"legacy boundary "+source);
const deep=prepareBoundedScript({id:"deep",text:Array(140).fill("2").join(" ** ")+";"},fresh());
check(deep.kind !== "ready","bounded exponentiation parsing");
const limited=run("var a={valueOf:function(){while(true){}}};a ** 2;",fresh(),80);
check(limited.type === "throw" && limited.origin.kind === "resource-limit","conversion resource boundary");
const owner=fresh(),caller=fresh();const fn=run("function f(x){return x ** 2;}f;",owner);
if(fn.type !== "normal")throw new Error("foreign setup");
caller.defineScriptGlobal("f",{value:fn.value});
const error=run("f(Symbol());",caller);
check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),"conversion error Realm");
console.log("Exponentiation passed");
