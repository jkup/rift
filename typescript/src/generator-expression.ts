import type { BinaryExpr, ConditionalExpr, Expr } from "./syntax.js";
import type { Value } from "./runtime.js";

export type GeneratorExpressionFrame = { kind: "left"; expression: BinaryExpr }
    | { kind: "right"; expression: BinaryExpr; left: Value }
    | { kind: "conditional"; expression: ConditionalExpr }
    | { kind: "branch"; expression: ConditionalExpr };
export function isSuspendingGeneratorExpression(expression: Expr | null): boolean {
    return expression !== null && (expression.kind === "yield" ||
        ((expression.kind === "binary" || expression.kind === "conditional") && expression.suspends === true));
}
