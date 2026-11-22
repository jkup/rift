import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "regexp-match-search", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === expected,
        text + " expected " + expected,
    );
}
const cases: { source: string; expected: string }[] = [
    {
        source: "var m='hello'.match(RegExp('(l+)'));m[0]+':'+m[1]+':'+m.index+':'+m.input",
        expected: "ll:ll:2:hello",
    },
    {
        source: "var r=RegExp('[0-9]+','g');r.lastIndex=99;var m='a12b34'.match(r);m.join(',')+':'+r.lastIndex+':'+Object.keys(m).join(',')",
        expected: "12,34:0:0,1",
    },
    {
        source: "String('abc'.match(RegExp('z','g'))===null)+':'+('abc'.match(RegExp('z'))===null)",
        expected: "true:true",
    },
    {
        source: "var r=RegExp('','g');String('ab'.match(r).length)+':'+r.lastIndex",
        expected: "3:0",
    },
    { source: "String('😀'.match(RegExp('','g')).length)", expected: "3" },
    {
        source: "'abc'.search('b')+':'+('abc'.search('z'))+':'+('abc'.search())+':'+('abc'.match()[0])",
        expected: "1:-1:0:",
    },
    { source: "'ab'.match('(a)')[1]+':'+('xab'.search('a.'))", expected: "a:1" },
    {
        source: "var r=RegExp('a','g');r.lastIndex=9;String('ba'.search(r))+':'+r.lastIndex",
        expected: "1:9",
    },
    {
        source: "var r=RegExp('a','y');r.lastIndex=1;String('ba'.search(r))+':'+r.lastIndex",
        expected: "-1:1",
    },
    {
        source: "var r=RegExp('a');r.lastIndex=-0;String('a'.search(r))+':'+(1/r.lastIndex)",
        expected: "0:-Infinity",
    },
    {
        source: "var r=RegExp('a'),token={valueOf(){throw 7}};r.lastIndex=token;String('a'.search(r))+':'+(r.lastIndex===token)",
        expected: "0:true",
    },
    {
        source: "var r=RegExp('a');Object.defineProperty(r,'lastIndex',{writable:false});String('a'.search(r))",
        expected: "0",
    },
    {
        source: "var r=RegExp('a');r.lastIndex=5;r.exec=()=>{throw 7};var out='';try{'a'.search(r)}catch(e){out+=e}out+':'+r.lastIndex",
        expected: "7:0",
    },
    {
        source: "var out='',r={lastIndex:3,exec(){this.lastIndex=8;return {get index(){out+='i'+r.lastIndex;return 'position'}}}};RegExp.prototype[Symbol.search].call(r,'x')+':'+out+':'+r.lastIndex",
        expected: "position:i3:3",
    },
    {
        source: "var order='',r={get flags(){order+='f';return {toString(){order+='c';return ''}}},get global(){throw 7},exec(s){order+='e'+s;return {token:1}}};var result=RegExp.prototype[Symbol.match].call(r,{toString(){order+='s';return 'x'}});String(result.token)+':'+order",
        expected: "1:sfcex",
    },
    {
        source: "var n=0,r={flags:'g',exec(){n++;return n===1?{0:{toString(){return 'converted'}}}:null}};RegExp.prototype[Symbol.match].call(r,'x').join(',')+':'+n",
        expected: "converted:2",
    },
    {
        source: "var order='',input={toString(){throw 7}},p={};p[Symbol.match]=function(s){order+=(this===p)+':'+(s===input)+':'+arguments.length;return 8};String(String.prototype.match.call(input,p))+':'+order",
        expected: "8:true:true:1",
    },
    {
        source: "var input={toString(){throw 7}},p={};p[Symbol.search]=function(s){return this===p&&s===input};String(String.prototype.search.call(input,p))",
        expected: "true",
    },
    {
        source: "String.prototype[Symbol.match]=function(s){'use strict';return typeof this+':'+this+':'+s};'input'.match(Object('pattern'))",
        expected: "object:pattern:input",
    },
    {
        source: "var order='',p={toString(){order+='p';return 'a'}};Object.defineProperty(p,Symbol.match,{get(){order+='m';return null}});var input={toString(){order+='s';return 'a'}};String.prototype.match.call(input,p)[0]+':'+order",
        expected: "a:msp",
    },
    { source: "var r=RegExp('a');r[Symbol.match]=null;'/a/'.match(r)[0]", expected: "/a/" },
    {
        source: "var R=RegExp;RegExp=function(){throw 7};'abc'.match('b')[0]+':'+('abc'.search('c'))",
        expected: "b:2",
    },
    {
        source: "RegExp.prototype[Symbol.match]=function(s){return this.source+':'+s};'abc'.match('b')",
        expected: "b:abc",
    },
    {
        source: "var order='',p={};Object.defineProperty(p,Symbol.match,{get(){order+='wrong';return ()=>0}});try{String.prototype.match.call(null,p)}catch(e){order+=e instanceof TypeError}order",
        expected: "true",
    },
    {
        source: "var order='',r={get flags(){order+='wrong'}};try{RegExp.prototype[Symbol.match].call(r,{toString(){throw 7}})}catch(e){order+=e}order",
        expected: "7",
    },
    {
        source: "RegExp.prototype[Symbol.match].name+':'+RegExp.prototype[Symbol.search].length+':'+String.prototype.match.length+':'+String.prototype.search.length+':'+Object.getOwnPropertyDescriptor(RegExp.prototype,Symbol.match).enumerable",
        expected: "[Symbol.match]:1:1:1:false",
    },
    {
        source: "RegExp.prototype[Symbol.match].toString()",
        expected: "function [Symbol.match]() { [native code] }",
    },
];
for (const test of cases) {
    string(test.source, test.expected);
}
for (const flags of ["gu", "gv"]) {
    string(
        "var seen='',r={flags:'" +
            flags +
            "',exec(s){seen+=this.lastIndex+',';return this.lastIndex>s.length?null:{0:''}}};var m=RegExp.prototype[Symbol.match].call(r,'😀');m.length+':'+seen",
        "2:0,2,3,",
    );
}
for (const source of [
    "RegExp.prototype[Symbol.match].call(1,'a')",
    "RegExp.prototype[Symbol.search].call(null,'a')",
    "var p={};p[Symbol.match]=1;'a'.match(p)",
    "var p={};p[Symbol.search]=1;'a'.search(p)",
    "RegExp.prototype[Symbol.match].call({flags:Symbol()},'a')",
    "RegExp.prototype[Symbol.match].call({flags:'g',exec(){return 1}},'a')",
    "var r=RegExp('a','g');Object.defineProperty(r,'lastIndex',{writable:false});'a'.match(r)",
    "var r=RegExp('a');r.lastIndex=-0;Object.defineProperty(r,'lastIndex',{writable:false});'a'.search(r)",
]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
string(
    "var order='',stored=NaN,r={get lastIndex(){return stored},set lastIndex(v){order+='s';stored=v},exec(){stored=NaN;return null}};RegExp.prototype[Symbol.search].call(r,'a');order",
    "s",
);
string(
    "var order='',stored=2,r={get lastIndex(){return stored},set lastIndex(v){order+=v;if(v===2)throw 7;stored=v},exec(){return {get index(){order+='wrong'}}}};try{RegExp.prototype[Symbol.search].call(r,'a')}catch(e){order+=e}order",
    "027",
);
{
    const realm = fresh(),
        foreign = fresh(),
        descriptor = foreign.globalObject.getOwnProperty("RegExp");
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("foreign constructor");
    }
    realm.defineScriptGlobal("ForeignRegExp", { value: descriptor.value });
    realm.defineScriptGlobal("foreignArrayPrototype", {
        value: { kind: "object", object: foreign.arrayPrototype },
    });
    string(
        "var r=RegExp('a','g'),m=ForeignRegExp.prototype[Symbol.match].call(r,'aa');String(Object.getPrototypeOf(m)===foreignArrayPrototype)",
        "true",
        realm,
    );
}
{
    const realm = fresh(),
        prepared = prepareBoundedScript(
            {
                id: "regexp-match-budget",
                text: "var r={flags:'g',exec(){return {0:'x'}}};try{RegExp.prototype[Symbol.match].call(r,'a')}catch(e){'caught'}",
            },
            realm,
        );
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 200, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "nonprogressing custom exec bounded",
    );
}
console.log("RegExp match/search passed");
