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
    const prepared = prepareBoundedScript({ id: "regexp-construction", text }, realm);
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
        source: "var r=RegExp();r.toString()+':'+r.source+':'+r.flags+':'+r.lastIndex",
        expected: "/(?:)/:(?:)::0",
    },
    {
        source: "var r=new RegExp('a','ymisdg');r.toString()+':'+r.hasIndices+':'+r.global+':'+r.ignoreCase+':'+r.multiline+':'+r.dotAll+':'+r.sticky+':'+r.unicode+':'+r.unicodeSets",
        expected: "/a/dgimsy:true:true:true:true:true:true:false:false",
    },
    {
        source: "var r=RegExp('x','ig');r.lastIndex=4;var copy=new RegExp(r);String(RegExp(r)===r)+':'+(copy!==r)+':'+copy.toString()+':'+copy.lastIndex+':'+RegExp(r,'m').toString()",
        expected: "true:true:/x/gi:0:/x/m",
    },
    {
        source: "var r=RegExp('a','g');Object.defineProperty(r,'source',{get(){throw 1}});Object.defineProperty(r,'flags',{get(){throw 2}});new RegExp(r).toString()",
        expected: "/a/g",
    },
    {
        source: "var r=RegExp('a');r[Symbol.match]=false;String(RegExp(r)!==r)+':'+new RegExp(r).source",
        expected: "true:a",
    },
    {
        source: "var fake={constructor:RegExp};fake[Symbol.match]=true;String(RegExp(fake)===fake)",
        expected: "true",
    },
    {
        source: "var fake={source:'a',flags:'mi'};fake[Symbol.match]=true;new RegExp(fake).toString()",
        expected: "/a/im",
    },
    {
        source: "var fake={source:'a',get flags(){throw 7}};fake[Symbol.match]=true;new RegExp(fake,'g').toString()",
        expected: "/a/g",
    },
    {
        source: "var order='',p={get source(){order+='s';return {toString(){order+='p';return 'a'}}},get flags(){order+='f';return {toString(){order+='o';return 'g'}}}};Object.defineProperty(p,Symbol.match,{get(){order+='m';return true}});var target=(function(){}).bind(null);Object.defineProperty(target,'prototype',{get(){order+='t';return {}}});Reflect.construct(RegExp,[p],target);order",
        expected: "msftpo",
    },
    {
        source: "var order='',p={toString(){order+='p';return '['}},f={toString(){order+='f';throw 7}};try{RegExp(p,f)}catch(e){order+=e}order",
        expected: "pf7",
    },
    {
        source: "var order='',target=(function(){}).bind(null);Object.defineProperty(target,'prototype',{get(){order+='t';throw 7}});try{Reflect.construct(RegExp,[{toString(){order+='wrong'}}],target)}catch(e){order+=e}order",
        expected: "t7",
    },
    {
        source: "class R extends RegExp{}var r=new R('a','g');String(r instanceof R)+':'+(r instanceof RegExp)+':'+r.toString()+':'+(R[Symbol.species]===R)",
        expected: "true:true:/a/g:true",
    },
    {
        source: "var r=RegExp('a'),d=Object.getOwnPropertyDescriptor(r,'lastIndex');d.writable+':'+d.enumerable+':'+d.configurable+':'+Object.keys(r).length",
        expected: "true:false:false:0",
    },
    {
        source: "RegExp.name+':'+RegExp.length+':'+RegExp.prototype.toString.length+':'+(RegExp[Symbol.species]===RegExp)+':'+RegExp.prototype.toString()+':'+RegExp.prototype.global+':'+Object.prototype.toString.call(RegExp.prototype)",
        expected: "RegExp:2:0:true:/(?:)/:undefined:[object Object]",
    },
    {
        source: "var r=RegExp('a');Object.setPrototypeOf(r,null);Object.prototype.toString.call(r)+':'+Object.prototype.toString.call(Object.create(RegExp.prototype))",
        expected: "[object RegExp]:[object Object]",
    },
    {
        source: "var order='',o={};for(let key of ['hasIndices','global','ignoreCase','multiline','dotAll','unicode','unicodeSets','sticky']){Object.defineProperty(o,key,{get(){order+=key+',';return true}})}var flags=Object.getOwnPropertyDescriptor(RegExp.prototype,'flags').get.call(o);flags+':'+order",
        expected:
            "dgimsuvy:hasIndices,global,ignoreCase,multiline,dotAll,unicode,unicodeSets,sticky,",
    },
    {
        source: "var order='',o={get source(){order+='s';return {toString(){order+='p';return 'x'}}},get flags(){order+='f';return {toString(){order+='o';return 'q'}}}};RegExp.prototype.toString.call(o)+':'+order",
        expected: "/x/q:spfo",
    },
    { source: "RegExp.prototype.toString.call({})", expected: "/undefined/undefined" },
    {
        source: "var r=RegExp('a');r[Symbol.match]=false;r.toString=()=> 'a';String('abc'.includes(r))+':'+String('abc'.startsWith(r))+':'+String('ba'.endsWith(r))",
        expected: "true:true:true",
    },
    {
        source: "RegExp(null).source+':'+RegExp(12).source+':'+RegExp(undefined,undefined).source",
        expected: "null:12:(?:)",
    },
];
for (const test of cases) {
    string(test.source, test.expected);
}
string("RegExp('(?=a)').source", "(?=a)");
for (const source of ["RegExp('[')", "RegExp('a','gg')", "RegExp('a','q')", "RegExp('a','uv')"]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof SyntaxError)}", "true");
}
for (const source of [
    "RegExp(Symbol())",
    "RegExp('a',Symbol())",
    "RegExp.prototype.toString.call(null)",
    "Object.getOwnPropertyDescriptor(RegExp.prototype,'source').get.call({})",
    "Object.getOwnPropertyDescriptor(RegExp.prototype,'global').get.call({})",
    "Object.getOwnPropertyDescriptor(RegExp.prototype,'flags').get.call(1)",
    "'abc'.includes(RegExp('a'))",
    "'abc'.startsWith(RegExp('a'))",
    "'abc'.endsWith(RegExp('a'))",
]) {
    string("try{" + source + ";'wrong'}catch(e){String(e instanceof TypeError)}", "true");
}
for (const source of ["RegExp('a','u')", "RegExp('a','v')"]) {
    const realm = fresh(),
        prepared = prepareBoundedScript(
            { id: "regexp-unsupported", text: "try{" + source + "}catch(e){'caught'}" },
            realm,
        );
    if (prepared.kind !== "ready") {
        throw new Error("unsupported prepare");
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (source === "RegExp('a','u')") {
        check(
            result.type === "normal" && result.value.kind === "object",
            "retained Unicode constructor executes",
        );
    } else {
        check(
            result.type === "throw" &&
                result.origin.kind === "unsupported-operation" &&
                result.origin.capabilityCode === "runtime.regexp-pattern",
            "unsupported remains explicit: " + source,
        );
    }
}
{
    const realm = fresh(),
        foreign = fresh(),
        constructor = foreign.globalObject.getOwnProperty("RegExp");
    if (constructor === undefined || constructor.kind !== "data") {
        throw new Error("foreign constructor");
    }
    realm.defineScriptGlobal("ForeignRegExp", { value: constructor.value });
    realm.defineScriptGlobal("ForeignTypeError", {
        value: { kind: "object", object: foreign.getErrorConstructor("TypeError") },
    });
    string(
        "var r=ForeignRegExp('a');String(Object.getPrototypeOf(r)===ForeignRegExp.prototype)+':'+(r instanceof RegExp)",
        "true:false",
        realm,
    );
    string(
        "var target=(function(){}).bind(null);target.prototype=0;var r=Reflect.construct(ForeignRegExp,['a'],target);String(Object.getPrototypeOf(r)===RegExp.prototype)",
        "true",
        realm,
    );
    string(
        "var getter=Object.getOwnPropertyDescriptor(ForeignRegExp.prototype,'source').get;try{getter.call(RegExp.prototype)}catch(e){String(e instanceof ForeignTypeError)+':'+(e instanceof TypeError)}",
        "true:false",
        realm,
    );
}
for (const source of [
    "RegExp('a{1000000000}')",
    "RegExp('" + "a".repeat(1000) + "')",
    "RegExp('[a-z]','i')",
]) {
    const realm = fresh(),
        prepared = prepareBoundedScript({ id: "regexp-budget", text: source }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 25, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "constructor budget: " + source,
    );
}
string("RegExp('a/b').source", "a\\/b");
string("RegExp('[/]').source", "[/]");
string("RegExp('a\\nb\\rc\\u2028d\\u2029').source", "a\\nb\\rc\\u2028d\\u2029");
string("RegExp('\\\\/').source", "\\/");
string("RegExp('\\\\\\n').source", "\\n");

string("RegExp('(a)\\\\1').source", "(a)\\1");
for (const [input, expected] of [
    ["", ""],
    ["abc", "\\x61bc"],
    ["1ab", "\\x31ab"],
    ["Ab", "\\x41b"],
    ["_abc", "_abc"],
    ["^$\\.*+?()[]{}|/", "\\^\\$\\\\\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|\\/"],
    [
        ",-=<>#&!%:;@~'\"`",
        "\\x2c\\x2d\\x3d\\x3c\\x3e\\x23\\x26\\x21\\x25\\x3a\\x3b\\x40\\x7e\\x27\\x22\\x60",
    ],
    ["\t\n\v\f\r", "\\t\\n\\v\\f\\r"],
    [" \u00a0\u2028\u2029\ufeff", "\\x20\\xa0\\u2028\\u2029\\ufeff"],
    ["\ud800x\udc00", "\\ud800x\\udc00"],
    ["\ud83d\ude00", "\ud83d\ude00"],
    ["\0\u0085\u180eé", "\0\u0085\u180eé"],
]) {
    const realm = fresh();
    realm.defineScriptGlobal("input", { value: { kind: "string", value: input } });
    string("RegExp.escape(input)", expected, realm);
}
string(
    "let d=Object.getOwnPropertyDescriptor(RegExp,'escape');[RegExp.escape.name,RegExp.escape.length,d.writable,d.enumerable,d.configurable].join(',')",
    "escape,1,true,false,true",
);
string(
    "let n=0;for(let x of [undefined,null,1,true,1n,Symbol(),{},new String('x')]){try{RegExp.escape(x)}catch(e){if(e instanceof TypeError)n++}}String(n)",
    "8",
);
string(
    "let called=false;try{RegExp.escape({toString(){called=true;return 'a'}})}catch(e){}String(called)",
    "false",
);
string(
    "let ok=false;try{new RegExp.escape('a')}catch(e){ok=e instanceof TypeError}String(ok)",
    "true",
);
string(
    "let text='a.b[c]- /';String(new RegExp('^'+RegExp.escape(text)+'$','u').test(text))",
    "true",
);
{
    const owner = fresh(),
        caller = fresh();
    const constructor = owner.globalObject.getOwnProperty("RegExp");
    if (
        constructor === undefined ||
        constructor.kind !== "data" ||
        constructor.value.kind !== "object"
    ) {
        throw new Error("RegExp constructor");
    }
    const escape = constructor.value.object.getOwnProperty("escape");
    if (escape === undefined || escape.kind !== "data") {
        throw new Error("RegExp.escape");
    }
    caller.defineScriptGlobal("escape", { value: escape.value });
    caller.defineScriptGlobal("ownerTypeError", {
        value: { kind: "object", object: owner.getErrorPrototype("TypeError") },
    });
    string(
        "try{escape(1)}catch(e){String(Object.getPrototypeOf(e)===ownerTypeError)}",
        "true",
        caller,
    );
}
{
    const realm = fresh();
    realm.defineScriptGlobal("input", { value: { kind: "string", value: "-".repeat(10000) } });
    const prepared = prepareBoundedScript(
        { id: "escape-budget", text: "try{RegExp.escape(input)}catch(e){'caught'}" },
        realm,
    );
    if (prepared.kind !== "ready") {
        throw new Error("escape budget prepare");
    }
    const result = evaluateScript(
        createScriptSession({ maxSteps: 1000, maxCalls: 32 }),
        prepared.record,
    ).completion;
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "bounded escape output",
    );
}
string(
    "let r=/old/g;r.lastIndex=9;let same=r.compile('new','i')===r;[same,r.source,r.flags,r.lastIndex,r.test('NEW')].join(':')",
    "true:new:i:0:true",
);
string(
    "let r=/a/g;r.lastIndex=3;Object.defineProperty(r,Symbol.match,{get(){throw 1}});Object.defineProperty(r,'flags',{get(){throw 2}});String(r.compile(r)===r)+':'+r.lastIndex+':'+r.test('a')",
    "true:0:true",
);
string(
    "let r=/old/g;r.lastIndex=9;let order='';try{r.compile({toString(){order+='p';return '['}},{toString(){order+='f';return 'i'}})}catch(e){order+=':'+(e instanceof SyntaxError)}[order,r.source,r.flags,r.lastIndex].join(':')",
    "pf:true:old:g:9",
);
string(
    "let r=/old/;Object.defineProperty(r,'lastIndex',{value:9,writable:false});let caught=false;try{r.compile('new','i')}catch(e){caught=e instanceof TypeError}[caught,r.source,r.flags,r.lastIndex,r.test('NEW')].join(':')",
    "true:new:i:9:true",
);
string(
    "let r=/old/;let touched=false;let caught=false;try{r.compile(/new/,{toString(){touched=true;return ''}})}catch(e){caught=e instanceof TypeError}[caught,touched,r.source].join(':')",
    "true:false:old",
);
string(
    "let r=/old/;let order='';r.compile({get [Symbol.match](){throw 1},toString(){order+='p';return 'new'}},{toString(){order+='f';return 'i'}});order+':'+r.source+':'+r.flags",
    "pf:new:i",
);
console.log("RegExp construction passed");
