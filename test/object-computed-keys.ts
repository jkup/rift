import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, expected: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "object-computed-keys", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(text);
}
for (const [text, expected] of [
    ["var k='a';({[k]:7}).a+''", "7"],
    ["var s=Symbol('x'),o={[s]:8};Object.getOwnPropertyNames(o).length+':'+(Object.getOwnPropertySymbols(o)[0]===s)+':'+o[s]", "0:true:8"],
    ["var o={[null]:1,[undefined]:2,[-0]:3,[true]:4};Object.keys(o).join(',')", "0,null,undefined,true"],
    ["var log='',k={toString(){log+='k';return 'a'}};var o={[(log+='e',k)]:(log+='v',7),[(log+='n','b')]:8};log+':'+o.a", "ekvn:7"],
    ["var marker={},log='';try{var o={[{toString(){throw marker}}]:(log+='wrong',1)}}catch(e){log=e===marker?'same':'bad'}log", "same"],
    ["var o={['__proto__']:null};Object.hasOwn(o,'__proto__')+':'+(Object.getPrototypeOf(o)===Object.prototype)", "true:true"],
    ["var o={['x']:1,x:2,['x']:3};o.x+':'+Object.keys(o).length", "3:1"],
    ["var o={['m'](){return this.x},x:9};o.m()+':'+o.m.name+':'+o.m.hasOwnProperty('prototype')", "9:m:false"],
    ["var s=Symbol('m'),o={[s](){return this.x},x:4};o[s]()+':'+o[s].name", "4:[m]"],
    ["var s=Symbol(),o={[s]:function(){}};o[s].name", ""],
    ["var s=Symbol(''),o={[s]:()=>1};o[s].name", "[]"],
    ["var o={['fn']:function(){},['arrow']:()=>1,['C']:class{}};o.fn.name+':'+o.arrow.name+':'+o.C.name", "fn:arrow:C"],
    ["function named(){}var o={['x']:named};o.x.name", "named"],
    ["var k='x',o={get [k](){return this.y},set [k](v){this.y=v},y:1};o.x=7;var d=Object.getOwnPropertyDescriptor(o,'x');o.x+':'+d.get.name+':'+d.set.name+':'+d.enumerable+':'+d.configurable", "7:get x:set x:true:true"],
    ["var s=Symbol('a'),o={get [s](){return 3}};Object.getOwnPropertyDescriptor(o,s).get.name", "get [a]"],
    ["var o={get(){return 1},set(){return 2},get:3};o.get+':'+o.set()", "3:2"],
    ["var o={['m'](){return super.x}};Object.setPrototypeOf(o,{x:6});o.m()+''", "6"],
    ["var k={toString(){return 'f'}},o={[k]:function(){return 1}};o.f.name+':'+o.f()", "f:1"],
    ["var o={[(function(){let x='a';return x})()]:7};o.a+''", "7"],
    ["function f(k){return {[(()=>k)()]:()=>k}}var o=f('x');o.x()+':'+o.x.name", "x:x"],
    ["var k='x',o={x:4},v;({[k]:v}=o);v+''", "4"],
    ["var k='x',o={[k]:1};var {[k]:v}=o;v+''", "1"],
    ["var log='',o={get [(log+='g','x')](){return 1},set [(log+='s','x')](v){}};log+':'+o.x", "gs:1"],
]) run(text, expected);
for (const text of [
    "({[]:1})", "({[1,2]:3})", "({get ['x'](v){}})", "({set ['x'](){}})",
    "({set ['x'](...v){}})", "({get ['x']:1})", "({[x]})", "({__proto__:null})",
    "({[(function(a,a){'use strict';})()]:1})",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "bad-computed-key", text}, realm);
    if (text === "({__proto__:null})") {
        if (prepared.kind !== "ready") throw new Error("prototype setter must prepare");
        const result = evaluateScript(createScriptSession(), prepared.record).completion;
        if (result.type !== "normal" || result.value.kind !== "object" || result.value.object.getPrototypeOf() !== null) throw new Error("prototype setter result");
    } else if (prepared.kind === "ready") throw new Error("accepted invalid or unsupported input: " + text);
}
console.log("Object computed keys passed");
