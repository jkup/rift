import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"bitwise",text},realm);
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
    ["5 & 3",1], ["5 | 3",7], ["5 ^ 3",6], ["~0",-1], ["~(-1)",0],
    ["~4294967295",0], ["~4294967296",-1], ["~NaN",-1], ["~Infinity",-1], ["~(-0)",-1],
    ["1 << 31",-2147483648], ["1 << 32",1], ["1 << -1",-2147483648], ["1 << 33",2],
    ["-8 >> 2",-2], ["-8 >>> 2",1073741822], ["-1 >>> 0",4294967295],
    ["2147483648 >> 31",-1], ["2147483648 >>> 31",1], ["4294967296 | 0",0],
    ["4294967297 | 0",1], ["-4294967297 | 0",-1], ["3.9 | 0",3], ["-3.9 | 0",-3],
    ["NaN | 0",0], ["Infinity | 0",0], ["-Infinity >>> 0",0], ["-0 | 0",0],
    ["9007199254740991 | 0",-1], ["9007199254740992 | 0",0], ["1e100 | 0",0],
    ["1 << NaN",1], ["1 << Infinity",1], ["1 << 4294967297",2], ["1 << 1.9",2],
    ["'5' & '3'",1], ["true | null",1], ["undefined ^ 7",7], ["~'5'",-6],
    ["1 | 2 ^ 3 & 4",3], ["2 & 1 == 1",0], ["1 << 2 + 1",8], ["8 >> 1 + 1",2],
    ["1 << 2 << 1",8], ["16 >> 2 >> 1",2], ["2 ** 3 << 1",16], ["(~2) ** 2",9],
    ["2 | 0 ? 3 : 4",3], ["0 || 1 | 2",3], ["1 | 2 && 4",4],
];
for (const [source,expected] of cases) {
    const result=run(source+";");
    check(result.type === "normal" && sameValue(result.value,{kind:"number",value:expected}),source);
}
const operators: [string,number][] = [["&",1],["|",7],["^",6],["<<",40],[">>",0],[">>>",0]];
for (const [op,expected] of operators) for (const prefix of ["","'use strict';"]) {
    passes(prefix+"var x=5;var r=x "+op+"= 3;r==="+expected+"&&x==="+expected+";");
    passes(prefix+"var x=5;x "+op+"= (x=3);x==="+expected+";");
    passes(prefix+"var trace='';var a={valueOf:function(){trace+='L';return 5;}};function rhs(){trace+='R';return {valueOf:function(){trace+='N';return 3;}};}var v=a "+op+" rhs();v==="+expected+"&&trace==='RLN';");
    passes(prefix+"var trace='';var a={valueOf:function(){trace+='L';throw 1;}};var b={valueOf:function(){trace+='R';throw 2;}};var caught=0;try{a "+op+" b;}catch(e){caught=e;}caught===1&&trace==='L';");
    passes(prefix+"var trace='';var a={valueOf:function(){trace+='L';return 5;}};var caught=0;try{a "+op+" (function(){throw 7;})();}catch(e){caught=e;}caught===7&&trace==='';");
    passes(prefix+"var trace='';var a={valueOf:function(){trace+='R';return 3;}};var caught=false;try{Symbol() "+op+" a;}catch(e){caught=e instanceof TypeError;}caught&&trace==='';");
    passes(prefix+"var trace='';var o={};Object.defineProperty(o,'x',{get:function(){trace+='G';return 5;},set:function(v){trace+='S';}});var key={toString:function(){trace+='K';return 'x';}};function base(){trace+='B';return o;}function rhs(){trace+='R';return 3;}var v=base()[key] "+op+"= rhs();v==="+expected+"&&trace==='BKGRS';");
    passes(prefix+"const x=5;var rhs=0;var caught=false;try{x "+op+"= (rhs=3);}catch(e){caught=e instanceof TypeError;}caught&&rhs===3&&x===5;");
    passes(prefix+"var rhs=0;var caught=false;try{missing "+op+"= (rhs=3);}catch(e){caught=e instanceof ReferenceError;}caught&&rhs===0;");
    passes(prefix+"var o={};var sets=0;Object.defineProperty(o,'x',{get:function(){return 5;},set:function(v){sets++;throw 7;}});var caught=0;try{o.x "+op+"= 3;}catch(e){caught=e;}sets===1&&caught===7;");
    passes(prefix+"var a={x:5};var old=a;a.x "+op+"= (a={x:9,valueOf:function(){return 3;}});old.x==="+expected+"&&a.x===9;");
}
passes("var hint='';var a={};a[Symbol.toPrimitive]=function(h){hint=h;return 5;};~a===-6&&hint==='number';");
passes("var ok=false;try{~Symbol();}catch(e){ok=e instanceof TypeError;}ok;");
passes("var x=2;var a=~x++;var b=~++x;a===-3&&b===-5&&x===4;");
for (const source of ["~2 ** 3;","~;","2 &= 3;","x >>>;","x >>>> 2;","new ~x;"])
    check(prepareBoundedScript({id:"invalid",text:source},fresh()).kind !== "ready","reject "+source);
for (const source of ["~1;","1 & 2;","x |= 2;","1 << 2;","x >>>= 1;"])
    check(parse(source).error !== null,"legacy boundary "+source);
const owner=fresh(),caller=fresh();const fn=run("function f(x){return ~x;}f;",owner);
if(fn.type !== "normal")throw new Error("foreign setup");
caller.defineScriptGlobal("f",{value:fn.value});const error=run("f(Symbol());",caller);
check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),"conversion error Realm");
const bounded=run("var a={valueOf:function(){while(true){}}};a << 2;",fresh(),80);
check(bounded.type === "throw" && bounded.origin.kind === "resource-limit","conversion resource boundary");
for (const source of ["x &&= 2;", "x ||= 2;"]) {
    const realm = fresh(), result = run(source, realm);
    check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === realm.getErrorPrototype("ReferenceError"), "original logical assignment runtime error");
}
passes("var x=1;x &&= 2;x===2;");
passes("var x=0;x ||= 2;x===2;");
console.log("Bitwise operators passed");
