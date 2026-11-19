import type { ScriptFrameSnapshot } from "./script-execution-internal.js";
import type { ScriptEnvironment, ScriptDeclarativeEnvironment } from "./script-environment.js";
import type { EvaluationReference, ExpressionResult } from "./evaluation-reference.js";
import type {
    DestructuringPattern,
    PrivateInExpr,
    ClassExpr,
    ChainExpr,
    ChainCallLink,
    DestructureExpr,
    SuperCallExpr,
    SuperMemberExpr,
    UpdateExpr,
    CompoundExpr,
    AssignExpr,
    ObjectExpr,
    TemplateExpr,
    NewExpr,
    ArrayExpr,
    CallExpr,
    MemberExpr,
    BinaryExpr,
    ConditionalExpr,
    UnaryExpr,
    GeneratorYieldStmt,
    AwaitExpr,
    Expr,
} from "./syntax.js";
import type { GuestObject, PropertyKey, Value } from "./runtime.js";

export type ChainConsumer =
    | { kind: "value" }
    | { kind: "call"; expression: CallExpr }
    | { kind: "delete"; expression: UnaryExpr }
    | { kind: "chain"; expression: ChainExpr; consumer: ChainConsumer };
export type SuperPropertyOperation =
    | { kind: "read" }
    | { kind: "call"; expression: CallExpr }
    | { kind: "assignment"; expression: AssignExpr }
    | { kind: "compound"; expression: CompoundExpr }
    | { kind: "update"; expression: UpdateExpr }
    | { kind: "delete"; expression: UnaryExpr }
    | { kind: "chain"; expression: ChainExpr; consumer: ChainConsumer };
export type GeneratorExpressionFrame =
    | { kind: "left"; expression: BinaryExpr }
    | {
          kind: "class-scope";
          expression: ClassExpr;
          outer: ScriptFrameSnapshot;
          frame: ScriptFrameSnapshot;
      }
    | {
          kind: "class-constructor";
          expression: ClassExpr;
          environment: ScriptDeclarativeEnvironment;
          scopeId: number;
          name: string | null;
      }
    | {
          kind: "class-element";
          expression: ClassExpr;
          environment: ScriptDeclarativeEnvironment;
          constructor: GuestObject;
          prototype: GuestObject;
          index: number;
          stage: "next" | "key";
      }
    | { kind: "chain-evaluate"; expression: ChainExpr; consumer: ChainConsumer }
    | { kind: "chain-base-value"; expression: ChainExpr; consumer: ChainConsumer }
    | { kind: "chain-reference-base"; expression: ChainExpr; consumer: ChainConsumer }
    | { kind: "chain-reference-key"; expression: ChainExpr; consumer: ChainConsumer; base: Value }
    | {
          kind: "chain-step";
          expression: ChainExpr;
          consumer: ChainConsumer;
          index: number;
          result: ExpressionResult;
      }
    | {
          kind: "chain-key";
          expression: ChainExpr;
          consumer: ChainConsumer;
          index: number;
          base: Value;
      }
    | { kind: "chain-called"; expression: ChainExpr; consumer: ChainConsumer; index: number }
    | { kind: "destructure-value"; expression: DestructureExpr }
    | {
          kind: "compound-value";
          expression: CompoundExpr;
          reference: EvaluationReference;
          left: Value;
      }
    | {
          kind: "super-key";
          expression: SuperMemberExpr;
          operation: SuperPropertyOperation;
          homeObject: GuestObject;
          receiver: Value;
      }
    | { kind: "private-in-value"; expression: PrivateInExpr }
    | { kind: "private-base"; expression: MemberExpr; operation: SuperPropertyOperation }
    | { kind: "update-base"; expression: UpdateExpr }
    | { kind: "update-key"; expression: UpdateExpr; base: Value }
    | { kind: "assignment-base"; expression: AssignExpr | CompoundExpr }
    | { kind: "assignment-key"; expression: AssignExpr | CompoundExpr; base: Value }
    | { kind: "assignment-value"; expression: AssignExpr; reference: EvaluationReference }
    | {
          kind: "object-property";
          expression: ObjectExpr;
          object: GuestObject;
          index: number;
          stage: "next" | "key" | "ready" | "value";
          key: PropertyKey | null;
      }
    | { kind: "template-substitution"; expression: TemplateExpr; index: number; text: string }
    | {
          kind: "array-element";
          expression: ArrayExpr;
          object: GuestObject;
          index: number;
          nextIndex: number;
      }
    | { kind: "call-target"; expression: CallExpr; receiver: Value }
    | { kind: "call-base"; expression: CallExpr }
    | { kind: "call-key"; expression: CallExpr; base: Value }
    | { kind: "constructor"; expression: NewExpr }
    | {
          kind: "super-argument";
          expression: SuperCallExpr;
          environment: ScriptEnvironment;
          parent: GuestObject | null;
          values: Value[];
          index: number;
      }
    | {
          kind: "call-argument";
          expression: CallExpr | NewExpr | ChainCallLink;
          callee: Value;
          receiver: Value;
          directEval: boolean;
          values: Value[];
          index: number;
      }
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
    return (
        expression !== null &&
        (expression.kind === "yield" ||
            expression.kind === "await" ||
            ((expression.kind === "private-in" ||
                expression.kind === "class" ||
                expression.kind === "chain" ||
                expression.kind === "destructure" ||
                expression.kind === "super-call" ||
                expression.kind === "array" ||
                expression.kind === "super-member" ||
                expression.kind === "update" ||
                expression.kind === "compound" ||
                expression.kind === "assign" ||
                expression.kind === "object" ||
                expression.kind === "template" ||
                expression.kind === "new" ||
                expression.kind === "call" ||
                expression.kind === "member" ||
                expression.kind === "binary" ||
                expression.kind === "conditional" ||
                expression.kind === "unary") &&
                expression.suspends === true))
    );
}

export function isSuspendingPattern(pattern: DestructuringPattern): boolean {
    const pending = [pattern];
    while (pending.length !== 0) {
        const current = pending.pop()!;
        if (current.kind === "target" && isSuspendingGeneratorExpression(current.target)) {
            return true;
        }
        if (current.kind === "array-pattern") {
            for (const element of current.elements) {
                if (element === null) {
                    continue;
                }
                if (isSuspendingGeneratorExpression(element.initializer)) {
                    return true;
                }
                pending.push(element.pattern);
            }
            if (current.rest !== null) {
                pending.push(current.rest);
            }
        } else if (current.kind === "object-pattern") {
            for (const property of current.properties) {
                if (
                    isSuspendingGeneratorExpression(property.key) ||
                    isSuspendingGeneratorExpression(property.element.initializer)
                ) {
                    return true;
                }
                pending.push(property.element.pattern);
            }
            if (current.rest !== null) {
                pending.push(current.rest);
            }
        }
    }
    return false;
}
