import { parseRegExpPattern, type RegExpPattern, type RegExpParseResult } from "../src/regexp-pattern.js";
import { Realm } from "../src/realm.js";
import { normal, resourceFailure, type OperationContext, type ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const realm = new Realm((_line: string) => {}, "script");
const loc = { line: 1, column: 1 };
function parse(source: string, limit = 10000): RegExpParseResult {
    let steps = 0;
    const context: OperationContext = {
        realm,
        call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("pattern parser must not call guests"); },
        tick: (location): ValueCompletion => ++steps > limit ? resourceFailure("steps", steps, limit, "pattern budget", location) : normal(),
    };
    return parseRegExpPattern(source, context, loc);
}
function ready(source: string): RegExpPattern {
    const result = parse(source);
    if (result.kind !== "ready") throw new Error("expected pattern: " + source);
    check(result.pattern.source === source, "original pattern source");
    return result.pattern;
}
for (const source of ["(?=a)", "(?!a)", "", "abc", ".", "[]", "[^]", "[a-zA-Z0-9_]", "[-a]", "[a-]", "[--a]", "[a-b-c]",
    "a*", "a+?", "a??", "a{0}", "a{2,}", "a{2,4}?", "a{2", "a{2,3", "a{a}", "{", "}", "]",
    "(?:)", "(hello|goodbye)", "(ab)+", "^hello$", "\\bword\\B", "[\\d\\D\\s\\S\\w\\W]", "\\xZZ", "\\uXXYY",
    "(\\d{4})-(\\d{2})-(\\d{2})", "a\nb", "a\u2028b", "😀", "\ud800"]) ready(source);
for (const source of ["*", "+", "?", "a**", "a+*", "a???", "{1}", "[", "[a", "[z-a]", "(", "(a", "a)", "a{3,2}", "\\", "^*", "\\b+"]) {
    const result = parse(source);
    check(result.kind === "syntax-error", "proven invalid pattern: " + source);
}
for (const source of ["(?<=a)", "(?<name>a)", "(?i:a)", "[\\d-a]", "[a-\\d]", "a{9007199254740992}"]) {
    if (source === "(?i:a)" || source === "(?<=a)") check(ready(source).captures === 0, "assertions and modifiers do not capture");
    else if (source === "(?<name>a)") check(ready(source).names[0].name === "name", "named capture metadata");
    else check(parse(source).kind === "unsupported", "unsupported pattern: " + source);
}
for (const test of [{source: "\\k<x>", values: [107,60,120,62]}, {source: "\\07", values: [7]}, {source: "\\c_", values: [92,99,95]}]) {
    const terms = ready(test.source).body.alternatives[0];
    check(terms.length === test.values.length, "legacy escape term count: " + test.source);
    for (let i = 0; i < terms.length; i++) {
        const atom = terms[i].atom;
        check(atom.kind === "character" && atom.value === test.values[i], "legacy escape value: " + test.source);
    }
}
for (const test of [
    { source: "\\n", code: 10 }, { source: "\\r", code: 13 }, { source: "\\t", code: 9 }, { source: "\\v", code: 11 },
    { source: "\\f", code: 12 }, { source: "\\0", code: 0 }, { source: "\\x41", code: 65 }, { source: "\\uD800", code: 55296 },
    { source: "\\cA", code: 1 }, { source: "\\cz", code: 26 }, { source: "\\.", code: 46 }, { source: "\\/", code: 47 },
    { source: "\ud800", code: 55296 }, { source: "\u0000", code: 0 },
]) {
    const pattern = ready(test.source), terms = pattern.body.alternatives[0];
    check(terms.length === 1 && terms[0].atom.kind === "character" && terms[0].atom.value === test.code, "character value: " + test.source);
}
{
    const pattern = ready("(a(?:b(c)|d))*?(e){2,4}");
    check(pattern.captures === 3, "capture numbering excludes noncapturing group");
    const first = pattern.body.alternatives[0][0], second = pattern.body.alternatives[0][1];
    check(first.min === 0 && first.max === null && first.lazy && first.captureFrom === 1 && first.captureTo === 2, "repeated group's capture reset range");
    check(second.min === 2 && second.max === 4 && !second.lazy && second.captureFrom === 3 && second.captureTo === 3, "bounded quantifier");
    check(first.atom.kind === "group" && first.atom.index === 1 && second.atom.kind === "group" && second.atom.index === 3, "opening-parenthesis capture order");
}
{
    const alternatives = ready("|a||b|").body.alternatives;
    check(alternatives.length === 5 && alternatives[0].length === 0 && alternatives[1].length === 1 && alternatives[2].length === 0 && alternatives[4].length === 0, "empty alternatives retained in order");
    const incomplete = ready("a{2,3").body.alternatives[0];
    check(incomplete.length === 5 && incomplete[0].min === 1 && incomplete[1].atom.kind === "character" && incomplete[1].atom.value === 123, "incomplete legacy quantifier is literal");
    const astral = ready("😀").body.alternatives[0];
    check(astral.length === 2 && astral[0].atom.kind === "character" && astral[0].atom.value === 55357 && astral[1].atom.kind === "character" && astral[1].atom.value === 56832, "non-Unicode UTF-16 atoms");
}
{
    const atom = ready("[^a-c\\D\\b]").body.alternatives[0][0].atom;
    check(atom.kind === "class" && atom.inverted && atom.parts.length === 3, "class inversion and union");
    if (atom.kind !== "class") throw new Error("class required");
    check(atom.parts[0].kind === "range" && atom.parts[0].from === 97 && atom.parts[0].to === 99, "range endpoints");
    check(atom.parts[1].kind === "builtin" && atom.parts[1].name === "digit" && atom.parts[1].inverted, "inverted class escape");
    check(atom.parts[2].kind === "range" && atom.parts[2].from === 8 && atom.parts[2].to === 8, "class backspace");
}
{
    const deep = parse("(".repeat(129) + ")".repeat(129));
    check(deep.kind === "abrupt" && deep.completion.origin.kind === "resource-limit" && deep.completion.origin.guardCode === "parse-depth", "nested pattern bound");
    const long = parse("a".repeat(1000), 20);
    check(long.kind === "abrupt" && long.completion.origin.kind === "resource-limit" && long.completion.origin.guardCode === "steps", "flat pattern budget");
    const tentative = parse("a{" + "1".repeat(1000), 10);
    check(tentative.kind === "abrupt" && tentative.completion.origin.kind === "resource-limit", "tentative quantifier work is charged");
}


ready("(a)\\1");
console.log("RegExp patterns passed");
