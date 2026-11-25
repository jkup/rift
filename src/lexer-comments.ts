export function lineTerminator(c: string): boolean {
    return c === "\r" || c === "\n" || c === "\u2028" || c === "\u2029";
}

// Return the end offset, the start offset when no comment is present, or -1
// for an unterminated block comment. The lexer advances over the result so
// comment newlines still update locations and automatic semicolon insertion.
export function commentEnd(
    source: string,
    start: number,
    script: boolean,
    lineHasToken: boolean,
): number {
    if (source.startsWith("/*", start)) {
        const close = source.indexOf("*/", start + 2);
        return close === -1 ? -1 : close + 2;
    }
    const singleLine =
        source.startsWith("//", start) ||
        (script && source.startsWith("<!--", start)) ||
        (script && !lineHasToken && source.startsWith("-->", start));
    if (!singleLine) {
        return start;
    }
    let end = start;
    while (end < source.length && !lineTerminator(source.charAt(end))) {
        end++;
    }
    return end;
}
