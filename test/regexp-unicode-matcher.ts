import { parseRegExpSyntax } from "../src/regexp/regexp-pattern-syntax.js";
import {
    compileRegExpPattern,
    matchRegExp,
    type RegExpProgram,
} from "../src/regexp/regexp-matcher.js";
import { Realm } from "../src/realm.js";
import {
    normal,
    resourceFailure,
    type OperationContext,
    type ValueCompletion,
} from "../src/runtime.js";
function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
const realm = new Realm((_line: string) => {}, "script"),
    loc = { line: 1, column: 1 };
let work = 0;
function context(limit = 1000000): OperationContext {
    work = 0;
    return {
        realm,
        call: (_callee, _receiver, _args, _loc): ValueCompletion => {
            throw new Error("no guest calls");
        },
        tick: (location): ValueCompletion =>
            ++work > limit
                ? resourceFailure("steps", work, limit, "Unicode match budget", location)
                : normal(),
    };
}
function program(source: string, flags = "u"): RegExpProgram {
    const unicode = flags.includes("u"),
        parsed = parseRegExpSyntax(source, () => true, unicode);
    if (parsed.kind !== "ready") {
        throw new Error("parse " + source);
    }
    const result = compileRegExpPattern(
        parsed.pattern,
        {
            ignoreCase: flags.includes("i"),
            multiline: flags.includes("m"),
            dotAll: flags.includes("s"),
        },
        context(),
        loc,
        unicode,
    );
    if (result.kind !== "ready") {
        throw new Error("compile " + source);
    }
    return result.program;
}
const cases: [string, string, string, boolean][] = [
    ["^.$", "u", "😀", true],
    ["^.$", "", "😀", false],
    ["^.$", "u", "\ud800", true],
    ["^.$", "u", "\udc00", true],
    ["^\\u{1F600}$", "u", "😀", true],
    ["^\\uD83D\\uDE00$", "u", "😀", true],
    ["^[😀-🙏]$", "u", "😁", true],
    ["^[^a]$", "u", "😀", true],
    ["^\\uD83D$", "u", "😀", false],
    ["^😀+$", "u", "😀😀", true],
    ["^[a-z]$", "ui", "K", true],
    ["^[a-z]$", "i", "K", false],
    ["^[a-z]$", "ui", "ſ", true],
    ["^[a-z]$", "i", "ſ", false],
    ["^ω$", "ui", "Ω", true],
    ["^ω$", "i", "Ω", false],
    ["^ß$", "ui", "ẞ", true],
    ["^ß$", "ui", "ss", false],
    ["^i$", "ui", "İ", false],
    ["^i$", "ui", "ı", false],
    ["^\\w$", "ui", "K", true],
    ["^\\W$", "ui", "ſ", false],
    ["^\\bK\\b$", "ui", "K", true],
    ["^(𐐀)\\1$", "ui", "𐐀𐐨", true],
];
for (const [source, flags, input, expected] of cases) {
    const result = matchRegExp(program(source, flags), input, 0, false, context(), loc);
    check(result.kind !== "abrupt" && (result.kind === "match") === expected, source + "/" + flags);
}
function capture(
    source: string,
    input: string,
    expected: number[],
    start = 0,
    sticky = false,
): void {
    const result = matchRegExp(program(source), input, start, sticky, context(), loc);
    if (result.kind !== "match") {
        throw new Error("match " + source);
    }
    check(result.captures.length === expected.length, "capture count");
    for (let i = 0; i < expected.length; i++) {
        check(result.captures[i] === expected[i], "capture offset " + source);
    }
}
capture("(?<x>😀)(.)", "x😀a", [1, 4, 1, 3, 3, 4]);
capture("(?:(?<x>😀)|(?<x>a))+", "😀a", [0, 3, -1, -1, 2, 3]);
capture("(?=(😀))\\1", "😀", [0, 2, 0, 2]);
capture("(😀|😀a)\\1b", "😀a😀ab", [0, 7, 0, 3]);
capture(".", "😀a", [0, 2], 1, true);
capture("a", "😀a", [2, 3]);
check(matchRegExp(program("^.$", "us"), "\n", 0, true, context(), loc).kind === "match", "dotAll");
const budgetProgram = program(String.raw`^(?:(?<x>𐐀)|(?<x>b))\k<x>$`, "ui");
check(
    matchRegExp(budgetProgram, "𐐀𐐨", 0, true, context(), loc).kind === "match",
    "astral named reference",
);
const matchWork = work;
for (let budget = 0; budget < matchWork; budget++) {
    const result = matchRegExp(budgetProgram, "𐐀𐐨", 0, true, context(budget), loc);
    check(
        result.kind === "abrupt" && result.completion.origin.kind === "resource-limit",
        "Unicode matcher budget " + budget,
    );
}
const largeRange = parseRegExpSyntax(String.raw`[\u{0}-\u{10ffff}]`, () => true, true);
if (largeRange.kind !== "ready") {
    throw new Error("large range parse");
}
const compiledRange = compileRegExpPattern(
    largeRange.pattern,
    { ignoreCase: true, multiline: false, dotAll: false },
    context(20),
    loc,
    true,
);
const rangeWork = work;
check(compiledRange.kind === "ready", "wide range fits original budget");
if (compiledRange.kind === "ready") {
    check(
        matchRegExp(compiledRange.program, "😀", 0, true, context(20), loc).kind === "match",
        "wide range matching",
    );
}
for (let budget = 0; budget < rangeWork; budget++) {
    const stopped = compileRegExpPattern(
        largeRange.pattern,
        { ignoreCase: true, multiline: false, dotAll: false },
        context(budget),
        loc,
        true,
    );
    check(
        stopped.kind === "abrupt" && stopped.completion.origin.kind === "resource-limit",
        "range compilation budget cutoff",
    );
}
console.log("regexp unicode matcher passed");
