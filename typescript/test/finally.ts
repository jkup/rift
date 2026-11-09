import { Realm } from "../src/realm.js";
import { sameValue, normal, unsupportedFailure, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"finally",text},realm);
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
for(const prefix of ["","'use strict';"]) for(const source of [
    "var x=0;try{x=1;}finally{x+=2;}x===3;",
    "var x=0;try{throw 1;}catch(e){x=e;}finally{x+=2;}x===3;",
    "var x=0;var e=0;try{try{throw 7;}finally{x=1;}}catch(a){e=a;}x===1&&e===7;",
    "var e=0;try{try{throw 7;}finally{throw 9;}}catch(a){e=a;}e===9;",
    "function f(){try{return 1;}finally{2;}}f()===1;",
    "function f(){try{return 1;}finally{return 2;}}f()===2;",
    "function f(){try{throw 1;}finally{return 2;}}f()===2;",
    "function f(){try{return 1;}finally{throw 2;}}var e=0;try{f();}catch(a){e=a;}e===2;",
    "function f(){try{throw 1;}catch(e){return e;}finally{return 2;}}f()===2;",
    "var x=0;while(true){try{break;}finally{x++;}}x===1;",
    "var x=0;var i=0;while(i<3){i++;try{continue;}finally{x++;}}x===3;",
    "var x=0;while(true){try{throw 1;}finally{x++;break;}}x===1;",
    "var x=0;while(x<2){try{throw 1;}finally{x++;continue;}}x===2;",
    "function f(){while(true){try{return 1;}finally{break;}}return 2;}f()===2;",
    "var s='';try{try{s+='T';}finally{s+='I';}}finally{s+='O';}s==='TIO';",
    "let x=1;var y=0;try{let x=2;throw 7;}catch(x){y=x;}finally{y+=x;}x===1&&y===8;",
    "var f;var g;try{let x=1;f=function(){return x;};}finally{let x=2;g=function(){return x;};}f()===1&&g()===2&&typeof x==='undefined';",
    "var caught=0;try{try{throw 1;}catch(e){throw 2;}finally{3;}}catch(e){caught=e;}caught===2;",
    "var s='';var it={next:function(){return {value:1,done:false};},return:function(){s+='C';return {};}};var a={};a[Symbol.iterator]=function(){return it;};for(const x of a){try{break;}finally{s+=x;}}s==='1C';",
]) passes(prefix+source);
const completionCases: [string,number|undefined][] = [["try{1;}finally{2;}",1],["try{}finally{2;}",undefined],["try{throw 1;}catch(e){3;}finally{4;}",3]];
for(const [source,expected] of completionCases) {
    const result=run(source);
    check(result.type === "normal" && sameValue(result.value,expected === undefined ? {kind:"undefined"} : {kind:"number",value:expected}),"completion payload");
}
for(const source of ["try{}", "try{}finally;", "try{}finally let x;", "try{}finally{}catch(e){}", "try{}catch{}finally{}", "try{}finally{return 1;}"])
    check(prepareBoundedScript({id:"invalid",text:source},fresh()).kind !== "ready","reject "+source);
check(parse("try{}finally{}").error !== null,"legacy boundary");
const realm=fresh();
const original=prepareBoundedScript({id:"origin",text:"function origin(){throw 7;}"},realm);
if(original.kind !== "ready")throw new Error("origin prepare");
evaluateScript(createScriptSession(),original.record);
for(const [text,unit] of [
    ["try{origin();}finally{try{throw 9;}catch(e){}}","origin"],
    ["try{origin();}finally{throw 7;}","cleanup"],
]) {
    const prepared=prepareBoundedScript({id:"cleanup",text},realm);if(prepared.kind !== "ready")throw new Error("cleanup prepare");
    const session=createScriptSession();const result=evaluateScript(session,prepared.record).completion;
    check(result.type === "throw" && sameValue(result.value,{kind:"number",value:7}),"throw value retained");
    check(session.inspect().lastAbrupt?.unitId === unit,"throw source restoration");
}
for(const source of ["try{while(true){}}finally{out();}","function f(){f();}try{f();}finally{out();}","try{throw 7;}finally{while(true){}}"]){
    const realm=fresh();let effects=0;
    realm.defineScriptGlobal("out",{value:{kind:"object",object:realm.createBuiltin("out",0,(_r,_a,_c,_l)=>{effects++;return normal();})}});
    const result=run(source,realm,100);
    check(result.type === "throw" && result.origin.kind === "resource-limit" && effects===0,"fatal boundary");
}
{
    const realm=fresh();let effects=0;const fault=new Error("host fault");
    realm.defineScriptGlobal("out",{value:{kind:"object",object:realm.createBuiltin("out",0,(_r,_a,_c,_l)=>{effects++;return normal();})}});
    realm.defineScriptGlobal("stop",{value:{kind:"object",object:realm.createBuiltin("stop",0,(_r,_a,_c,l):ValueCompletion=>unsupportedFailure("runtime.object-to-number","TypeError","capability",l))}});
    const result=run("try{stop();}finally{out();}",realm);
    check(result.type === "throw" && result.origin.kind === "unsupported-operation" && effects===0,"capability bypass");
    realm.defineScriptGlobal("fault",{value:{kind:"object",object:realm.createBuiltin("fault",0,(_r,_a,_c,_l):ValueCompletion=>{throw fault;})}});
    const prepared=prepareBoundedScript({id:"host",text:"try{fault();}finally{out();}"},realm);
    if(prepared.kind !== "ready")throw new Error("host prepare");
    const session=createScriptSession();let caught=false;
    try{evaluateScript(session,prepared.record);}catch(error){caught=error instanceof Error && error===fault;}
    const state=session.inspect();check(caught&&effects===0&&state.active===null&&state.calls===0&&state.depth===0,"host fault bypass/restoration");
}
console.log("Finally passed");
