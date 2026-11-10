import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, expected: string): void {
    const prepared = prepareBoundedScript({id: "string-at", text}, fresh());
    if (prepared.kind !== "ready") throw new Error("prepare at: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(text);
}
for (const [text, expected] of [
    ["'abc'.at()", "a"], ["'abc'.at(1)", "b"], ["'abc'.at(-1)", "c"],
    ["'abc'.at(-3)", "a"], ["'abc'.at(NaN)", "a"], ["'abc'.at(-0)", "a"],
    ["'abc'.at(1.9)", "b"], ["'abc'.at(-1.9)", "c"],
    ["'😀'.at(0)", "\ud83d"], ["'😀'.at(-1)", "\ude00"], ["'a\0b'.at(1)", "\0"],
    ["String.prototype.at.call(123,-1)", "3"],
    ["var log='';var o={toString(){log+='r';return 'abc'}},i={valueOf(){log+='i';return -1}};String.prototype.at.call(o,i)+':'+log", "c:ri"],
    ["var marker={};try{''.at({valueOf(){throw marker}})}catch(e){e===marker?'same':'wrong'}", "same"],
    ["String.prototype.trimLeft===String.prototype.trimStart?'same':'wrong'", "same"],
    ["String.prototype.trimRight===String.prototype.trimEnd?'same':'wrong'", "same"],
    ["String.prototype.trimLeft.name+':'+String.prototype.trimRight.name", "trimStart:trimEnd"],
    ["' \\t\\ufeffx \\n'.trimLeft()", "x \n"], ["' \\tx \\n\\ufeff'.trimRight()", " \tx"],
    ["var left=String.prototype.trimLeft;String.prototype.trimStart=function(){return 'changed'};left.call(' x ')", "x "],
    ["var start=String.prototype.trimStart;String.prototype.trimLeft=function(){return 'changed'};start.call(' x ')", "x "],
    ["String.prototype.at.call('abc',1,{toString(){throw 8}})", "b"],
]) run(text, expected);
for (const input of ["'abc'.at(3)", "'abc'.at(-4)", "'abc'.at(Infinity)", "'abc'.at(-Infinity)", "''.at(0)"])
    run("typeof ("+input+")", "undefined");
for (const call of [".call(null)", ".call(undefined)", ".call(Symbol())", ".call('abc',Symbol())"])
    run("try{String.prototype.at"+call+"}catch(e){e.name}", "TypeError");
for (const name of ["at", "trimLeft", "trimRight"])
    run("var d=Object.getOwnPropertyDescriptor(String.prototype,'"+name+"'),r='';try{new d.value()}catch(e){r=e.name}d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r", (name === "at" ? "1" : "0")+":true:false:true:TypeError");
console.log("String at passed");
