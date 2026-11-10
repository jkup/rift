import type { CallExpr, MemberExpr, BinaryExpr, ConditionalExpr, UnaryExpr, GeneratorYieldStmt, AwaitExpr, Expr } from "./syntax.js";
import type { Value } from "./runtime.js";

export type GeneratorExpressionFrame = { kind: "left"; expression: BinaryExpr }
    | { kind: "call-argument"; expression: CallExpr; callee: Value; receiver: Value; directEval: boolean; values: Value[]; index: number }
    | { kind: "member-base"; expression: MemberExpr }
    | { kind: "member-key"; expression: MemberExpr; base: Value }
    | { kind: "right"; expression: BinaryExpr; left: Value }
    | { kind: "conditional"; expression: ConditionalExpr }
    | { kind: "branch"; expression: ConditionalExpr }
    | { kind: "unary"; expression: UnaryExpr }
    | { kind: "yield-operand"; expression: GeneratorYieldStmt }
    | { kind: "await-operand"; expression: AwaitExpr };
export function isSuspendingGeneratorExpression(expression: Expr | null): boolean {
    return expression !== null && (expression.kind === "yield" || expression.kind === "await" ||
        ((expression.kind === "call" || expression.kind === "member" || expression.kind === "binary" || expression.kind === "conditional" || expression.kind === "unary") && expression.suspends === true));
}
