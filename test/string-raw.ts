import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function string(text: string, expected: string): void {
    const prepared = prepareBoundedScript({ id: "string-raw", text }, fresh());
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (
        result.type !== "normal" ||
        result.value.kind !== "string" ||
        result.value.value !== expected
    ) {
        throw new Error(text + " expected " + expected);
    }
}
const cases: { source: string; expected: string }[] = [
    { source: "String.raw({raw:['a','b','c']},1,2)", expected: "a1b2c" },
    { source: "String.raw({raw:['a','b','c']},1)", expected: "a1bc" },
    { source: "String.raw({raw:['a','b']},undefined)", expected: "aundefinedb" },
    { source: "String.raw({raw:['a']},Symbol())", expected: "a" },
    { source: "String.raw({raw:[]},Symbol())", expected: "" },
    { source: "String.raw({raw:'abc'},1,2)", expected: "a1b2c" },
    { source: "String.raw({raw:3})", expected: "" },
    { source: "String.raw({raw:{0:'a',length:1.9}},7)", expected: "a" },
    { source: "String.raw({raw:{length:-1}})", expected: "" },
    { source: "String.raw({raw:{0:'a',length:2}})", expected: "aundefined" },
    { source: "var r=Object.create({0:'a'});r.length=1;String.raw({raw:r})", expected: "a" },
    { source: "String.raw({raw:['\\\\n','\\\\t']},'😀')", expected: "\\n😀\\t" },
    {
        source: "var s=String.raw({raw:['\\ud800','\\udc00']});s.length+':'+s.charCodeAt(0)+':'+s.charCodeAt(1)",
        expected: "2:55296:56320",
    },
    { source: "String.raw.call(null,{raw:['a','b']},3)", expected: "a3b" },
    {
        source: "var order='',raw={get length(){order+='l';return {valueOf(){order+='n';return 2}}},get 0(){order+='a';return {toString(){order+='A';return 'a'}}},get 1(){order+='b';return {toString(){order+='B';return 'b'}}}},o={get raw(){order+='r';return raw}},v={toString(){order+='s';return 'x'}};String.raw(o,v)+':'+order",
        expected: "axb:rlnaAsbB",
    },
    {
        source: "var raw=['a','b'],v={toString(){raw[1]='z';raw.length=3;return 'x'}};String.raw({raw:raw},v,'ignored')",
        expected: "axz",
    },
    {
        source: "var order='',raw={length:0,get 0(){order+='bad'}};String.raw({raw:raw},{toString(){order+='bad'}})+':'+order",
        expected: ":",
    },
    {
        source: "var order='',raw={length:2,get 0(){throw 7},get 1(){order+='bad'}},r='';try{String.raw({raw:raw},{toString(){order+='bad'}})}catch(e){r=String(e)}r+':'+order",
        expected: "7:",
    },
    {
        source: "var order='',raw={length:2,0:'a',get 1(){order+='bad'}},r='';try{String.raw({raw:raw},{toString(){throw 8}})}catch(e){r=String(e)}r+':'+order",
        expected: "8:",
    },
    {
        source: "var r='';try{String.raw({get raw(){throw 7}})}catch(e){r=String(e)}r",
        expected: "7",
    },
    {
        source: "var d=Object.getOwnPropertyDescriptor(String,'raw'),r='';try{new String.raw()}catch(e){r=e.name}String.raw.name+':'+String.raw.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r",
        expected: "raw:1:true:false:true:TypeError",
    },
];
for (const c of cases) {
    string(c.source, c.expected);
}
for (const source of [
    "String.raw()",
    "String.raw(null)",
    "String.raw({})",
    "String.raw({raw:null})",
    "String.raw({raw:[Symbol()]})",
    "String.raw({raw:['a','b']},Symbol())",
]) {
    string("var r='';try{" + source + "}catch(e){r=e.name}r", "TypeError");
}
for (const source of [
    "String.raw({raw:{length:Infinity}})",
    "var raw={length:Infinity,get 0(){return ''}};String.raw({raw:raw})",
]) {
    const prepared = prepareBoundedScript({ id: "raw-budget", text: source }, fresh());
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 200, maxCalls: 32 }),
        prepared.record,
    ).completion;
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") {
        throw new Error("raw budget");
    }
}
console.log("String raw passed");
