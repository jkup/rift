import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, expected: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "object-prototype-literal", text }, realm);
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
        "var o={__proto__:null,x:1};(Object.getPrototypeOf(o)===null)+':'+Object.hasOwn(o,'__proto__')+':'+o.x",
        "true:false:1",
    ],
    [
        "var p={x:7},o={__proto__:p};(Object.getPrototypeOf(o)===p)+':'+o.x+':'+Object.keys(o).length",
        "true:7:0",
    ],
    ["var o={'__proto__':null};(Object.getPrototypeOf(o)===null)+''", "true"],
    [
        "var n=0,p={toString(){n++;return 'bad'},valueOf(){n++;return 1}},o={__proto__:p};(Object.getPrototypeOf(o)===p)+':'+n",
        "true:0",
    ],
    ["var o={__proto__:function(){}};Object.getPrototypeOf(o).name", ""],
    ["var o={__proto__:()=>1};Object.getPrototypeOf(o).name", ""],
    ["var o={__proto__:class{}};Object.getPrototypeOf(o).name", ""],
    [
        "var log='',p={};var o={a:(log+='a',1),__proto__:(log+='p',p),b:(log+='b',2)};log+':'+(Object.getPrototypeOf(o)===p)",
        "apb:true",
    ],
    [
        "var marker={},log='';try{var o={__proto__:(function(){throw marker})(),x:(log+='bad',1)}}catch(e){log=e===marker?'same':'bad'}log",
        "same",
    ],
    [
        "var o={__proto__:null,['__proto__']:7};(Object.getPrototypeOf(o)===null)+':'+o.__proto__",
        "true:7",
    ],
    [
        "var o={['__proto__']:7,__proto__:null};(Object.getPrototypeOf(o)===null)+':'+o.__proto__",
        "true:7",
    ],
    [
        "var __proto__=8,o={__proto__:null,__proto__};(Object.getPrototypeOf(o)===null)+':'+o.__proto__",
        "true:8",
    ],
    [
        "var o={__proto__:null,__proto__(){return 9}};(Object.getPrototypeOf(o)===null)+':'+o.__proto__()",
        "true:9",
    ],
    [
        "var o={get __proto__(){return 3},__proto__:null};(Object.getPrototypeOf(o)===null)+':'+o.__proto__",
        "true:3",
    ],
    ["var a,b;({__proto__:a,__proto__:b}={['__proto__']:7});a+':'+b", "7:7"],
    ["var o={__proto__:{x:8},m(){return super.x}};o.m()+''", "8"],
    ["var o={__proto__:{set x(v){throw 9}},x:7};o.x+''", "7"],
]) {
    run(text, expected);
}
for (const value of ["undefined", "false", "true", "0", "1", "'x'", "Symbol('x')"]) {
    run(
        "var o={__proto__:" +
            value +
            "};(Object.getPrototypeOf(o)===Object.prototype)+':'+Object.hasOwn(o,'__proto__')",
        "true:false",
    );
}
for (const text of [
    "({__proto__:null,__proto__:null})",
    "({'__proto__':1,__proto__:2})",
    "({__proto__:0,['__proto__']:1,__proto__:2})",
    "if(false){({__proto__:null,__proto__:null})}",
]) {
    if (
        prepareBoundedScript(
            { id: "duplicate-prototype", text },
            new Realm((_line: string) => {}, "script"),
        ).kind === "ready"
    ) {
        throw new Error("accepted duplicate " + text);
    }
}
console.log("Object prototype literals passed");
