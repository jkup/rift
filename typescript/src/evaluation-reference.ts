import { UNDEFINED, normal, languageFailure, getValue, putValue, type Value, type Reference, type Completion, type OperationContext } from "./runtime.js";
import { getScriptBinding, putScriptBinding, deleteScriptBinding, type ScriptBindingReference } from "./script-environment.js";
import { deleteReference } from "./delete-reference.js";
import type { Location } from "./syntax.js";
import type { PrivateName } from "./private-names.js";
import { privateGet, privateSet } from "./private-elements.js";

export type EvaluationReference = Reference | { kind: "script"; binding: ScriptBindingReference }
    | { kind: "script-private"; receiver: Value; name: PrivateName }
    | { kind: "script-property"; reference: Reference; strict: boolean }
    | { kind: "script-super"; reference: Reference; strict: boolean; receiver: Value };
export type EvaluationReferenceResult = { type: "reference"; reference: EvaluationReference } | { type: "abrupt"; completion: Completion };
export type ExpressionResult = EvaluationReferenceResult | { type: "value"; value: Value };
export function getReferenceValue(context: OperationContext, ref: EvaluationReference, loc: Location): Completion {
    if (ref.kind === "script-private") return privateGet(ref.receiver, ref.name, context, loc);
    if (ref.kind === "script-super") return getValue(ref.reference, context, loc, ref.receiver);
    if (ref.kind === "script") return getScriptBinding(ref.binding, context);
    return getValue(ref.kind === "script-property" ? ref.reference : ref, context, loc);
}
export function putReferenceValue(context: OperationContext, ref: EvaluationReference, value: Value, loc: Location): Completion {
    if (ref.kind === "script-private") {
        const result = privateSet(ref.receiver, ref.name, value, context, loc);
        return result.type === "throw" ? result : normal(value);
    }
    if (ref.kind === "script-super") return putValue(ref.reference, value, context, loc, ref.strict, ref.receiver);
    if (ref.kind === "script-property") return putValue(ref.reference, value, context, loc, ref.strict);
    if (ref.kind !== "script") return putValue(ref, value, context, loc);
    const result = putScriptBinding(ref.binding, value, context);
    return result.type === "throw" ? result : normal(value);
}
export function deleteReferenceValue(context: OperationContext, ref: EvaluationReference, loc: Location): Completion {
    if (ref.kind === "script-private") throw new Error("private deletion passed syntax validation");
    if (ref.kind === "script-super") return languageFailure(context.realm, "ReferenceError", "cannot delete a super property", loc);
    if (ref.kind === "script") return deleteScriptBinding(ref.binding, context);
    if (ref.kind === "script-property") return deleteReference(ref.reference, context, loc, ref.strict);
    return deleteReference(ref, context, loc);
}

export function referenceCallReceiver(result: ExpressionResult): Value {
    if (result.type !== "reference") return UNDEFINED;
    const ref = result.reference;
    if (ref.kind === "script-private") return ref.receiver;
    if (ref.kind === "script-super") return ref.receiver;
    if (ref.kind === "property") return ref.base;
    if (ref.kind === "script-property" && ref.reference.kind === "property") return ref.reference.base;
    return UNDEFINED;
}
