import type { Token } from "./lexer.js";
import type { StrictnessMetadata, DirectiveMetadata } from "./script-metadata.js";

export function lineTerminatorBetween(text: string, previous: Token, next: Token): boolean {
    for (let i = previous.end; i < next.start; i++) {
        const c = text.charAt(i);
        if (c === "\r" || c === "\n" || c === "\u2028" || c === "\u2029") return true;
    }
    return false;
}
function continuesStringExpression(token: Token): boolean {
    if (token.kind === "template" || token.kind === "template-head") return true;
    if (token.kind === "word") return token.text === "in" || token.text === "instanceof";
    return token.kind === "punct" && ["(", "[", ".", "?.", "?", ",", "+", "-", "*", "/", "%", "**", "<<", ">>", ">>>",
        "<", ">", "<=", ">=", "==", "!=", "===", "!==", "&", "|", "^", "&&", "||", "=", "+=", "-=", "*=", "/=", "%=", "**=", "&=", "|=", "^=", "<<=", ">>=", ">>>="].includes(token.text);
}
export function scriptPrologue(text: string, tokens: Token[], index: number, inheritedStrict: boolean): StrictnessMetadata {
    const directives: DirectiveMetadata[] = [];
    let ownStrict = false;
    while (tokens[index].kind === "string") {
        const token = tokens[index], next = tokens[index + 1];
        const explicit = next.kind === "punct" && next.text === ";";
        if (!explicit && next.kind !== "eof" && !(next.kind === "punct" && next.text === "}") &&
            (!lineTerminatorBetween(text, token, next) || continuesStringExpression(next))) break;
        const raw = text.slice(token.start, token.end);
        const useStrict = raw === '"use strict"' || raw === "'use strict'";
        directives.push({ start: token.start, end: token.end, statementEnd: explicit ? next.end : token.end,
            loc: token.loc, raw, useStrict });
        ownStrict = ownStrict || useStrict;
        index += explicit ? 2 : 1;
    }
    return { ownStrict, inheritedStrict, strict: ownStrict || inheritedStrict, directives };
}
