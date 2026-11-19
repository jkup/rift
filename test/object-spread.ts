import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, expected: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "object-spread", text }, realm);
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
        "var a={x:1},o={...a};o.x+':'+(o!==a)+':'+(Object.getPrototypeOf(o)===Object.prototype)",
        "1:true:true",
    ],
    ["var o={x:0,...{x:1,y:2},x:3,...{y:4},};o.x+':'+o.y+':'+Object.keys(o).join(',')", "3:4:x,y"],
    ["Object.keys({...null,...undefined,...1,...true,...Symbol('x')}).length+''", "0"],
    [
        "var o={...'ab'};o[0]+o[1]+':'+Object.keys(o).join(',')+':'+typeof o.length",
        "ab:0,1:undefined",
    ],
    ["var o={...'😀'};o[0].charCodeAt(0)+':'+o[1].charCodeAt(0)", "55357:56832"],
    [
        "var s=Symbol('x'),a={x:1,[s]:2},o={...a};o[s]+':'+(Object.getOwnPropertySymbols(o)[0]===s)",
        "2:true",
    ],
    [
        "var a=Object.create({inherited:1});a.own=2;Object.defineProperty(a,'hidden',{value:3});Object.keys({...a}).join(',')",
        "own",
    ],
    [
        "var n=0,a={get x(){n++;return this===a?7:0}},o={...a},d=Object.getOwnPropertyDescriptor(o,'x');o.x+':'+n+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+typeof d.get",
        "7:1:true:true:true:undefined",
    ],
    ["var a={get x(){delete this.y;this.z=3;return 1},y:2},o={...a};Object.keys(o).join(',')", "x"],
    [
        "var a={get x(){Object.defineProperty(this,'y',{enumerable:false});return 1},y:2};Object.keys({...a}).join(',')",
        "x",
    ],
    ["var a={get x(){this.y=7;return 1},y:2};({...a}).y+''", "7"],
    [
        "var log='',s=Symbol(),a={get a(){log+='a';return 1},get 2(){log+='2';return 2},get 1(){log+='1';return 3},get [s](){log+='s';return 4}};var o={...a};log",
        "12as",
    ],
    [
        "var log='',a={get x(){log+='g';return 1}};var o={a:(log+='a',1),...(log+='s',a),b:(log+='b',2)};log",
        "asgb",
    ],
    [
        "var marker={},log='';try{var o={...{get x(){throw marker}},b:(log+='bad',1)}}catch(e){log=e===marker?'same':'bad'}log",
        "same",
    ],
    ["var p={set x(v){throw 8}},o={__proto__:p,...{x:7}};o.x+':'+Object.hasOwn(o,'x')", "7:true"],
    [
        "var o={...{['__proto__']:7}};o.__proto__+':'+(Object.getPrototypeOf(o)===Object.prototype)",
        "7:true",
    ],
    [
        "var o={__proto__:null,...{['__proto__']:8}};o.__proto__+':'+(Object.getPrototypeOf(o)===null)",
        "8:true",
    ],
    [
        "var s=Symbol(),a={x:1,[s]:2},x,r;({x,...r}=a);x+':'+r[s]+':'+Object.hasOwn(r,'x')",
        "1:2:false",
    ],
    [
        "var s=Symbol(),a={x:1,[s]:2},v,r;({[s]:v,...r}=a);v+':'+r.x+':'+Object.getOwnPropertySymbols(r).length",
        "2:1:0",
    ],
    ["var o={...(function(){return {x:7}})()};o.x+''", "7"],
    ["var o={...[1,,3]};Object.keys(o).join(',')+':'+o[2]", "0,2:3"],
    ["var o={...(true?{x:1}:{x:2})};o.x+''", "1"],
]) {
    run(text, expected);
}
for (const text of ["({...})", "({...a,b}=x)", "({...a,}=x)", "({...a=1}=x)"]) {
    if (
        prepareBoundedScript(
            { id: "bad-object-spread", text },
            new Realm((_line: string) => {}, "script"),
        ).kind === "ready"
    ) {
        throw new Error("accepted " + text);
    }
}
console.log("Object spread passed");
