import { lex, createLexer } from "../src/lexer.js";
import { scanPrivateIdentifier } from "../src/private-identifier.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const slash = String.fromCharCode(92);
const valid: [string, string][] = [
    ["#x", "#x"], ["#if", "#if"], ["#await", "#await"], ["#$", "#$"], ["#_0", "#_0"],
    ["#π", "#π"], ["#𐐀", "#𐐀"], ["#á", "#á"], ["#a\u200c\u200d", "#a\u200c\u200d"],
    ["#" + slash + "u0078", "#x"], ["#" + slash + "u{78}", "#x"],
    ["#" + slash + "u{10400}", "#𐐀"], ["#a" + slash + "u0030", "#a0"],
    ["#a" + slash + "u200C", "#a\u200c"], ["#" + slash + "u{000000000078}", "#x"],
    ["#x" + slash + "u{10400}z", "#x𐐀z"],
];
for (const [spelling, text] of valid) {
    const source = "\r\n  " + spelling + ";", result = lex(source, true);
    check(result.error === null && result.tokens.length === 3, "valid private token " + spelling);
    const token = result.tokens[0];
    check(token.kind === "private-identifier" && token.text === text, "decoded private name");
    check(token.start === 4 && token.end === 4 + spelling.length && token.loc.line === 2 && token.loc.column === 3, "UTF-16 span/location");
    check(source.slice(token.start, token.end) === spelling, "original spelling retained");
    check(result.tokens[1].loc.column === 3 + spelling.length, "following token column");
    const incremental = createLexer(source, true);
    check(incremental.next().text === text && incremental.next().text === ";" && incremental.next().kind === "eof", "incremental scan");
    check(incremental.next().kind === "eof" && incremental.result().error === null, "stable end");
    check(lex(spelling).error !== null, "legacy private syntax remains unsupported");
}
const invalid = ["#", "#0", "#́", "#\u200c", "#😀", "#\ud800", "# ", "#\n", "##x",
    "#" + slash + "x61", "#" + slash + "u", "#" + slash + "u000", "#" + slash + "u00xz",
    "#" + slash + "u{}", "#" + slash + "u{110000}", "#" + slash + "u{61", "#" + slash + "u{D800}",
    "#" + slash + "uD801" + slash + "uDC00", "#" + slash + "u0030", "#x" + slash + "u0020"];
for (const source of invalid) {
    const result = lex(source, true);
    check(result.error !== null && result.error.phase === "parse" && result.rejection?.kind === "unsupported-syntax", "invalid private token");
}
const composed = lex("#é #é", true);
check(composed.error === null && composed.tokens[0].text !== composed.tokens[1].text, "no Unicode normalization");
const sequence = lex("obj?.#x / #y; /* #ignored */ '#string'", true);
check(sequence.error === null && sequence.tokens.filter(token => token.kind === "private-identifier").length === 2, "punctuation and comment boundaries");
const template = lex("`#text ${obj.#x}`", true);
check(template.error === null && template.tokens.filter(token => token.kind === "private-identifier").length === 1, "template expression boundary");
const raw = "#" + "a".repeat(99999), long = lex(raw, true);
check(long.error === null && long.tokens[0].end === 100000, "source limit boundary");
check(lex(raw + "a", true).rejection?.kind === "resource-limit", "source budget before scan");
const direct = scanPrivateIdentifier("a#𐐀!", 1);
check(direct.kind === "ready" && direct.text === "#𐐀" && direct.end === 4, "standalone scanner offset");
for (const text of ["class A { #x; }", "class A { read(o){return o.#x} }", "#x in {}"])
    check((prepareBoundedScript({id:"private-lexing-boundary",text},new Realm((_line: string) => {},"script")).kind === "ready") === (text === "class A { #x; }"), "private declaration admitted; unresolved names and brand checks blocked");
console.log("private identifier lexing passed");
