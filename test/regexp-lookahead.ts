import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
import { compileRegExpPattern, matchRegExp } from "../src/regexp-matcher.js";
import {
    normal,
    resourceFailure,
    type OperationContext,
    type ValueCompletion,
} from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script"),
        prepared = prepareBoundedScript({ id: "lookahead", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    '/a(?=b)/.exec("cab")[0]==="a"',
    '/a(?!b)/.exec("cabac").index===3',
    '/(?=a)/.exec("ba")[0]===""&&/(?=a)/.exec("ba").index===1',
    '/(?!)/.exec("")===null&&/(?=)/.exec("")[0]===""',
    '/(?!a)/.exec("a").index===1',
    '/^(?=a)a$/.test("a")&&!/^(?!a)a$/.test("a")',
    '/^(?!(?!a))a$/.test("a")&&!/^(?!(?!a))b$/.test("b")',
    '/^(?=(?=a)a)a$/.test("a")',
    '/^(?=ab|ac)ac$/.test("ac")',
    '/^(?!ab|ac)ad$/.test("ad")&&!/^(?!ab|ac)ac$/.test("ac")',
    'var m=/(?=(a+))/.exec("baaabac");m[0]===""&&m[1]==="aaa"&&m.index===1',
    'var m=/(?=(a+))a*b\\1/.exec("baaabac");m[0]==="aba"&&m[1]==="a"&&m.index===3',
    '!/^(?=(a|ab))\\1c$/.test("abc")',
    'var m=/^(?=(ab|a))\\1c$/.exec("abc");m[0]==="abc"&&m[1]==="ab"',
    'var m=/^(?!(a)b)a\\1$/.exec("a");m[0]==="a"&&m[1]===undefined',
    'var m=/^(?!(a|ab)c)ab\\1$/.exec("ab");m[0]==="ab"&&m[1]===undefined',
    'var m=/^(?=(a))b|a$/.exec("a");m[0]==="a"&&m[1]===undefined',
    'var m=/^(?=(a))(?!(b))a$/.exec("a");m[1]==="a"&&m[2]===undefined',
    'var m=/^(?=(?=(a)))\\1$/.exec("a");m[1]==="a"&&m[0]==="a"',
    '/^(a)(?=\\1)\\1$/.test("aa")',
    '/^(?=a)(a)\\1$/.test("aa")',
    'var m=/^(?:(?=(a))a|b)+$/.exec("ab");m[0]==="ab"&&m[1]===undefined',
    'var m=/^(?:(?=(a))a|b)+$/.exec("ba");m[1]==="a"',
    'var m=/^(?=(a*))a*?$/.exec("aaa");m[0]==="aaa"&&m[1]==="aaa"',
    'var m=/(?=(a+))/d.exec("baa");m.indices[0][0]===1&&m.indices[0][1]===1&&m.indices[1][0]===1&&m.indices[1][1]===3',
    '/^(?=(a))A\\1$/i.test("Aa")',
    String.raw`/^(?=.)\n$/s.test("\n")&&!/^(?=.)\n$/.test("\n")`,
    String.raw`/(?=^a)a/m.exec("b\na").index===2`,
    'var r=/(?=a)a/y;r.lastIndex=1;r.exec("ba")[0]==="a"&&r.lastIndex===2',
    'var r=/(?=a)a/y;r.lastIndex=0;r.exec("ba")===null&&r.lastIndex===0',
    '"aa".replace(/(?=a)/g,"x")==="xaxa"',
    'var a=Array.from("aa".matchAll(/(?=a)/g));a.length===2&&a[0].index===0&&a[1].index===1',
    'RegExp("(?=a)").test("a")&&RegExp("(?!a)").test("")',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const source of ["(?<=a)", "(?<!a)", "(?<x>a)", "(?=a)?", "(?!a)*", "(?=a){1}"]) {
    check(
        parseRegExpSyntax(source, () => true).kind ===
            (source === "(?<x>a)" || source === "(?<=a)" || source === "(?<!a)"
                ? "ready"
                : "unsupported"),
        "retained input " + source,
    );
}
for (const source of ["(?=", "(?!a", "(?=a))", "(?=a{3,2})"]) {
    check(parseRegExpSyntax(source, () => true).kind === "syntax-error", "invalid " + source);
}
let ticks = 0;
check(parseRegExpSyntax("(?=(a))\\1", () => ++ticks < 5).kind === "stopped", "syntax work budget");
const realm = new Realm((_line: string) => {}, "script"),
    loc = { line: 1, column: 1 };
function context(limit: number): OperationContext {
    let steps = 0;
    return {
        realm,
        call: (_callee, _receiver, _args, _loc): ValueCompletion => {
            throw new Error("no guest calls");
        },
        tick: (location): ValueCompletion =>
            ++steps > limit
                ? resourceFailure("steps", steps, limit, "lookahead budget", location)
                : normal(),
    };
}
for (const source of ["(?=(a+)+b)", "(?!(a+)+b)", "(?=(?!(a+)+b))"]) {
    const parsed = parseRegExpSyntax(source, () => true);
    if (parsed.kind !== "ready") {
        throw new Error("budget pattern");
    }
    const compiled = compileRegExpPattern(
        parsed.pattern,
        { ignoreCase: false, multiline: false, dotAll: false },
        context(10000),
        loc,
    );
    if (compiled.kind !== "ready") {
        throw new Error("budget compile");
    }
    const result = matchRegExp(compiled.program, "a".repeat(20), 0, true, context(300), loc);
    check(
        result.kind === "abrupt" && result.completion.origin.kind === "resource-limit",
        "matcher budget " + source,
    );
}
console.log("regexp lookahead passed");
