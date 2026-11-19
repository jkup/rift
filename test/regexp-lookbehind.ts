import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
import { compileRegExpPattern, matchRegExp } from "../src/regexp-matcher.js";
import { normal, resourceFailure, type OperationContext, type ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script"), session = createScriptSession();
    const prepared = prepareBoundedScript({ id: "lookbehind", text }, realm);
    if (prepared.kind !== "ready") throw new Error("preparation: " + text);
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "caller restored");
    if (result.type !== "normal" && result.type !== "throw") throw new Error("unexpected completion");
    return result;
}
for (const row of [
    {"id":"positive","source":"var m=new RegExp(\"(?<=ab)c\",\"d\").exec(\"abc\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"c\"],\"index\":2,\"indices\":[[2,3]]}"},
    {"id":"negative-fails","source":"var m=new RegExp(\"(?<!ab)c\",\"d\").exec(\"abc\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"null"},
    {"id":"negative-passes","source":"var m=new RegExp(\"(?<!ab)c\",\"d\").exec(\"xbc\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"c\"],\"index\":2,\"indices\":[[2,3]]}"},
    {"id":"variable-captures","source":"var m=new RegExp(\"(?<=([ab]+)([bc]+))$\",\"d\").exec(\"abc\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"\",\"a\",\"bc\"],\"index\":3,\"indices\":[[3,3],[0,1],[1,3]]}"},
    {"id":"repeated-capture","source":"var m=new RegExp(\"(?<=(a)+)b\",\"d\").exec(\"aaab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\",\"a\"],\"index\":3,\"indices\":[[3,4],[0,1]]}"},
    {"id":"lazy-capture","source":"var m=new RegExp(\"(?<=(a+?))b\",\"d\").exec(\"aaab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\",\"a\"],\"index\":3,\"indices\":[[3,4],[2,3]]}"},
    {"id":"alternative-order","source":"var m=new RegExp(\"(?<=(a|ba))c\",\"d\").exec(\"bac\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"c\",\"a\"],\"index\":2,\"indices\":[[2,3],[1,2]]}"},
    {"id":"reverse-reference","source":"var m=new RegExp(\"(?<=\\\\1(a))b\",\"d\").exec(\"aab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\",\"a\"],\"index\":2,\"indices\":[[2,3],[1,2]]}"},
    {"id":"unmatched-reference","source":"var m=new RegExp(\"(?<=(a)\\\\1)b\",\"d\").exec(\"aab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\",\"a\"],\"index\":2,\"indices\":[[2,3],[1,2]]}"},
    {"id":"nested-ahead","source":"var m=new RegExp(\"(?<=(?=a)a)b\",\"d\").exec(\"ab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\"],\"index\":1,\"indices\":[[1,2]]}"},
    {"id":"nested-behind","source":"var m=new RegExp(\"(?<=(?<=a)b)c\",\"d\").exec(\"abc\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"c\"],\"index\":2,\"indices\":[[2,3]]}"},
    {"id":"unicode-cursor","source":"var m=new RegExp(\"(?<=(😀))x\",\"du\").exec(\"😀x\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"x\",\"😀\"],\"index\":2,\"indices\":[[2,3],[0,2]]}"},
    {"id":"code-unit-cursor","source":"var m=new RegExp(\"(?<=(.))x\",\"d\").exec(\"😀x\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"x\",\"\\ude00\"],\"index\":2,\"indices\":[[2,3],[1,2]]}"},
    {"id":"negative-capture-clear","source":"var m=new RegExp(\"(?<!(a))b\",\"d\").exec(\"cb\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\",null],\"index\":1,\"indices\":[[1,2],null]}"},
    {"id":"positive-empty","source":"var m=new RegExp(\"(?<=)a\",\"d\").exec(\"a\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"a\"],\"index\":0,\"indices\":[[0,1]]}"},
    {"id":"negative-empty","source":"var m=new RegExp(\"(?<!)a\",\"d\").exec(\"a\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"null"},
    {"id":"start-anchor","source":"var m=new RegExp(\"(?<=^a)b\",\"d\").exec(\"ab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\"],\"index\":1,\"indices\":[[1,2]]}"},
    {"id":"end-anchor","source":"var m=new RegExp(\"(?<=a$)b\",\"d\").exec(\"ab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"null"},
    {"id":"scoped-ignore-case","source":"var m=new RegExp(\"(?<=(?i:a))b\",\"d\").exec(\"Ab\");JSON.stringify(m===null?null:{values:Array.from(m,function(v){return v===undefined?null:v}),index:m.index,indices:Array.from(m.indices,function(v){return v===undefined?null:v})})","expected":"{\"values\":[\"b\"],\"index\":1,\"indices\":[[1,2]]}"}
]) {
    const result = run(row.source);
    check(result.type === "normal" && result.value.kind === "string" && result.value.value === row.expected, row.id);
}
for (const text of [
    "!/^aa(?<=(a|aa))\\1$/.test('aaaa')",
    "/(?=(?<=a)b)b/.test('ab')",
    "(function(){var m=/(?<=(?=(a))a)b/d.exec('ab');return m[1]==='a'&&m.indices[1][0]===0&&m.indices[1][1]===1})()",
    "(function(){var m=/(?<=\\k<x>(?<x>😀))x/du.exec('😀😀x');return m.index===4&&m.groups.x==='😀'&&m.indices.groups.x[0]===2&&m.indices.groups.x[1]===4})()",
    "/(?<=\\1(𐐀))x/iu.test('𐐨𐐀x')",
    "(function(){var m=/(?<=(😀))\\1/du.exec('😀😀');return m.index===2&&m[0]==='😀'&&m.indices[1][0]===0&&m.indices[1][1]===2})()",
    "!/(?<=(?-i:a))b/i.test('Ab')&&/(?<=(?i:a))b/.test('Ab')",
    "/(?<=(?s:.))x/.test('\\nx')&&!/(?<=.)x/.test('\\nx')",
    "/(?<=(?m:^a))b/.test('\\nab')&&!/(?<=^a)b/.test('\\nab')",
    "(function(){var r=/(?<=a)b/y;r.lastIndex=1;var m=r.exec('ab');return m.index===1&&r.lastIndex===2&&r.exec('ab')===null&&r.lastIndex===0})()",
    "Array.from('ab ab'.matchAll(/(?<=a)b/g),function(m){return m.index}).join(',')==='1,4'",
    "'ab ab'.replace(/(?<=a)b/g,'x')==='ax ax'&&'abcb'.split(/(?<=b)/).join('|')==='ab|cb'&&'ab'.search(/(?<=a)b/)===1",
    "(function(){var m=/(?:(?<=(a))b|c)+/.exec('abc');return m[0]==='bc'&&m[1]===undefined})()",
    "(function(){var m=/(?<=(a*)*)b/.exec('b');return m[0]==='b'&&m[1]===undefined})()",
    "(function(){var r=/(?<=.)/gu;r.lastIndex=1;var m=r.exec('😀');return m.index===2&&r.lastIndex===2})()",
    "/(?<=[a-z\\p{Number}])x/u.test('4x')&&/(?<![a-z\\p{Number}])x/u.test('!x')"
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const unicode of [false, true]) for (const pattern of ["(?<=a)*", "(?<!a)+", "(?<=a)?", "(?<!a){1}", "(?<=", "(?<!a"]) {
    const result = parseRegExpSyntax(pattern, () => true, unicode);
    check(result.kind === "syntax-error", "invalid lookbehind: " + pattern);
}
const source = String.raw`(?<=(a|b)+)c`;
let parsingSteps = 0;
const parsed = parseRegExpSyntax(source, () => { parsingSteps++; return true; });
if (parsed.kind !== "ready") throw new Error("budget pattern");
for (let limit = 0; limit < parsingSteps; limit++) {
    let steps = 0;
    check(parseRegExpSyntax(source, () => steps++ < limit).kind === "stopped", "lookbehind parsing budget");
}
const realm = new Realm((_line: string) => {}, "script"), loc = { line: 1, column: 1 };
let steps = 0, limit = 100000;
const context: OperationContext = {
    realm, call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("no guest calls"); },
    tick: (location): ValueCompletion => ++steps > limit ? resourceFailure("steps", steps, limit, "lookbehind budget", location) : normal(),
};
const compiled = compileRegExpPattern(parsed.pattern, { ignoreCase: false, multiline: false, dotAll: false }, context, loc);
if (compiled.kind !== "ready") throw new Error("budget compilation");
const compilationSteps = steps;
for (limit = 0; limit < compilationSteps; limit++) {
    steps = 0;
    const result = compileRegExpPattern(parsed.pattern, { ignoreCase: false, multiline: false, dotAll: false }, context, loc);
    check(result.kind === "abrupt" && result.completion.origin.kind === "resource-limit", "lookbehind compilation budget");
}
limit = 3; steps = 0;
const stopped = matchRegExp(compiled.program, "aAb", 0, true, context, loc);
check(stopped.kind === "abrupt" && stopped.completion.origin.kind === "resource-limit", "lookbehind matching budget");
limit = 100000; steps = 0;
const matched = matchRegExp(compiled.program, "abc", 2, true, context, loc);
check(matched.kind === "match" && matched.start === 2 && matched.end === 3, "backward budget baseline");
const matchingSteps = steps;
for (limit = 0; limit < matchingSteps; limit++) {
    steps = 0;
    const result = matchRegExp(compiled.program, "abc", 2, true, context, loc);
    check(result.kind === "abrupt" && result.completion.origin.kind === "resource-limit", "backward matching budget");
}
console.log("regexp lookbehind passed");
