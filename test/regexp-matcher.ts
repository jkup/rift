import { parseRegExpPattern } from "../src/regexp-pattern.js";
import { compileRegExpPattern, matchRegExp, type RegExpMatchFlags, type RegExpMatchResult, type RegExpProgram } from "../src/regexp-matcher.js";
import { Realm } from "../src/realm.js";
import { normal, resourceFailure, type OperationContext, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const realm = new Realm((_line: string) => {}, "script"), loc = { line: 1, column: 1 };
function context(limit = 1000000): OperationContext {
    let steps = 0;
    return { realm, call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("matcher must not call guests"); },
        tick: (location): ValueCompletion => ++steps > limit ? resourceFailure("steps", steps, limit, "matcher budget", location) : normal() };
}
function program(source: string, flags = ""): RegExpProgram {
    const parsed = parseRegExpPattern(source, context(), loc);
    if (parsed.kind !== "ready") throw new Error("parse failed: " + source);
    const options: RegExpMatchFlags = { ignoreCase: flags.includes("i"), multiline: flags.includes("m"), dotAll: flags.includes("s") };
    const compiled = compileRegExpPattern(parsed.pattern, options, context(), loc);
    if (compiled.kind !== "ready") throw new Error("compile failed: " + source);
    return compiled.program;
}
function expect(source: string, input: string, expected: (string | undefined)[] | null, index = 0, flags = "", start = 0, sticky = false): void {
    const result = matchRegExp(program(source, flags), input, start, sticky, context(), loc);
    if (expected === null) { check(result.kind === "no-match", "expected failure: " + source); return; }
    check(result.kind === "match", "expected match: " + source);
    if (result.kind !== "match") return;
    check(result.start === index && result.end === index + expected[0]!.length, "match indices: " + source);
    check(result.captures.length === expected.length * 2, "capture count: " + source);
    for (let i = 0; i < expected.length; i++) {
        const from = result.captures[i * 2], to = result.captures[i * 2 + 1];
        check((from === -1 ? undefined : input.slice(from, to)) === expected[i], "capture " + i + ": " + source);
        check(from === -1 ? to === -1 : to >= from, "capture range: " + source);
    }
}
expect("", "abc", [""]);
expect("abc", "xxabc", ["abc"], 2);
expect("abc", "xxabc", null, 0, "", 0, true);
expect("abc", "xxabc", ["abc"], 2, "", 2, true);
expect("", "abc", [""], 3, "", 3);
expect("", "abc", null, 0, "", 4);
expect("a|ab", "ab", ["a"]);
expect("(a|ab)c", "abc", ["abc", "ab"]);
expect("((a)|(ab))((c)|(bc))", "abc", ["abc", "a", "a", undefined, "bc", undefined, "bc"]);
expect("(aa|aabaac|ba|b|c)*", "aabaac", ["aaba", "ba"]);
expect("a[a-z]{2,4}", "abcdefghi", ["abcde"]);
expect("a[a-z]{2,4}?", "abcdefghi", ["abc"]);
expect("a{2,4}a", "aaaaa", ["aaaaa"]);
expect("a{2,4}?a", "aaaaa", ["aaa"]);
expect("a{2,4}b", "aaaaab", ["aaaab"], 1);
expect("(a|b)*", "abba", ["abba", "a"]);
expect("(a(b)?)+", "aba", ["aba", "a", undefined]);
expect("(a|(b))*", "ba", ["ba", "a", undefined]);
expect("(a(b)?)+b", "abb", ["abb", "ab", "b"]);
expect("((a)?b)*", "abb", ["abb", "b", undefined]);
expect("(a*)*", "aaa", ["aaa", "aaa"]);
expect("(a*)*", "", ["", undefined]);
expect("(a*)+", "", ["", ""]);
expect("(){2,4}", "", ["", ""]);
expect("(){0,4}", "", ["", undefined]);
expect("(?:|a)*", "aaa", ["aaa"]);
expect("(?:|a)*?b", "aaab", ["aaab"]);
expect("(a?){2}", "a", ["a", ""]);
expect("(a?){1,2}", "a", ["a", "a"]);
expect("(a?){1,2}?", "a", ["a", "a"]);
expect("(a?){1,2}?a", "a", ["a", ""]);
expect("((a)?)*b", "ab", ["ab", "a", "a"]);
expect("(z)((a+)?(b+)?(c))*", "zaacbbbcac", ["zaacbbbcac", "z", "ac", "a", undefined, "c"]);
expect("(a){0}", "a", ["", undefined]);
expect("a+?a", "aaaa", ["aa"]);
expect("a??a", "aa", ["a"]);
expect("a?a", "aa", ["aa"]);
expect("[]", "x", null);
expect("[^]", "\n", ["\n"]);
expect("[a-cx-z]+", "123bzy!", ["bzy"], 3);
expect("[^a-c]+", "abcXYZ", ["XYZ"], 3);
expect("[\\d\\D]", "x", ["x"]);
expect("[^\\d]", "4a", ["a"], 1);
expect("\\w+", "!a_9-", ["a_9"], 1);
expect("\\W+", "abc-é", ["-é"], 3);
expect("\\s+", "x\t\u00a0\u2028y", ["\t\u00a0\u2028"], 1);
expect("\\S+", " x", ["x"], 1);
expect("^a$", "a\n", null);
expect("^a$", "b\ra\nb", ["a"], 2, "m");
expect("$", "a\n", [""], 2);
expect("$", "a\n", [""], 1, "m");
expect("\\bcat\\b", "scat cat!", ["cat"], 5);
expect("\\Bcat\\B", "scats", ["cat"], 1);
expect("\\b", "", null);
expect("\\B", "", [""]);
for (const separator of ["\n", "\r", "\u2028", "\u2029"]) {
    expect(".", separator, null); expect(".", separator, [separator], 0, "s");
}
expect(".", "😀", ["\ud83d"]);
expect("..", "😀", ["😀"]);
expect(".", "\ud800", ["\ud800"]);
expect("\\0", "x\0y", ["\0"], 1);
expect("[a-z]+", "AbCZ", ["AbCZ"], 0, "i");
expect("[A-z]+", "_aZ", ["_aZ"], 0, "i");
expect("[^a-z]", "Ab_", ["_"], 2, "i");
expect("é", "É", ["É"], 0, "i");
expect("[à-ö]", "É", ["É"], 0, "i");
expect("σ", "ς", ["ς"], 0, "i");
expect("s", "ſ", null, 0, "i");
expect("k", "K", null, 0, "i");
expect("ß", "SS", null, 0, "i");
expect("\\w", "ſ", null, 0, "i");
expect("\\b", "ſ", null, 0, "i");
expect("[ſ]", "s", null, 0, "i");
expect("[\\W]", "ſ", ["ſ"], 0, "i");
expect("[\\D0]", "0", ["0"], 0, "i");
expect("[^\\D0]", "01", ["1"], 1, "i");
expect("[µ]", "Μ", ["Μ"], 0, "i");
expect("[ß]", "ẞ", null, 0, "i");
function budget(result: RegExpMatchResult): void {
    check(result.kind === "abrupt" && result.completion.origin.kind === "resource-limit", "explicit matcher budget failure");
}
budget(matchRegExp(program("(a+)+b"), "a".repeat(40), 0, false, context(1000), loc));
budget(matchRegExp(program("z"), "a".repeat(1000), 0, false, context(100), loc));
budget(matchRegExp(program("(".repeat(30) + "a" + ")".repeat(30) + "|b"), "a", 0, false, context(70), loc));
for (const source of ["a{1000000000}", "(?:){1000000000}", "[\\u0000-\\uffff]"]) {
    const parsed = parseRegExpPattern(source, context(), loc);
    if (parsed.kind !== "ready") throw new Error("budget pattern parse");
    const result = compileRegExpPattern(parsed.pattern, { ignoreCase: true, multiline: false, dotAll: false }, context(100), loc);
    check(result.kind === "abrupt" && result.completion.origin.kind === "resource-limit", "compile budget: " + source);
}
const reusable = program("(a|b)+");
check(matchRegExp(reusable, "abba", 0, false, context(), loc).kind === "match", "first execution");
check(matchRegExp(reusable, "x", 0, false, context(), loc).kind === "no-match", "no retained match state");
check(matchRegExp(reusable, "b", 0, false, context(), loc).kind === "match", "repeated execution");
console.log("RegExp matcher passed");
