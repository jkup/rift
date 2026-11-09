import type { Rejection } from "./outcomes.js";
import type { Diagnostic, Location } from "./syntax.js";
export type Token = { kind: string; text: string; loc: Location; readonly start: number; readonly end: number; readonly cooked?: string };
export type LexResult = { tokens: Token[]; error: Diagnostic | null; rejection: Rejection | null };
function digit(c: string): boolean { return c >= "0" && c <= "9"; }
function digitValue(c: string): number {
    const code = c.charCodeAt(0);
    return code >= 48 && code <= 57 ? code - 48 : code >= 65 && code <= 70 ? code - 55 : code >= 97 && code <= 102 ? code - 87 : -1;
}
function letter(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
}
function lineTerminator(c: string): boolean {
    return c === "\r" || c === "\n" || c === "\u2028" || c === "\u2029";
}
export function lex(source: string, script = false): LexResult {
    const tokens: Token[] = [];
    let i = 0;
    let line = 1;
    let column = 1;
    let error: Diagnostic | null = null;
    let rejection: Rejection | null = null;
    const templates: number[] = [];
    function advance(): string {
        const c = source.charAt(i++);
        if (lineTerminator(c)) {
            // CRLF is one line boundary, including inside block comments.
            if (c !== "\n" || i < 2 || source.charAt(i - 2) !== "\r") line++;
            column = 1;
        } else {
            column++;
        }
        return c;
    }
    function fail(reason: Rejection, message: string, loc: Location): void {
        rejection = reason;
        error = { phase: "parse", name: "SyntaxError", message, loc };
    }
    function hexDigits(count: number, braced: boolean, loc: Location): number {
        let value = 0, digits = 0;
        while (i < source.length && (braced ? source.charAt(i) !== "}" : digits < count)) {
            const digit = digitValue(source.charAt(i));
            if (digit < 0) break;
            advance(); digits++; value = value * 16 + digit;
            if (value > 0x10ffff) break;
        }
        if (digits === 0 || value > 0x10ffff || (braced ? source.charAt(i) !== "}" : digits !== count)) {
            fail({ kind: "unsupported-syntax", capabilityCode: "lex.string-escape" }, "invalid template escape", loc);
            return 0;
        }
        if (braced) advance();
        return value;
    }
    function templatePart(initial: boolean, start: number, loc: Location): void {
        advance();
        let cooked = "";
        while (i < source.length && error === null) {
            let unit = advance();
            if (unit === "`") {
                tokens.push({ kind: initial ? "template" : "template-tail", text: source.slice(start, i), cooked, loc, start, end: i });
                if (!initial) templates.pop();
                return;
            }
            if (unit === "$" && source.charAt(i) === "{") {
                advance();
                tokens.push({ kind: initial ? "template-head" : "template-middle", text: source.slice(start, i), cooked, loc, start, end: i });
                if (initial) templates.push(0);
                if (templates.length > 128) fail({ kind: "resource-limit", guardCode: "parse-depth", count: templates.length, limit: 128 }, "syntax nesting limit exceeded", loc);
                return;
            }
            if (unit === "\\") {
                if (i === source.length) break;
                unit = advance();
                if (lineTerminator(unit)) {
                    if (unit === "\r" && source.charAt(i) === "\n") advance();
                    continue;
                }
                if (unit === "n") unit = "\n";
                else if (unit === "r") unit = "\r";
                else if (unit === "t") unit = "\t";
                else if (unit === "b") unit = "\b";
                else if (unit === "f") unit = "\f";
                else if (unit === "v") unit = "\v";
                else if (unit === "0" && !digit(source.charAt(i))) unit = "\0";
                else if (digit(unit)) fail({ kind: "unsupported-syntax", capabilityCode: "lex.string-escape" }, "invalid template escape", loc);
                else if (unit === "x" || unit === "u") {
                    const braced = unit === "u" && source.charAt(i) === "{";
                    if (braced) advance();
                    const value = hexDigits(unit === "x" ? 2 : 4, braced, loc);
                    unit = value <= 0xffff ? String.fromCharCode(value) : String.fromCharCode(0xd800 + Math.floor((value - 0x10000) / 1024), 0xdc00 + (value - 0x10000) % 1024);
                }
            } else if (unit === "\r") {
                if (source.charAt(i) === "\n") advance();
                unit = "\n";
            }
            cooked += unit;
        }
        if (error === null) fail({ kind: "unsupported-syntax", capabilityCode: "lex.indeterminate-string-end" }, "unterminated template", loc);
    }
    if (source.length > 100000) fail({ kind: "resource-limit", guardCode: "source-units", count: source.length, limit: 100000 }, "source exceeds 100000 UTF-16 units", { line, column });
    while (i < source.length && error === null) {
        const c = source.charAt(i);
        const loc = { line, column };
        const start = i;
        if (script && (c === "`" || (c === "}" && templates.length > 0 && templates[templates.length - 1] === 0))) {
            templatePart(c === "`", start, loc);
            continue;
        }
        if (c === " " || c === "\t" || lineTerminator(c)) {
            advance();
            continue;
        }
        if (c === "/" && source.charAt(i + 1) === "/") {
            while (i < source.length && !lineTerminator(source.charAt(i))) advance();
            continue;
        }
        if (c === "/" && source.charAt(i + 1) === "*") {
            advance();
            advance();
            while (i < source.length && !(source.charAt(i) === "*" && source.charAt(i + 1) === "/")) advance();
            if (i === source.length) fail({ kind: "unsupported-syntax", capabilityCode: "lex.indeterminate-comment" }, "unterminated comment", loc);
            else {
                advance();
                advance();
            }
            continue;
        }
        if (letter(c)) {
            let text = advance();
            while (letter(source.charAt(i)) || digit(source.charAt(i))) text += advance();
            tokens.push({ kind: "word", text, loc, start, end: i });
            continue;
        }
        if (digit(c) || (script && c === "." && digit(source.charAt(i + 1)))) {
            let text = advance();
            const prefix = source.charAt(i);
            let radix = 0;
            if (script && c === "0") {
                if (prefix === "x" || prefix === "X") radix = 16;
                else if (prefix === "o" || prefix === "O") radix = 8;
                else if (prefix === "b" || prefix === "B") radix = 2;
            }
            if (radix !== 0) {
                text += advance();
                const digitsStart = i;
                while (true) {
                    const value = digitValue(source.charAt(i));
                    if (value < 0 || value >= radix) break;
                    text += advance();
                }
                if (i === digitsStart || digit(source.charAt(i)) || letter(source.charAt(i)))
                    fail({ kind: "unsupported-syntax", capabilityCode: "lex.numeric-literal" }, "invalid radix numeric literal", loc);
                tokens.push({ kind: "number", text, loc, start, end: i });
                continue;
            }
            while (digit(source.charAt(i))) text += advance();
            if (text.length > 1 && text.charAt(0) === "0") fail({ kind: "unsupported-syntax", capabilityCode: "lex.leading-zero" }, "leading-zero numbers are unsupported", loc);
            if (c !== "." && source.charAt(i) === ".") {
                text += advance();
                while (digit(source.charAt(i))) text += advance();
            }
            if (script && (source.charAt(i) === "e" || source.charAt(i) === "E")) {
                text += advance();
                if (source.charAt(i) === "+" || source.charAt(i) === "-") text += advance();
                if (!digit(source.charAt(i))) fail({ kind: "unsupported-syntax", capabilityCode: "lex.numeric-literal" }, "decimal exponent requires digits", loc);
                while (digit(source.charAt(i))) text += advance();
            }
            if (letter(source.charAt(i))) fail({ kind: "unsupported-syntax", capabilityCode: "lex.numeric-literal" }, "unsupported numeric literal", loc);
            tokens.push({ kind: "number", text, loc, start, end: i });
            continue;
        }
        if (c === "'" || c === '"') {
            const quote = advance();
            let text = "";
            while (i < source.length && source.charAt(i) !== quote && error === null) {
                let unit = advance();
                // Unlike CR/LF, raw U+2028/U+2029 are allowed in modern JS strings.
                if (unit === "\n" || unit === "\r") {
                    fail({ kind: "unsupported-syntax", capabilityCode: "lex.indeterminate-string-newline" }, "newline in string", loc);
                    break;
                }
                if (unit === "\\") {
                    unit = advance();
                    if (unit === "n") unit = "\n";
                    else if (unit === "r") unit = "\r";
                    else if (unit === "t") unit = "\t";
                    else if (unit !== "\\" && unit !== "'" && unit !== '"') fail({ kind: "unsupported-syntax", capabilityCode: "lex.string-escape" }, "unsupported string escape", loc);
                }
                text += unit;
            }
            if (i >= source.length) fail({ kind: "unsupported-syntax", capabilityCode: "lex.indeterminate-string-end" }, "unterminated string", loc);
            else advance();
            tokens.push({ kind: "string", text, loc, start, end: i });
            continue;
        }
        const four = source.slice(i, i + 4);
        const three = source.slice(i, i + 3);
        const two = source.slice(i, i + 2);
        if (script && four === ">>>=") {
            advance();
            advance();
            advance();
            advance();
            tokens.push({ kind: "punct", text: four, loc, start, end: i });
        } else if (three === "===" || three === "!==" || (script && ["**=", "<<=", ">>=", ">>>", "..."].includes(three))) {
            advance();
            advance();
            advance();
            tokens.push({ kind: "punct", text: three, loc, start, end: i });
        } else if (script && ["++", "--", "**", "<<", ">>", "&=", "|=", "^="].includes(two)) {
            advance();
            advance();
            tokens.push({ kind: "punct", text: two, loc, start, end: i });
        } else if (["++", "--", "=>", "**", "<<", ">>", "?."].includes(two)) {
            fail({ kind: "unsupported-syntax", capabilityCode: "lex.operator" }, "unsupported operator: " + two, loc);
        } else if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "&&" || two === "||" || two === "+=" || two === "-=" || two === "*=" || two === "/=" || two === "%=") {
            advance();
            advance();
            tokens.push({ kind: "punct", text: two, loc, start, end: i });
        } else if ("{}();,.:?[]+-*/%<>=!".includes(c) || (script && "&|^~".includes(c))) {
            if (templates.length > 0 && (c === "{" || c === "}")) templates[templates.length - 1] += c === "{" ? 1 : -1;
            tokens.push({ kind: "punct", text: advance(), loc, start, end: i });
        } else { fail({ kind: "unsupported-syntax", capabilityCode: "lex.character" }, "unsupported character: " + c, loc); }
    }
    if (error === null && templates.length > 0) fail({ kind: "unsupported-syntax", capabilityCode: "lex.indeterminate-string-end" }, "unterminated template substitution", { line, column });
    tokens.push({ kind: "eof", text: "<eof>", loc: { line, column }, start: i, end: i });
    return { tokens, error, rejection };
}
