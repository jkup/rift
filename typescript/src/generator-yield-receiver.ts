import type { ScriptBindingReference, ScriptEnvironment } from "./script-environment.js";
import type { Location } from "./syntax.js";

export type GeneratorYieldReceiver = { kind: "return" }
    | { kind: "binding"; reference: ScriptBindingReference }
    | { kind: "initialization"; environment: ScriptEnvironment; name: string; loc: Location };
