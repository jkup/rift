import { foldedRangeContains } from "../src/unicode-properties.js";
import { simpleCaseFold } from "../src/unicode-case-fold.js";
import { parseRegExpSyntax } from "../src/regexp-pattern-syntax.js";
import { compileRegExpPattern, matchRegExp } from "../src/regexp-matcher.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
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
for (let code = 0; code <= 0x10ffff; code++) {
    const canonical = simpleCaseFold(code);
    check(foldedRangeContains(code, code, canonical), "singleton equivalence");
    check(foldedRangeContains(0, 0x10ffff, canonical), "full Unicode range");
}
for (const [from, to] of [
    [0, 31],
    [0, 254],
    [0, 255],
    [0, 256],
    [65, 90],
    [97, 122],
    [0x17e, 0x180],
    [0x390, 0x3ff],
    [0x2125, 0x212b],
    [0xd7ff, 0xe001],
    [0x10400, 0x1044f],
    [0x10fffe, 0x10ffff],
]) {
    const expected = new Set<number>();
    for (let code = from; code <= to; code++) {
        expected.add(simpleCaseFold(code));
    }
    for (const code of [
        0,
        31,
        32,
        65,
        75,
        90,
        97,
        107,
        122,
        0x17f,
        0x3a3,
        0x3c2,
        0x3c3,
        0x2126,
        0x212a,
        0xd800,
        0xdfff,
        0xe000,
        0x10400,
        0x10428,
        0x1f600,
        0x10ffff,
        Math.max(0, from - 1),
        from,
        to,
        Math.min(0x10ffff, to + 1),
    ]) {
        const canonical = simpleCaseFold(code);
        check(
            foldedRangeContains(from, to, canonical) === expected.has(canonical),
            "range boundary and folding",
        );
    }
}
for (const text of [
    String.raw`/[\u{0}-\u{10ffff}]/iu.test('😀')`,
    String.raw`! /[^\u{0}-\u{10ffff}]/iu.test('😀')`,
    String.raw`/[A-Z]/iu.test('K') && /[a-z]/iu.test('ſ')`,
    String.raw`!/[A-Z]/i.test('K') && !/[a-z]/i.test('ſ')`,
    String.raw`/[\u212a-\u212a]/iu.test('k') && !/[\u212a-\u212a]/i.test('k')`,
    String.raw`!/[\ud800-\udbff]/iu.test('😀') && /[\ud800-\udbff]/i.test('😀')`,
    String.raw`/[\u{10400}-\u{10427}]/iu.test('𐐨')`,
    String.raw`/(?<=[\u{0}-\u{10ffff}])x/iu.test('😀x')`,
    String.raw`/(?i:[A-Z])(?-i:[A-Z])/u.test('aA') && !/(?i:[A-Z])(?-i:[A-Z])/u.test('aa')`,
    String.raw`/[A-Z\p{Number}]/iu.test('4') && /[^A-Z\p{Number}]/iu.test('!')`,
    String.raw`!/[A-Z\P{ASCII}]/iu.test('4') && /[A-Z\P{ASCII}]/iu.test('α')`,
]) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "regexp-range", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const realm = new Realm((_line: string) => {}, "script"),
    loc = { line: 1, column: 1 };
let steps = 0,
    limit = 100000;
const context: OperationContext = {
    realm,
    call: (_callee, _receiver, _args, _loc): ValueCompletion => {
        throw new Error("no guest calls");
    },
    tick: (location) =>
        ++steps > limit
            ? resourceFailure("steps", steps, limit, "range budget", location)
            : normal(),
};
for (const source of ["[a-z]", String.raw`[\u{0}-\u{10ffff}]`]) {
    const parsed = parseRegExpSyntax(source, () => true, true);
    if (parsed.kind !== "ready") {
        throw new Error("pattern");
    }
    steps = 0;
    limit = 100000;
    const compiled = compileRegExpPattern(
        parsed.pattern,
        { ignoreCase: true, multiline: false, dotAll: false },
        context,
        loc,
        true,
    );
    if (compiled.kind !== "ready") {
        throw new Error("compile");
    }
    const work = steps;
    check(
        work === (source === "[a-z]" ? 30 : 4),
        "small range path and bounded wide range compilation",
    );
    for (limit = 0; limit < work; limit++) {
        steps = 0;
        check(
            compileRegExpPattern(
                parsed.pattern,
                { ignoreCase: true, multiline: false, dotAll: false },
                context,
                loc,
                true,
            ).kind === "abrupt",
            "compile budget cutoff",
        );
    }
    steps = 0;
    limit = 0;
    check(
        matchRegExp(compiled.program, "a", 0, true, context, loc).kind === "abrupt",
        "match budget cutoff",
    );
}
console.log("regexp range passed");
