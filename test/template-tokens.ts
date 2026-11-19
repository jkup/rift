import { lex, createLexer } from "../src/lexer.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
for (const [text, raw, cooked] of [
    ["`plain`", "plain", "plain"], ["``", "", ""],
    ["`a\r\nb\rc\nd`", "a\nb\nc\nd", "a\nb\nc\nd"],
    ["`a\\\r\nb\\\nc`", "a\\\nb\\\nc", "abc"],
    ["`\\x41\\u0042\\u{1f600}`", "\\x41\\u0042\\u{1f600}", "AB😀"],
    ["`\\`\\${x}\\\\`", "\\`\\${x}\\\\", "`${x}\\"],
    ["`\\0\\q`", "\\0\\q", "\0q"],
    ["`a\u2028b\u2029c`", "a\u2028b\u2029c", "a\u2028b\u2029c"],
]) {
    const result = lex(text, true), token = result.tokens[0];
    check(result.error === null && token.kind === "template", "valid template token");
    check(token.raw === raw && token.cooked === cooked && token.text === text, "raw/cooked/source values");
}
for (const escape of ["\\1", "\\01", "\\8", "\\9", "\\x", "\\xG0", "\\u", "\\u123", "\\u{}", "\\u{xyz}", "\\u{110000}", "\\u{123", "\\u{FFFFFFFFFFFFFFFF}"]) {
    for (const text of ["`a" + escape + "z`", "`ok${1}a" + escape + "z${2}tail`", "`ok${1}" + escape + "`"]) {
        const result = lex(text, true);
        check(result.error === null, "invalid cooked escape is lexically retained: " + text);
        let invalid = 0;
        for (const token of result.tokens) {
            if (token.cooked === null) { invalid++; check(token.raw !== undefined && token.raw.includes(escape), "invalid raw escape preserved"); }
        }
        check(invalid === 1, "one invalid template part");
        const prepared = prepareBoundedScript({ id: "invalid-template", text }, new Realm((_line: string) => {}, "script"));
        check(prepared.kind === "blocked", "ordinary template still rejects invalid escape");
    }
}
{
    const lexer = createLexer("`\\x${`inner${1}tail`}\\8${2}ok`", true);
    const head = lexer.next();
    check(head.kind === "template-head" && head.raw === "\\x" && head.cooked === null, "invalid head does not consume interpolation");
    check(lexer.next().raw === "inner", "nested head");
    check(lexer.next().text === "1" && lexer.next().raw === "tail", "nested tail");
    const middle = lexer.next();
    check(middle.kind === "template-middle" && middle.raw === "\\8" && middle.cooked === null, "invalid middle");
    check(lexer.next().text === "2", "later expression");
    const tail = lexer.next();
    check(tail.raw === "ok" && tail.cooked === "ok", "invalid cooked status resets per part");
    check(lexer.next().kind === "eof" && lexer.result().error === null, "nested template completion");
}
for (const text of ["`\\x", "`\\u{", "`\\8${1", "`\\x${1}"]) {
    const result = lex(text, true);
    check(result.error !== null && result.rejection !== null, "unterminated invalid template still fails");
}
for (const text of ["'\\xG0'", "'\\u{}'", "'\\u{110000}'"]) check(lex(text, true).error !== null, "string escape rejection unchanged");
console.log("template tokens passed");
