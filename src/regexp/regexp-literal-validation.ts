import { parseRegExpSyntax } from "./regexp-pattern-syntax.js";
import type { ResourceOrigin } from "../outcomes.js";

export type RegExpLiteralValidation =
    | { kind: "ready" }
    | { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "resource-limit"; origin: ResourceOrigin; message: string };

export function validateRegExpLiteral(pattern: string, flags: string): RegExpLiteralValidation {
    let seen = "";
    for (let i = 0; i < flags.length; i++) {
        const flag = flags.charAt(i);
        if (!"dgimsuvy".includes(flag) || seen.includes(flag)) {
            return { kind: "syntax-error", message: "invalid RegExp flags", offset: 0 };
        }
        seen += flag;
    }
    if (seen.includes("u") && seen.includes("v")) {
        return {
            kind: "syntax-error",
            message: "RegExp u and v flags are mutually exclusive",
            offset: 0,
        };
    }
    if (seen.includes("v")) {
        return { kind: "unsupported", message: "Unicode sets mode is unsupported", offset: 0 };
    }
    let steps = 0;
    const parsed = parseRegExpSyntax(pattern, () => ++steps <= 1000000, seen.includes("u"));
    if (parsed.kind === "stopped") {
        return {
            kind: "resource-limit",
            origin: { kind: "resource-limit", guardCode: "steps", count: steps, limit: 1000000 },
            message: "RegExp syntax validation budget exceeded",
        };
    }
    if (parsed.kind === "depth-limit") {
        return {
            kind: "resource-limit",
            origin: {
                kind: "resource-limit",
                guardCode: "parse-depth",
                count: parsed.count,
                limit: parsed.limit,
            },
            message: "RegExp nesting limit exceeded",
        };
    }
    return parsed.kind === "ready" ? { kind: "ready" } : parsed;
}
