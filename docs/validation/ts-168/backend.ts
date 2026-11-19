const patterns: string[] = ["a(b)?", "(?<word>a+)", "(?<=a)b", "(a)\\1", "[a-z]+", ".", "(?:)"];
const inputs: string[] = ["a ab", "xaaay", "ab", "aa", "AZabc", "😀", "a"];
for (let i = 0; i < patterns.length; i++) {
    const expression = new RegExp(patterns[i], "g");
    const match = expression.exec(inputs[i]);
    if (match === null) console.log(i, "null");
    else console.log(i, match[0], match.length, match.index, match.input, expression.lastIndex, match[1]);
}
for (const flags of ["", "u", "y", "uy", "s", "m", "i", "d", "v"]) {
    try {
        const expression = new RegExp(".", flags);
        const match = expression.exec("😀\n");
        console.log("flag", flags, expression.flags, match === null ? -1 : match[0].length, expression.lastIndex);
    } catch (error) { console.log("flag", flags, error instanceof Error ? error.name : "host error"); }
}
for (const pattern of ["[", "(?<a>x)(?<a>y)", "\\u{1F600}", "\ud800", "\u0000", ""]) {
    try {
        const expression = new RegExp(pattern, "u");
        const match = expression.exec("😀\ud800\u0000");
        console.log("source", expression.source, match === null ? -1 : match.index, match === null ? -1 : match[0].length);
    } catch (error) { console.log("source", error instanceof Error ? error.name : "host error"); }
}
const sticky = new RegExp("a", "y");
sticky.lastIndex = 1;
console.log("sticky", sticky.test("ba"), sticky.lastIndex, sticky.test("ba"), sticky.lastIndex);
const global = new RegExp("a", "g");
global.lastIndex = 1;
console.log("global", global.test("ba"), global.lastIndex, global.test("ba"), global.lastIndex);
