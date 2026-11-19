import { parse } from "../parser.js";
import { Evaluator } from "../evaluator.js";
import type { Realm } from "../realm.js";
import { UNDEFINED, type ThrowCompletion, type Value } from "../runtime.js";
import type { Diagnostic, Location } from "../syntax.js";
import type {
    Rejection,
    ResourceOrigin,
    RuntimeCapability,
    SyntaxCapability,
} from "../outcomes.js";

export type ObservationMode = "parser-observation" | "body-observation";
export type Observation =
    | { readonly kind: "normal" }
    | {
          readonly kind: "syntax-error";
          readonly phase: "parse";
          readonly constructorName: "SyntaxError";
          readonly ruleCode: "return-outside-function";
      }
    | {
          readonly kind: "throw";
          readonly phase: "runtime";
          readonly valueKind: Value["kind"];
          readonly constructor: {
              readonly outcome: "absent" | "unsupported";
              readonly name: null;
              readonly realmId: null;
              readonly secondary: null;
          };
      }
    | {
          readonly kind: "unsupported-syntax";
          readonly capabilityCode: SyntaxCapability | RuntimeCapability;
      }
    | ResourceOrigin;
export type ObservationResult = {
    readonly mode: ObservationMode;
    readonly unit: string;
    readonly stage: "test";
    readonly bodyEvaluated: boolean;
    readonly location: Location | null;
    readonly diagnostic: Diagnostic | null;
    readonly observation: Observation;
};
export type ObservationLimits = { readonly steps: number; readonly calls: number };

// Projection inspects only the completion tag and Value kind. It never touches
// guest properties, invokes coercion, or treats diagnostic names as constructors.
export function projectThrow(result: ThrowCompletion): Observation {
    const origin = result.origin;
    if (origin.kind === "resource-limit") {
        return origin;
    }
    if (origin.kind === "unsupported-operation") {
        return { kind: "unsupported-syntax", capabilityCode: origin.capabilityCode };
    }
    return {
        kind: "throw",
        phase: "runtime",
        valueKind: result.value.kind,
        constructor: {
            outcome: result.value.kind === "object" ? "unsupported" : "absent",
            name: null,
            realmId: null,
            secondary: null,
        },
    };
}
function projectRejection(rejection: Rejection): Observation {
    if (rejection.kind === "syntax-error") {
        if (rejection.ruleCode !== "return-outside-function") {
            throw new Error("unsupported syntax certification rule");
        }
        return {
            kind: "syntax-error",
            phase: "parse",
            constructorName: "SyntaxError",
            ruleCode: rejection.ruleCode,
        };
    }
    return rejection;
}
export function observe(
    source: string,
    realm: Realm,
    mode: ObservationMode,
    unit: string,
    limits: ObservationLimits = { steps: 100000, calls: 64 },
): ObservationResult {
    if (
        !Number.isSafeInteger(limits.steps) ||
        limits.steps < 0 ||
        !Number.isSafeInteger(limits.calls) ||
        limits.calls < 0
    ) {
        throw new Error("observation limits must be nonnegative safe integers");
    }
    if (mode === "body-observation" && realm.profile !== "legacy") {
        throw new Error("legacy Realm required");
    }
    const parsed = parse(source);
    if (parsed.error !== null) {
        if (parsed.rejection === null) {
            throw new Error("missing parse rejection");
        }
        return {
            mode,
            unit,
            stage: "test",
            bodyEvaluated: false,
            location: parsed.error.loc,
            diagnostic: parsed.error,
            observation: projectRejection(parsed.rejection),
        };
    }
    if (mode === "parser-observation") {
        return {
            mode,
            unit,
            stage: "test",
            bodyEvaluated: false,
            location: null,
            diagnostic: null,
            observation: { kind: "normal" },
        };
    }
    // Instantiation is part of body evaluation, including an early duplicate binding.
    // Host faults escape this in-process boundary unchanged.
    const result = new Evaluator(realm, limits.steps, limits.calls).block(
        parsed.body,
        realm.global,
        UNDEFINED,
    );
    if (result.type === "throw") {
        return {
            mode,
            unit,
            stage: "test",
            bodyEvaluated: true,
            location: result.diagnostic.loc,
            diagnostic: result.diagnostic,
            observation: projectThrow(result),
        };
    }
    if (result.type !== "normal") {
        throw new Error("invalid completion escaped observation boundary: " + result.type);
    }
    return {
        mode,
        unit,
        stage: "test",
        bodyEvaluated: true,
        location: null,
        diagnostic: null,
        observation: { kind: "normal" },
    };
}
