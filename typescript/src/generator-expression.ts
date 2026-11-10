import type { BinaryExpr, ConditionalExpr, UnaryExpr, Expr } from "./syntax.js";
import type { Value } from "./runtime.js";

export type GeneratorExpressionFrame = { kind: "left"; expression: BinaryExpr }
    | { kind: "right"; expression: BinaryExpr; left: Value }
    | { kind: "conditional"; expression: ConditionalExpr }
    | { kind: "branch"; expression: ConditionalExpr }
    | { kind: "unary"; expression: UnaryExpr };
export function isSuspendingGeneratorExpression(expression: Expr | null): boolean {
    return expression !== null && (expression.kind === "yield" ||
        ((expression.kind === "binary" || expression.kind === "conditional" || expression.kind === "unary") && expression.suspends === true));
}
