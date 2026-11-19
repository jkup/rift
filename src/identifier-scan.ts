import { unicodeIdentifierStart, unicodeIdentifierContinue } from "./unicode-identifiers.js";

export type IdentifierScan =
    | { kind: "ready"; text: string; end: number; escaped: boolean }
    | { kind: "invalid"; offset: number };

export function identifierStart(code: number): boolean {
    return (
        code === 36 ||
        code === 95 ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122) ||
        (code > 127 && unicodeIdentifierStart(code))
    );
}
function identifierContinue(code: number): boolean {
    return (
        identifierStart(code) ||
        (code >= 48 && code <= 57) ||
        (code > 127 && unicodeIdentifierContinue(code))
    );
}
function hex(code: number): number {
    if (code >= 48 && code <= 57) {
        return code - 48;
    } else if (code >= 65 && code <= 70) {
        return code - 55;
    } else if (code >= 97 && code <= 102) {
        return code - 87;
    } else {
        return -1;
    }
}
function escape(source: string, start: number): { code: number; end: number } | null {
    if (source.charAt(start + 1) !== "u") {
        return null;
    }
    let i = start + 2,
        code = 0,
        digits = 0;
    const braced = source.charAt(i) === "{";
    if (braced) {
        i++;
    }
    while (i < source.length && (braced ? source.charAt(i) !== "}" : digits < 4)) {
        const value = hex(source.charCodeAt(i));
        if (value < 0) {
            return null;
        }
        code = code * 16 + value;
        if (code > 0x10ffff) {
            return null;
        }
        digits++;
        i++;
    }
    if (braced ? digits === 0 || source.charAt(i) !== "}" : digits !== 4) {
        return null;
    }
    return { code, end: braced ? i + 1 : i };
}

export function scanIdentifier(source: string, start: number): IdentifierScan {
    let i = start,
        rawStart = start,
        text = "",
        first = true,
        hasEscape = false;
    while (i < source.length) {
        const escaped = source.charAt(i) === "\\";
        const point = escaped ? escape(source, i) : null;
        if (escaped && point === null) {
            return { kind: "invalid", offset: i };
        }
        const code = point === null ? (source.codePointAt(i) ?? -1) : point.code;
        if (!(first ? identifierStart(code) : identifierContinue(code))) {
            if (first || escaped) {
                return { kind: "invalid", offset: i };
            }
            break;
        }
        const end = point === null ? i + (code > 0xffff ? 2 : 1) : point.end;
        if (escaped) {
            text += source.slice(rawStart, i) + String.fromCodePoint(code);
            rawStart = end;
            hasEscape = true;
        }
        i = end;
        first = false;
    }
    return first
        ? { kind: "invalid", offset: i }
        : { kind: "ready", text: text + source.slice(rawStart, i), end: i, escaped: hasEscape };
}
