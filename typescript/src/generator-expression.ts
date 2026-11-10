import type { EvaluationReference } from "./evaluation-reference.js";
import type { UpdateExpr, CompoundExpr, AssignExpr, ObjectExpr, TemplateExpr, NewExpr, ArrayExpr, CallExpr, MemberExpr, BinaryExpr, ConditionalExpr, UnaryExpr, GeneratorYieldStmt, AwaitExpr, Expr } from "./syntax.js";
import type { GuestObject, PropertyKey, Value } from "./runtime.js";

export type GeneratorExpressionFrame = { kind: "left"; expression: BinaryExpr }
    | { kind: "compound-value"; expression: CompoundExpr; reference: EvaluationReference; left: Value }
    | { kind: "update-base"; expression: UpdateExpr }
    | { kind: "update-key"; expression: UpdateExpr; base: Value }
    | { kind: "assignment-base"; expression: AssignExpr | CompoundExpr }
    | { kind: "assignment-key"; expression: AssignExpr | CompoundExpr; base: Value }
    | { kind: "assignment-value"; expression: AssignExpr; reference: EvaluationReference }
    | { kind: "object-property"; expression: ObjectExpr; object: GuestObject; index: number; stage: "next" | "key" | "ready" | "value"; key: PropertyKey | null }
    | { kind: "template-substitution"; expression: TemplateExpr; index: number; text: string }
    | { kind: "array-element"; expression: ArrayExpr; object: GuestObject; index: number; nextIndex: number }
    | { kind: "call-target"; expression: CallExpr; receiver: Value }
    | { kind: "call-base"; expression: CallExpr }
    | { kind: "call-key"; expression: CallExpr; base: Value }
    | { kind: "constructor"; expression: NewExpr }
    | { kind: "call-argument"; expression: CallExpr | NewExpr; callee: Value; receiver: Value; directEval: boolean; values: Value[]; index: number }
    | { kind: "member-base"; expression: MemberExpr }
    | { kind: "member-key"; expression: MemberExpr; base: Value }
    | { kind: "right"; expression: BinaryExpr; left: Value }
    | { kind: "conditional"; expression: ConditionalExpr }
    | { kind: "branch"; expression: ConditionalExpr }
    | { kind: "delete-base"; expression: UnaryExpr }
    | { kind: "delete-key"; expression: UnaryExpr; base: Value }
    | { kind: "unary"; expression: UnaryExpr }
    | { kind: "yield-operand"; expression: GeneratorYieldStmt }
    | { kind: "await-operand"; expression: AwaitExpr };
export function isSuspendingGeneratorExpression(expression: Expr | null): boolean {
    return expression !== null && (expression.kind === "yield" || expression.kind === "await" ||
        ((expression.kind === "array" || expression.kind === "update" || expression.kind === "compound" || expression.kind === "assign" || expression.kind === "object" || expression.kind === "template" || expression.kind === "new" || expression.kind === "call" || expression.kind === "member" || expression.kind === "binary" || expression.kind === "conditional" || expression.kind === "unary") && expression.suspends === true));
}
