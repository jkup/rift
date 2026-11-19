import { scanRegExpLiteral } from "../src/regexp-literal.js";

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function ready(source: string, pattern: string, flags: string, end: number, start = 0): void {
    const result = scanRegExpLiteral(source, start);
    check(result.kind === "ready", "literal scans: " + source);
    if (result.kind !== "ready") throw new Error("ready scan invariant");
    check(result.pattern === pattern && result.flags === flags, "raw body and flags: " + source);
    check(result.start === start && result.end === end, "UTF-16 range: " + source);
}
ready("/a/g.test('a')", "a", "g", 4);
ready("/=a/y", "=a", "y", 5);
ready("/(?:)/", "(?:)", "", 6);
ready("/[/]/", "[/]", "", 5);
ready("/[/*]/g", "[/*]", "g", 7);
ready("/[[]/", "[[]", "", 5);
ready("/[]]/", "[]]", "", 5);
ready("/[\\]/]/", "[\\]/]", "", 7);
ready("/a\\/b/gi", "a\\/b", "gi", 8);
ready("/\\\\/g", "\\\\", "g", 5);
ready("/\\u0061\\n/", "\\u0061\\n", "", 10);
ready("/'\"`${}()}/", "'\"`${}()}", "", 11);
ready("/a/gg0$_z", "a", "gg0$_z", 9);
ready("/a/\\u0067", "a", "", 3);
ready("/a/\u2028x", "a", "", 3);
ready("/a/\u2029x", "a", "", 3);
ready("/😀/", "😀", "", 4);
ready("/\ud800/", "\ud800", "", 3);
ready("/\0/", "\0", "", 3);
ready("x = /a/g;", "a", "g", 8, 4);
ready("/a/ / 2", "a", "", 3);
ready("/a//*comment*/", "a", "", 3);
for (const source of ["/", "/a", "/a\\", "/[", "/[/", "/[a/", "/[\\]/", "//", "/**/"]) {
    check(scanRegExpLiteral(source, 0).kind === "syntax-error", "invalid delimiter form: " + source);
}
for (const line of ["\n", "\r", "\u2028", "\u2029"]) {
    for (const prefix of ["/a", "/[a", "/a\\", "/[a\\"]) {
        const result = scanRegExpLiteral(prefix + line + "/", 0);
        check(result.kind === "syntax-error" && result.offset === prefix.length, "line terminator rejected inside body/escape/class");
    }
}
for (const suffix of ["é", "😀", "\u200c", "\u00a0"]) {
    const result = scanRegExpLiteral("/a/g" + suffix, 0);
    check(result.kind === "unsupported" && result.offset === 4, "Unicode flag boundary stays explicit");
}
const maximum = "/" + "a".repeat(99998) + "/";
ready(maximum, "a".repeat(99998), "", 100000);
const limited = scanRegExpLiteral(maximum + "g", 0);
check(limited.kind === "resource-limit" && limited.count === 100001 && limited.limit === 100000, "source-size budget");
console.log("RegExp literal scan passed");
