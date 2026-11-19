import type { EvaluationReference } from "./evaluation-reference.js";
import type { GuestObject, Value } from "./runtime.js";
import type { ScriptBindingReference, ScriptEnvironment } from "./script-environment.js";
import type { DestructuringPattern, Location, Stmt, SwitchStmt, ForStmt } from "./syntax.js";

export type GeneratorYieldReceiver =
    | { kind: "return" }
    | {
          kind: "declaration-pattern";
          pattern: DestructuringPattern;
          environment: ScriptEnvironment | null;
      }
    | { kind: "pattern-default" }
    | { kind: "pattern-key" }
    | { kind: "pattern-target-base"; strict: boolean }
    | { kind: "pattern-target-key"; base: Value; strict: boolean }
    | { kind: "pattern-target-super-key"; homeObject: GuestObject; receiver: Value }
    | { kind: "async-return" }
    | { kind: "loop-test" }
    | { kind: "for-update" }
    | { kind: "for-source" }
    | { kind: "for-initializer"; statement: ForStmt; labels: readonly string[] | null }
    | { kind: "switch-test"; statement: SwitchStmt }
    | { kind: "switch-selector" }
    | { kind: "throw"; loc: Location }
    | { kind: "branch"; consequent: Stmt; alternate: Stmt | null }
    | { kind: "pattern"; pattern: DestructuringPattern; environment: ScriptEnvironment | null }
    | { kind: "assignment"; reference: EvaluationReference; loc: Location }
    | {
          kind: "compound";
          reference: EvaluationReference;
          left: Value;
          operator: string;
          loc: Location;
      }
    | { kind: "binding"; reference: ScriptBindingReference }
    | { kind: "initialization"; environment: ScriptEnvironment; name: string; loc: Location };
