import type { Token } from "./lexer.js";
import type { StrictnessMetadata, DirectiveMetadata } from "./script-metadata.js";
export function scriptPrologue(text: string, tokens: Token[], index: number, inheritedStrict: boolean): StrictnessMetadata {
    const directives: DirectiveMetadata[] = [];
    let ownStrict = false;
    // In the admitted grammar an unparenthesized StringLiteral immediately
    // followed by ';' is exactly a directive ExpressionStatement. ASI and
    // unsupported escapes have already failed the whole-source parser gate.
    while (tokens[index].kind === "string" && tokens[index + 1].text === ";" && tokens[index + 1].kind === "punct") {
        const token = tokens[index];
        const raw = text.slice(token.start, token.end);
        const useStrict = raw === '"use strict"' || raw === "'use strict'";
        directives.push({ start: token.start, end: token.end, statementEnd: tokens[index + 1].end,
            loc: token.loc, raw, useStrict });
        ownStrict = ownStrict || useStrict;
        index += 2;
    }
    return { ownStrict, inheritedStrict, strict: ownStrict || inheritedStrict, directives };
}
