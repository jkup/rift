import { resourceFailure, type OperationContext, type ThrowCompletion } from "../runtime.js";
import type { Location } from "../syntax.js";
import { parseRegExpSyntax, type RegExpPattern } from "./regexp-pattern-syntax.js";
export type {
    RegExpClassPart,
    RegExpAtom,
    RegExpTerm,
    RegExpDisjunction,
    RegExpPattern,
} from "./regexp-pattern-syntax.js";

export type RegExpParseFailure =
    | { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "abrupt"; completion: ThrowCompletion };
export type RegExpParseResult = { kind: "ready"; pattern: RegExpPattern } | RegExpParseFailure;

export function parseRegExpPattern(
    source: string,
    context: OperationContext,
    loc: Location,
    unicode = false,
): RegExpParseResult {
    let stopped: ThrowCompletion | null = null;
    const result = parseRegExpSyntax(
        source,
        () => {
            const completion = context.tick(loc);
            if (completion.type === "throw") {
                stopped = completion;
                return false;
            }
            return true;
        },
        unicode,
    );
    if (result.kind === "stopped") {
        if (stopped === null) {
            throw new Error("RegExp syntax stop invariant");
        }
        return { kind: "abrupt", completion: stopped };
    }
    if (result.kind === "depth-limit") {
        return {
            kind: "abrupt",
            completion: resourceFailure(
                "parse-depth",
                result.count,
                result.limit,
                "RegExp nesting limit exceeded",
                loc,
            ),
        };
    }
    return result;
}
