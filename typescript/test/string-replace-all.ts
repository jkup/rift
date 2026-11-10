import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, expected: string): void {
    const prepared = prepareBoundedScript({id: "string-replace-all", text}, fresh());
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(text);
}
for (const [text, expected] of [
    ["'aba'.replaceAll('a','x')", "xbx"], ["'aaa'.replaceAll('aa','x')", "xa"],
    ["'aaaa'.replaceAll('aa','b')", "bb"], ["'abc'.replaceAll('','_')", "_a_b_c_"],
    ["''.replaceAll('','_')", "_"], ["''.replaceAll('x','_')", ""],
    ["'abc'.replaceAll('z','x')", "abc"], ["'xx'.replaceAll('x')", "undefinedundefined"],
    ["'undefinedxundefined'.replaceAll(undefined,'_')", "_x_"],
    ["'nullxnull'.replaceAll(null,'_')", "_x_"],
    ["'aba'.replaceAll('a','$$')", "$b$"], ["'aba'.replaceAll('a','$&$&')", "aabaa"],
    ["'aba'.replaceAll('a','$`')", "bab"], ["'aba'.replaceAll('a',\"$'\")", "bab"],
    ["'aba'.replaceAll('a','$1')", "$1b$1"], ["'aba'.replaceAll('a','$<x>')", "$<x>b$<x>"],
    ["'aba'.replaceAll(/a/g,'x')", "xbx"], ["'ab ab'.replaceAll(/(a)(b)/g,'$2$1')", "ba ba"],
    ["String.prototype.replaceAll.call(121,1,3)", "323"],
    ["'aba'.replaceAll('a',function(m,p,s){'use strict';return this===undefined&&m==='a'&&s==='aba'?p:'bad'})", "0b2"],
    ["var n=0;'aa'.replaceAll('a',function(){return {toString(){return ++n}}})", "12"],
    ["var n=0;var r='abc'.replaceAll('z',{toString(){n++;return 'x'}});r+':'+n", "abc:1"],
    ["var log='',o={toString(){log+='r';return 'aa'}},s={toString(){log+='s';return 'a'},get [Symbol.replace](){log+='m';return undefined}},p={toString(){log+='p';return 'x'}};String.prototype.replaceAll.call(o,s,p)+':'+log", "xx:mrsp"],
    ["var o={toString(){throw 8}},p={},s={[Symbol.replace](v,r){return this===s&&v===o&&r===p?'same':'bad'}};String.prototype.replaceAll.call(o,s,p)", "same"],
    ["var log='',s={get [Symbol.match](){log+='m';return true},get flags(){log+='f';return {toString(){log+='s';return 'g'}}},get [Symbol.replace](){log+='r';return function(){return log+'c'}}};''.replaceAll(s,'x')", "mfsrc"],
    ["var s={[Symbol.match]:true,flags:'',get [Symbol.replace](){throw 8}};try{''.replaceAll(s,'x')}catch(e){e.name}", "TypeError"],
    ["var r=/a/;r[Symbol.match]=false;'aba'.replaceAll(r,'x')", "xba"],
    ["Number.prototype[Symbol.replace]=function(s,r){'use strict';return this===1&&s==='a'&&r===2?'same':'bad'};'a'.replaceAll(1,2)", "same"],
    ["var marker={};try{'aa'.replaceAll('a',function(){throw marker})}catch(e){e===marker?'same':'bad'}", "same"],
    ["var s='😀'.replaceAll('','-');s.length+':'+s.charCodeAt(1)+':'+s.charCodeAt(3)", "5:55357:56832"],
    ["var d=Object.getOwnPropertyDescriptor(String.prototype,'replaceAll');d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable", "replaceAll:2:true:false:true"],
]) run(text, expected);
for (const text of ["String.prototype.replaceAll.call(null,'x','y')", "String.prototype.replaceAll.call(Symbol(),'x','y')", "''.replaceAll(/x/,'y')", "''.replaceAll(Symbol(),'x')", "''.replaceAll('x',Symbol())", "'x'.replaceAll('x',function(){return Symbol()})", "''.replaceAll({[Symbol.replace]:3},'x')", "''.replaceAll({[Symbol.match]:true,flags:null},'x')", "new String.prototype.replaceAll()"])
    run("try{"+text+"}catch(e){e.name}", "TypeError");
{
    const realm = fresh();
    realm.defineScriptGlobal("input", {value:{kind:"string",value:"a".repeat(1000)}});
    const prepared = prepareBoundedScript({id:"replaceAll-budget",text:"var calls=0;try{input.replaceAll('',function(){calls++;return ''})}catch(e){calls=999}"},realm);
    if(prepared.kind!=="ready")throw new Error("prepare budget");
    const result=evaluateScript(createScriptSession({maxSteps:100,maxCalls:32}),prepared.record).completion;
    const calls=realm.globalObject.getOwnProperty("calls");
    if(result.type!=="throw"||result.origin.kind!=="resource-limit"||calls?.kind!=="data"||calls.value.kind!=="number"||calls.value.value!==0)throw new Error("position collection budget precedes callbacks");
}
console.log("String replaceAll passed");
