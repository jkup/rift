import { parseRegExpSyntax, type RegExpPattern } from "../src/regexp-pattern-syntax.js";
import { validateRegExpLiteral } from "../src/regexp-literal-validation.js";

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function pattern(source: string, unicode = true): RegExpPattern {
    const result = parseRegExpSyntax(source, () => true, unicode);
    if (result.kind !== "ready") throw new Error(source + ": " + result.kind);
    return result.pattern;
}
function characters(source: string, expected: number[], unicode = true): void {
    const terms = pattern(source, unicode).body.alternatives[0];
    check(terms.length === expected.length, "atom count " + source);
    for (let i = 0; i < terms.length; i++) {
        const atom = terms[i].atom;
        check(atom.kind === "character" && atom.value === expected[i], "atom value " + source);
    }
}
characters("😀", [0x1f600]);
characters("😀", [0xd83d, 0xde00], false);
characters(String.raw`\u{1F600}`, [0x1f600]);
characters(String.raw`\u{0000001F600}`, [0x1f600]);
characters(String.raw`\uD83D\uDE00`, [0x1f600]);
characters(String.raw`\uD83D\uDE00`, [0xd83d, 0xde00], false);
characters(String.raw`\u{D83D}\u{DE00}`, [0xd83d, 0xde00]);
characters(String.raw`\uD83D` + "\ude00", [0xd83d, 0xde00]);
characters("\ud83d" + String.raw`\uDE00`, [0xd83d, 0xde00]);
characters(String.raw`\x61\u0062\0\cA`, [97, 98, 0, 1]);
characters("\ud800\udc00\udfff", [0x10000, 0xdfff]);
characters(String.raw`\^\$\\\.\*\+\?\(\)\[\]\{\}\|\/`, [94,36,92,46,42,43,63,40,41,91,93,123,125,124,47]);
const astralClass = pattern("[😀-🙏]").body.alternatives[0][0].atom;
check(astralClass.kind === "class" && astralClass.parts.length === 1 && astralClass.parts[0].kind === "range" &&
    astralClass.parts[0].from === 0x1f600 && astralClass.parts[0].to === 0x1f64f, "astral range");
for (const source of [String.raw`[\-\]\b]`, "[]", "[^]", "[a-]", String.raw`\1(a)`, String.raw`\k<x>(?<x>a)`, "(?<π>a)|(?<π>b)", "😀{2,3}?", String.raw`\u{10FFFF}`]) pattern(source);
const invalid = [
    String.raw`\a`, String.raw`\_`, String.raw`\-`, String.raw`\8`, String.raw`\01`,
    String.raw`\xZ0`, String.raw`\uZZZZ`, String.raw`\u{110000}`, String.raw`\u{}`,
    String.raw`\u{0z}`, String.raw`\c1`, "{", "}", "]", "a{", "a{1", "a{1,x}",
    String.raw`[\d-a]`, String.raw`[a-\w]`, "(?=a)?", String.raw`\k<x>`, String.raw`\k`,
    String.raw`[\B]`, String.raw`[\1]`, String.raw`(a)\2`, String.raw`\uD800\uZZZZ`,
];
for (const source of invalid) check(parseRegExpSyntax(source, () => true, true).kind === "syntax-error", "Unicode rejection " + source);
for (const source of [String.raw`\a`, String.raw`\_`, String.raw`\-`, String.raw`\xZ0`, String.raw`\uZZZZ`, "{", "}", "]", "a{"]) pattern(source, false);
for (const source of [String.raw`\p{ASCII}`, String.raw`\P{Letter}`, String.raw`[\p{L}]`, "(?<=a)"])
    check(parseRegExpSyntax(source, () => true, true).kind === "unsupported", "remaining boundary " + source);
for (const source of ["😀[😀-🙏]", String.raw`\uD83D\uDE00`, String.raw`\u{0000001f600}`, String.raw`\k<π>(?<π>a)|(?<π>b)`]) {
    let steps = 0;
    check(parseRegExpSyntax(source, () => { steps++; return true; }, true).kind === "ready", "budget baseline");
    for (let budget = 0; budget < steps; budget++) {
        let remaining = budget;
        check(parseRegExpSyntax(source, () => remaining-- > 0, true).kind === "stopped", "Unicode budget " + budget);
    }
}
check(validateRegExpLiteral("a", "u").kind === "unsupported", "public Unicode admission remains disabled");
console.log("regexp unicode syntax passed");
