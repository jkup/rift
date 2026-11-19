function units(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) result += (i === 0 ? "" : ",") + text.charCodeAt(i);
    return result;
}
for (const source of [".", "\\u{1F600}", "\ud800", "\u0000", "(?<word>a+)(b)?", "[\\p{ASCII}&&\\p{Letter}]+", "[\\q{ab|cd}]"]) {
    const flags = source.includes("&&") || source.includes("\\q") ? "v" : "u";
    try {
        const expression = new RegExp(source, flags);
        const match = expression.exec("😀\ud800\u0000aaacdab");
        if (match === null) console.log("miss", units(source));
        else {
            console.log("match", units(source), units(match[0]), match.index, match.length);

        }
    } catch (error) { console.log("error", units(source), error instanceof Error ? error.name + ":" + error.message : "unknown"); }
}
