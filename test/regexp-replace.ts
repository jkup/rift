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
    const prepared = prepareBoundedScript({ id: "regexp-replace", text }, realm);
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
    { source: "'banana'.replace('an','X')", expected: "bXana" },
    { source: "'a.b'.replace('.','X')", expected: "aXb" },
    { source: "'abc'.replace('','-')", expected: "-abc" },
    { source: "'abc'.replace('z',{toString(){return 'X'}})", expected: "abc" },
    { source: "'abc'.replace('b',\"$$|$&|$`|$'|$1\")", expected: "a$|b|a|c|$1c" },
    {
        source: "'xaby'.replace(RegExp('(a)(b)'),'$2$1-$01-$10-$99-$00-$0')",
        expected: "xba-a-a0-$99-$00-$0y",
    },
    { source: "'b'.replace(RegExp('(a)?b'),'[$1]')", expected: "[]" },
    { source: "'a'.replace(RegExp('a'),'$<x>-$<unfinished-$')", expected: "$<x>-$<unfinished-$" },
    { source: "'abc'.replace('b',()=>undefined)", expected: "aundefinedc" },
    { source: "'aba'.replace(RegExp('a'),'X')", expected: "Xba" },
    {
        source: "var r=RegExp('a','g');r.lastIndex=9;var out='aba'.replace(r,'X');out+':'+r.lastIndex",
        expected: "XbX:0",
    },
    {
        source: "var r=RegExp('a','y');r.lastIndex=1;var out='ba'.replace(r,'X');out+':'+r.lastIndex",
        expected: "bX:2",
    },
    {
        source: "var r=RegExp('a');r.lastIndex=9;var out='a'.replace(r,'X');out+':'+r.lastIndex",
        expected: "X:9",
    },
    { source: "'ab'.replace(RegExp('','g'),'-')", expected: "-a-b-" },
    { source: "'😀'.replace(RegExp('','g'),'-')", expected: "-\ud83d-\ude00-" },
    {
        source: "'xab'.replace(RegExp('(a)(b)'),function(m,a,b,i,s){'use strict';return (this===undefined)+':'+m+':'+a+':'+b+':'+i+':'+s+':'+arguments.length})",
        expected: "xtrue:ab:a:b:1:xab:5",
    },
    {
        source: "'abc'.replace('b',function(m,i,s){'use strict';return (this===undefined)+':'+m+':'+i+':'+s+':'+arguments.length})",
        expected: "atrue:b:1:abc:3c",
    },
    {
        source: "var order='',p={toString(){order+='p';return 'z'}},r={toString(){order+='r';return 'x'}};String.prototype.replace.call({toString(){order+='s';return 'a'}},p,r);order",
        expected: "spr",
    },
    { source: "var n=0;'a'.replace('z',()=>{n++});String(n)", expected: "0" },
    {
        source: "var order='',r={get flags(){order+='f';return ''},exec(){order+='e';return null}};RegExp.prototype[Symbol.replace].call(r,{toString(){order+='s';return 'a'}},{toString(){order+='r';return 'x'}});order",
        expected: "srfe",
    },
    {
        source: "var order='',n=0,r={flags:'g',exec(){order+='e';return n++<2?{0:'a',index:n-1,length:1}:null}};var out=RegExp.prototype[Symbol.replace].call(r,'aa',()=>{order+='r';return 'X'});out+':'+order",
        expected: "XX:eeerr",
    },
    {
        source: "var order='',result={get length(){order+='l';return 2},get 0(){order+='m';return 'a'},get index(){order+='i';return 0},get 1(){order+='c';return 7},get groups(){order+='g';return undefined}},r={flags:'',exec(){order+='e';return result}};RegExp.prototype[Symbol.replace].call(r,'a',()=>{order+='r';return 'X'})+':'+order",
        expected: "X:elmicgr",
    },
    {
        source: "var r={flags:'',exec(){return {0:'a',index:0,length:2,1:undefined,groups:{x:4}}}};RegExp.prototype[Symbol.replace].call(r,'a',function(m,c,i,s,g){return c+':'+g.x+':'+arguments.length})",
        expected: "undefined:4:5",
    },
    {
        source: "var r={flags:'',exec(){return {0:'a',index:0,length:1,groups:{x:4}}}};RegExp.prototype[Symbol.replace].call(r,'a','$<x>-$<missing>-$<>')",
        expected: "4--",
    },
    {
        source: "var order='',r={flags:'',exec(){return {0:'a',index:0,length:1,groups:{get x(){order+='g';return {toString(){order+='s';return 'X'}}}}}}};RegExp.prototype[Symbol.replace].call(r,'a','$<x>$<x>')+':'+order",
        expected: "XX:gsgs",
    },
    {
        source: "var r={flags:'',exec(){return {0:'a',index:0,length:1,groups:null}}};RegExp.prototype[Symbol.replace].call(r,'a',function(m,i,s,g){return String(g===null)})",
        expected: "true",
    },
    {
        source: "var p={},input={},replacement={};p[Symbol.replace]=function(s,r){return (this===p)+':'+(s===input)+':'+(r===replacement)+':'+arguments.length};String.prototype.replace.call(input,p,replacement)",
        expected: "true:true:true:2",
    },
    {
        source: "String.prototype[Symbol.replace]=function(s,r){'use strict';return typeof this+':'+this+':'+s+':'+r};'abc'.replace(Object('b'),'X')",
        expected: "object:b:abc:X",
    },
    {
        source: "var count=0,n=0,r={flags:'g',exec(){return n++<2?{0:'ab',index:0,length:1}:null}};RegExp.prototype[Symbol.replace].call(r,'abc',()=>{count++;return 'X'})+':'+count",
        expected: "Xc:2",
    },
    {
        source: "var r={flags:'',exec(){return {0:'too long',index:2,length:1}}};RegExp.prototype[Symbol.replace].call(r,'abc',\"$&:$'\")",
        expected: "abtoo long:",
    },
    {
        source: "var r={flags:'',exec(){return {0:'a',index:Infinity,length:1}}};RegExp.prototype[Symbol.replace].call(r,'abc','X')",
        expected: "abcX",
    },
    {
        source: "var r={flags:'',exec(){return {0:'a',index:-2,length:1}}};RegExp.prototype[Symbol.replace].call(r,'abc','X')",
        expected: "Xbc",
    },
    {
        source: "RegExp.prototype[Symbol.replace].name+':'+RegExp.prototype[Symbol.replace].length+':'+String.prototype.replace.length+':'+Object.getOwnPropertyDescriptor(RegExp.prototype,Symbol.replace).enumerable",
        expected: "[Symbol.replace]:2:2:false",
    },
];
for (const test of cases) {
    string(test.source, test.expected);
}
for (const source of [
    "String.prototype.replace.call(null,'a','b')",
    "var p={};p[Symbol.replace]=3;'a'.replace(p,'x')",
    "'a'.replace('z',Symbol())",
    "RegExp.prototype[Symbol.replace].call(null,'a','x')",
    "RegExp.prototype[Symbol.replace].call({flags:'',exec(){return 1}},'a','x')",
    "RegExp.prototype[Symbol.replace].call({flags:'',exec(){return {0:'a',length:1,index:0,groups:null}}},'a','x')",
    "var r=RegExp('a','g');Object.defineProperty(r,'lastIndex',{writable:false});'a'.replace(r,'x')",
    "'a'.replace('a',()=>Symbol())",
]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
for (const source of [
    "'a'.replace('a',()=>{throw 7})",
    "RegExp.prototype[Symbol.replace].call({flags:'',exec(){throw 7}},'a','x')",
    "RegExp.prototype[Symbol.replace].call({flags:'',exec(){return {0:'a',length:1,index:0,groups:{get x(){throw 7}}}}},'a','$<x>')",
]) {
    string("try{" + source + ";'wrong'}catch(e){String(e)}", "7");
}
for (const flags of ["gu", "gv"]) {
    string(
        "var r={flags:'" +
            flags +
            "',exec(s){return this.lastIndex>s.length?null:{0:'',length:1,index:this.lastIndex}}};RegExp.prototype[Symbol.replace].call(r,'😀','-')",
        "-😀-",
    );
}
for (const source of [
    "var r={flags:'g',exec(){return {0:'x'}}};RegExp.prototype[Symbol.replace].call(r,'a','x')",
    "var r={flags:'',exec(){return {0:'a',length:Infinity,index:0}}};RegExp.prototype[Symbol.replace].call(r,'a','x')",
    "'" + "a".repeat(100) + "'.replace('a',\"" + "$'".repeat(20) + '")',
]) {
    const realm = fresh(),
        prepared = prepareBoundedScript(
            { id: "regexp-replace-budget", text: "try{" + source + "}catch(e){'caught'}" },
            realm,
        );
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 300, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "replacement work and expanded output bounded",
    );
}
console.log("RegExp replacement passed");
