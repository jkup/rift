import type { Diagnostic, Location } from "./syntax.js";
export type Token = { kind: string; text: string; loc: Location };
export type LexResult = { tokens: Token[]; error: Diagnostic | null };
function digit(c: string): boolean { return c >= "0" && c <= "9"; }
function letter(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
}
export function lex(source: string): LexResult {
    const tokens: Token[] = [];
    let i = 0;
    let line = 1;
    let column = 1;
    let error: Diagnostic | null = null;
    function advance(): string {
        const c = source.charAt(i++);
        if (c === "\r") { line++; column = 1; }
        else if (c === "\n") { if (i < 2 || source.charAt(i - 2) !== "\r") line++; column = 1; }
        else { column++; }
        return c;
    }
    function fail(message: string, loc: Location): void {
        error = { phase: "parse", name: "SyntaxError", message, loc };
    }
    if (source.length > 100000) fail("source exceeds 100000 UTF-16 units", { line, column });
    while (i < source.length && error === null) {
        const c = source.charAt(i);
        const loc = { line, column };
        if (c === " " || c === "\t" || c === "\r" || c === "\n") { advance(); continue; }
        if (c === "/" && source.charAt(i + 1) === "/") {
            while (i < source.length && source.charAt(i) !== "\n" && source.charAt(i) !== "\r") advance();
            continue;
        }
        if (c === "/" && source.charAt(i + 1) === "*") {
            advance(); advance();
            while (i < source.length && !(source.charAt(i) === "*" && source.charAt(i + 1) === "/")) advance();
            if (i === source.length) fail("unterminated comment", loc);
            else { advance(); advance(); }
            continue;
        }
        if (letter(c)) {
            let text = advance();
            while (letter(source.charAt(i)) || digit(source.charAt(i))) text += advance();
            tokens.push({ kind: "word", text, loc });
            continue;
        }
        if (digit(c)) {
            let text = advance();
            while (digit(source.charAt(i))) text += advance();
            if (text.length > 1 && text.charAt(0) === "0") fail("leading-zero numbers are unsupported", loc);
            if (source.charAt(i) === ".") {
                text += advance();
                while (digit(source.charAt(i))) text += advance();
            }
            if (letter(source.charAt(i))) fail("unsupported numeric literal", loc);
            tokens.push({ kind: "number", text, loc });
            continue;
        }
        if (c === "'" || c === '"') {
            const quote = advance();
            let text = "";
            while (i < source.length && source.charAt(i) !== quote && error === null) {
                let unit = advance();
                if (unit === "\n" || unit === "\r") { fail("newline in string", loc); break; }
                if (unit === "\\") {
                    unit = advance();
                    if (unit === "n") unit = "\n";
                    else if (unit === "r") unit = "\r";
                    else if (unit === "t") unit = "\t";
                    else if (unit !== "\\" && unit !== "'" && unit !== '"') fail("unsupported string escape", loc);
                }
                text += unit;
            }
            if (i >= source.length) fail("unterminated string", loc); else advance();
            tokens.push({ kind: "string", text, loc });
            continue;
        }
        const three = source.slice(i, i + 3);
        const two = source.slice(i, i + 2);
        if (three === "===" || three === "!==") {
            advance(); advance(); advance(); tokens.push({ kind: "punct", text: three, loc });
        } else if (["++", "--", "==", "!=", "=>", "+=", "-=", "*=", "/=", "%=", "**", "<<", ">>", "?."].includes(two)) {
            fail("unsupported operator: " + two, loc);
        } else if (two === "<=" || two === ">=" || two === "&&" || two === "||") {
            advance(); advance(); tokens.push({ kind: "punct", text: two, loc });
        } else if ("{}();,.:[]+-*/%<>=!".includes(c)) {
            tokens.push({ kind: "punct", text: advance(), loc });
        } else { fail("unsupported character: " + c, loc); }
    }
    tokens.push({ kind: "eof", text: "<eof>", loc: { line, column } });
    return { tokens, error };
}
