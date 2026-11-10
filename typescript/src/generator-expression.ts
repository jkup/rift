import type { BinaryExpr, Expr } from "./syntax.js";
import type { Value } from "./runtime.js";

export type GeneratorBinaryFrame = { kind: "left"; expression: BinaryExpr }
    | { kind: "right"; expression: BinaryExpr; left: Value };
export function isSuspendingGeneratorExpression(expression: Expr | null): boolean {
    return expression !== null && (expression.kind === "yield" ||
        (expression.kind === "binary" && expression.suspends === true));
}
