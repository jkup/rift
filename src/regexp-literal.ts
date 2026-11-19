export type RegExpLiteralScan =
    | { kind: "ready"; pattern: string; flags: string; start: number; end: number }
    | { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "resource-limit"; count: number; limit: number };

function lineTerminator(unit: string): boolean {
    return unit === "\n" || unit === "\r" || unit === "\u2028" || unit === "\u2029";
}
function asciiIdentifierPart(unit: string): boolean {
    return (
        (unit >= "a" && unit <= "z") ||
        (unit >= "A" && unit <= "Z") ||
        (unit >= "0" && unit <= "9") ||
        unit === "$" ||
        unit === "_"
    );
}

export function scanRegExpLiteral(source: string, start: number): RegExpLiteralScan {
    if (!Number.isInteger(start) || start < 0 || source.charAt(start) !== "/") {
        throw new Error("RegExp scan requires a slash offset");
    }
    if (source.length > 100000) {
        return { kind: "resource-limit", count: source.length, limit: 100000 };
    }
    let position = start + 1,
        inClass = false;
    if (source.charAt(position) === "/" || source.charAt(position) === "*") {
        return {
            kind: "syntax-error",
            message: "comment opener is not a regular expression literal",
            offset: position,
        };
    }
    while (position < source.length) {
        const unit = source.charAt(position);
        if (lineTerminator(unit)) {
            return {
                kind: "syntax-error",
                message: "line terminator in regular expression literal",
                offset: position,
            };
        }
        if (unit === "\\") {
            position++;
            if (position === source.length || lineTerminator(source.charAt(position))) {
                return {
                    kind: "syntax-error",
                    message: "unterminated regular expression escape",
                    offset: position,
                };
            }
            position++;
            continue;
        }
        if (unit === "/" && !inClass) {
            const bodyEnd = position++;
            const flagsStart = position;
            while (asciiIdentifierPart(source.charAt(position))) {
                position++;
            }
            if (source.charCodeAt(position) > 127 && !lineTerminator(source.charAt(position))) {
                return {
                    kind: "unsupported",
                    message: "non-ASCII regular expression flag boundary",
                    offset: position,
                };
            }
            return {
                kind: "ready",
                pattern: source.slice(start + 1, bodyEnd),
                flags: source.slice(flagsStart, position),
                start,
                end: position,
            };
        }
        if (unit === "[") {
            inClass = true;
        } else if (unit === "]") {
            inClass = false;
        }
        position++;
    }
    return {
        kind: "syntax-error",
        message: "unterminated regular expression literal",
        offset: position,
    };
}
