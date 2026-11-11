import { unicodeIdentifierStart, unicodeIdentifierContinue } from "./unicode-identifiers.js";

export type PrivateIdentifierScan = { kind: "ready"; text: string; end: number } | { kind: "invalid"; offset: number };

function hex(code: number): number {
    return code >= 48 && code <= 57 ? code - 48 : code >= 65 && code <= 70 ? code - 55 : code >= 97 && code <= 102 ? code - 87 : -1;
}

function escape(source: string, start: number): { code: number; end: number } | null {
    if (source.charAt(start + 1) !== "u") return null;
    let i = start + 2, code = 0, digits = 0;
    const braced = source.charAt(i) === "{";
    if (braced) i++;
    while (i < source.length && (braced ? source.charAt(i) !== "}" : digits < 4)) {
        const value = hex(source.charCodeAt(i));
        if (value < 0) return null;
        code = code * 16 + value;
        if (code > 0x10ffff) return null;
        digits++; i++;
    }
    if (braced ? digits === 0 || source.charAt(i) !== "}" : digits !== 4) return null;
    return { code, end: braced ? i + 1 : i };
}

export function scanPrivateIdentifier(source: string, start: number): PrivateIdentifierScan {
    if (source.charAt(start) !== "#") throw new Error("private identifier scan requires hash");
    let i = start + 1, rawStart = i, text = "#", first = true;
    while (i < source.length) {
        const escaped = source.charAt(i) === "\\";
        const point = escaped ? escape(source, i) : null;
        if (escaped && point === null) return { kind: "invalid", offset: i };
        const code = point === null ? source.codePointAt(i) ?? -1 : point.code;
        const valid = code === 36 || code === 95 || (first ? unicodeIdentifierStart(code) : unicodeIdentifierContinue(code));
        if (!valid) {
            if (first || escaped) return { kind: "invalid", offset: i };
            break;
        }
        const end = point === null ? i + (code > 0xffff ? 2 : 1) : point.end;
        if (escaped) { text += source.slice(rawStart, i) + String.fromCodePoint(code); rawStart = end; }
        i = end;
        first = false;
    }
    return first ? { kind: "invalid", offset: i } : { kind: "ready", text: text + source.slice(rawStart, i), end: i };
}
