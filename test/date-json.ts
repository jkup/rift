import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-json", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    return result.value;
}
function passes(text: string): void {
    const value = run(text);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const text of [
    'new Date(0).toJSON()==="1970-01-01T00:00:00.000Z"',
    "new Date(NaN).toJSON()===null",
    'JSON.stringify({d:new Date(0),bad:new Date(NaN)})===\'{"d":"1970-01-01T00:00:00.000Z","bad":null}\'',
    "JSON.stringify([new Date(-1)])==='[\"1969-12-31T23:59:59.999Z\"]'",
    "var x={valueOf:function(){return NaN},get toISOString(){throw 1}};Date.prototype.toJSON.call(x)===null",
    "var x={valueOf:function(){return Infinity},get toISOString(){throw 1}};Date.prototype.toJSON.call(x)===null",
    "var x={valueOf:function(){return -Infinity},get toISOString(){throw 1}};Date.prototype.toJSON.call(x)===null",
    'var x={valueOf:function(){return 3},toISOString:function(){return this===x&&arguments.length===0}};Date.prototype.toJSON.call(x,"ignored")===true',
    "var marker={};var x={valueOf:function(){return 3},toISOString:function(){return marker}};Date.prototype.toJSON.call(x)===marker",
    'var x={valueOf:function(){return "NaN"},toISOString:function(){return 7}};Date.prototype.toJSON.call(x)===7',
    "var x={valueOf:function(){return 1n},toISOString:function(){return 7}};Date.prototype.toJSON.call(x)===7",
    "var x={valueOf:function(){return Symbol()},toISOString:function(){return 7}};Date.prototype.toJSON.call(x)===7",
    'var log="";var x={get valueOf(){log+="v";return function(){log+="c";return 0}},get toISOString(){log+="i";return function(){log+="f";return 8}}};Date.prototype.toJSON.call(x)===8&&log==="vcif"',
    'var hint="";var x={[Symbol.toPrimitive]:function(h){hint=h;return 0},toISOString:function(){return 8}};Date.prototype.toJSON.call(x)===8&&hint==="number"',
    "var ok=false;try{Date.prototype.toJSON.call({valueOf:function(){throw 7},toISOString:function(){throw 8}})}catch(e){ok=e===7}ok",
    "var ok=false;try{Date.prototype.toJSON.call({valueOf:function(){return 0},get toISOString(){throw 7}})}catch(e){ok=e===7}ok",
    "var ok=false;try{Date.prototype.toJSON.call({valueOf:function(){return 0},toISOString:3})}catch(e){ok=e instanceof TypeError}ok",
    "var d=new Date(NaN);d.valueOf=function(){return 0};var ok=false;try{d.toJSON()}catch(e){ok=e instanceof RangeError}ok",
    "var d=new Date(0);d.valueOf=function(){return NaN};d.toJSON()===null",
    'Number.prototype.toISOString=function(){return typeof this==="object"&&this.valueOf()===7};Date.prototype.toJSON.call(7)===true',
    "Date.prototype.toJSON.call(NaN)===null&&Date.prototype.toJSON.call(Infinity)===null",
    'Date.prototype.toJSON.length===1&&Date.prototype.toJSON.name==="toJSON"',
]) {
    passes(text);
}
for (const receiver of ["null", "undefined"]) {
    passes(
        "var ok=false;try{Date.prototype.toJSON.call(" +
            receiver +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("serialize", { value: run("Date.prototype.toJSON", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run(
    "var ok=false;try{serialize.call(null)}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok",
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Date JSON Realm");
}
console.log("date json passed");
