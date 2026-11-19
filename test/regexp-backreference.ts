import { parseRegExpPattern } from "../src/regexp-pattern.js";
import { compileRegExpPattern, matchRegExp, type RegExpProgram } from "../src/regexp-matcher.js";
import { Realm } from "../src/realm.js";
import { normal, resourceFailure, type OperationContext, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const realm = new Realm((_line: string) => {}, "script"), loc = { line: 1, column: 1 };
function context(limit = 1000000): OperationContext {
    let steps = 0;
    return { realm, call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("no guest calls"); },
        tick: (location): ValueCompletion => ++steps > limit ? resourceFailure("steps", steps, limit, "backreference budget", location) : normal() };
}
function program(source: string, ignoreCase = false): RegExpProgram {
    const parsed = parseRegExpPattern(source, context(), loc);
    if (parsed.kind !== "ready") throw new Error("parse: " + source);
    const compiled = compileRegExpPattern(parsed.pattern, { ignoreCase, multiline: false, dotAll: false }, context(), loc);
    if (compiled.kind !== "ready") throw new Error("compile: " + source);
    return compiled.program;
}
function expect(source: string, input: string, expected: (string | undefined)[] | null, ignoreCase = false): void {
    const result = matchRegExp(program(source, ignoreCase), input, 0, true, context(), loc);
    if (expected === null) { check(result.kind === "no-match", "no match: " + source); return; }
    if (result.kind !== "match") throw new Error("match: " + source);
    check(result.start === 0 && result.end === expected[0]!.length && result.captures.length === expected.length * 2, "match extent: " + source);
    for (let i = 0; i < expected.length; i++) {
        const from = result.captures[i * 2], to = result.captures[i * 2 + 1];
        check((from < 0 ? undefined : input.slice(from, to)) === expected[i], "capture " + i + ": " + source);
    }
}
expect("(a)\\1", "aa", ["aa", "a"]);
expect("(a)\\1", "ab", null);
expect("(a|ab)\\1", "abab", ["abab", "ab"]);
expect("(a*)\\1b", "aaaab", ["aaaab", "aa"]);
expect("(a)?\\1b", "b", ["b", undefined]);
expect("\\1(a)", "a", ["a", "a"]);
expect("(\\1a)", "a", ["a", "a"]);
expect("(\\2a)(b)", "ab", ["ab", "a", "b"]);
expect("(a(b)?)+\\2", "aba", ["aba", "a", undefined]);
expect("(a|(b))\\2c", "ac", ["ac", "a", undefined]);
expect("(a)\\1*", "aaac", ["aaa", "a"]);
expect("()(?:\\1)*", "", ["", ""]);
expect("(a)\\1", "aA", ["aA", "a"], true);
expect("(a)\\1", "aA", null);
expect("(ß)\\1", "ßß", ["ßß", "ß"], true);
expect("(ß)\\1", "ßSS", null, true);
expect("(K)\\1", "Kk", null, true);
expect("(😀)\\1", "😀😀", ["😀😀", "😀"]);
expect("()()()()()()()()()(x)\\10", "xx", ["xx", "", "", "", "", "", "", "", "", "", "x"]);
expect("\\(a\\)(b)\\1", "(a)bb", ["(a)bb", "b"]);
expect("[(](b)\\1", "(bb", ["(bb", "b"]);
expect("(?:a)(b)\\1", "abb", ["abb", "b"]);
expect("(?=a)(a)\\1", "aa", ["aa", "a"]);
expect("\\1", "\u0001", ["\u0001"]);
expect("(a)\\2", "a\u0002", ["a\u0002", "a"]);
expect("(a)\\11", "a\t", ["a\t", "a"]);
expect("[\\1](a)", "\u0001a", ["\u0001a", "a"]);
expect("\\07", "\u0007", ["\u0007"]);
expect("\\k<x>", "k<x>", ["k<x>"]);
expect("(?<x>a)\\1", "aa", ["aa", "a"]);
const stopped = parseRegExpPattern("(a)\\1" + "x".repeat(1000), context(30), loc);
check(stopped.kind === "abrupt" && stopped.completion.origin.kind === "resource-limit", "capture scan budget");
const match = matchRegExp(program("(a{100})\\1"), "a".repeat(200), 0, true, context(150), loc);
check(match.kind === "abrupt" && match.completion.origin.kind === "resource-limit", "comparison budget");
const cases = [
    String.raw`/(a)\1/.test("aa")&&!/(a)\1/.test("ab")`,
    String.raw`new RegExp("(a)\\1").exec("xaa")[0]==="aa"`,
    String.raw`var r=/(a)\1/dg,m=r.exec("xaa");m.index===1&&m[1]==="a"&&m.indices[0][0]===1&&m.indices[0][1]===3&&m.indices[1][0]===1&&m.indices[1][1]===2&&r.lastIndex===3`,
    String.raw`var r=/(a)\1/y;r.lastIndex=1;r.exec("xaa")[0]==="aa"&&r.lastIndex===3&&r.exec("xaa")===null&&r.lastIndex===0`,
    String.raw`"aabb".replace(/(a|b)\1/g,"[$1]")==="[a][b]"`,
    String.raw`Array.from("aabb".matchAll(/(a|b)\1/g)).length===2`,
    String.raw`var m=/(a)?\1b/d.exec("b");m[1]===undefined&&m.indices[1]===undefined`
];
for (const text of cases) {
    const prepared = prepareBoundedScript({ id: "regexp-backreference", text }, new Realm((_line: string) => {}, "script"));
    if (prepared.kind !== "ready") throw new Error("guest preparation: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "guest case: " + text);
}
console.log("regexp backreference passed");
