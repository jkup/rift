import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, expected: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "named-functions", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (
        result.type !== "normal" ||
        result.value.kind !== "string" ||
        result.value.value !== expected
    ) {
        throw new Error(text);
    }
}
for (const [text, expected] of [
    [
        "var f=function factorial(n){return n<2?1:n*factorial(n-1)};f(5)+':'+f.name+':'+typeof factorial",
        "120:factorial:undefined",
    ],
    ["var inside=8,f=function inside(){return inside};(f()===f)+':'+inside", "true:8"],
    ["var f=function self(){return self};var g=f;f=0;(g()===g)+''", "true"],
    ["var f=function self(){self=7;return self};(f()===f)+''", "true"],
    ["var f=function self(){'use strict';self=7};try{f()}catch(e){e.name}", "TypeError"],
    ["'use strict';var f=function self(){self=7};try{f()}catch(e){e.name}", "TypeError"],
    ["var f=function self(){var self=7;return self};f()+''", "7"],
    ["var f=function self(self){return self};f(8)+''", "8"],
    ["var f=function self(){let self=9;return self};f()+''", "9"],
    ["var f=function self(a=self){return a};(f()===f)+''", "true"],
    ["var f=function self(self=self){};try{f()}catch(e){e.name}", "ReferenceError"],
    ["var f=function self(){return ()=>self};(f()()===f)+''", "true"],
    ["var f=function self(){return eval('self')};(f()===f)+''", "true"],
    ["var f=function self(){eval('self=3');return self};(f()===f)+''", "true"],
    ["var f=function self(){return delete self};f()+''", "false"],
    ["var o={x:function original(){}};o.x.name", "original"],
    ["var o={[Symbol.iterator]:function original(){}};o[Symbol.iterator].name", "original"],
    [
        "var f=function /*keep*/ named (a){ return named; };f.toString()",
        "function /*keep*/ named (a){ return named; }",
    ],
    [
        "var f=function Named(x){this.x=x;this.c=new.target};var o=new f(7);o.x+':'+(o.c===f)+':'+(Object.getPrototypeOf(o)===f.prototype)",
        "7:true:true",
    ],
    ["var f=function eval(){return 1};f.name+':'+f()", "eval:1"],
    ["var f=function arguments(){return arguments[0]};f(7)+':'+f.name", "7:arguments"],
    [
        "var f=function self(){return self},g=function self(){return self};(f()===f)+':'+(g()===g)+':'+(f!==g)",
        "true:true:true",
    ],
    [
        "function make(){return function self(){return self}}var f=make(),g=make();(f()===f)+':'+(g()===g)+':'+(f!==g)",
        "true:true:true",
    ],
    ["var f=function self(){const x=1;try{x=2}catch(e){return e.name}};f()", "TypeError"],
]) {
    run(text, expected);
}
for (const text of [
    "(function eval(){'use strict'})",
    "(function arguments(){'use strict'})",
    "'use strict';(function eval(){})",
    "'use strict';(function arguments(){})",
    "(function self(){'use strict';delete self})",
    "(function self(a,a){'use strict'})",
    "(function true(){})",
]) {
    const realm = new Realm((_line: string) => {}, "script");
    if (prepareBoundedScript({ id: "bad-named-function", text }, realm).kind === "ready") {
        throw new Error("accepted " + text);
    }
}
console.log("Named function expressions passed");
