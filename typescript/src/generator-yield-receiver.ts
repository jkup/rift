import type { EvaluationReference } from "./evaluation-reference.js";
import type { Value } from "./runtime.js";
import type { ScriptBindingReference, ScriptEnvironment } from "./script-environment.js";
import type { Location } from "./syntax.js";

export type GeneratorYieldReceiver = { kind: "return" }
    | { kind: "assignment"; reference: EvaluationReference; loc: Location }
    | { kind: "compound"; reference: EvaluationReference; left: Value; operator: string; loc: Location }
    | { kind: "binding"; reference: ScriptBindingReference }
    | { kind: "initialization"; environment: ScriptEnvironment; name: string; loc: Location };
