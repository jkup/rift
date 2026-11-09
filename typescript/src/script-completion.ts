import type { Value, ValueCompletion, ThrowCompletion } from "./runtime.js";

// Empty is statement bookkeeping, never a guest Value or legacy undefined.
export type ScriptStatementPayload = { readonly kind: "empty" } | { readonly kind: "value"; readonly value: Value };
export type ScriptStatementCompletion =
    | { readonly type: "normal" | "break" | "continue"; readonly payload: ScriptStatementPayload; readonly target?: string }
    | { readonly type: "return"; readonly value: Value }
    | ThrowCompletion;

// ECMA-262 2025 §6.2.4.4: carry the previous payload even through empty
// break/continue, but preserve every already-valued or throwing record.
export function updateScriptEmpty(completion: ScriptStatementCompletion, previous: ScriptStatementPayload): ScriptStatementCompletion {
    if (completion.type === "throw" || completion.type === "return" || completion.payload.kind === "value") return completion;
    return completion.target === undefined ? { type: completion.type, payload: previous }
        : { type: completion.type, payload: previous, target: completion.target };
}
export function scriptExpressionCompletion(completion: ValueCompletion): ScriptStatementCompletion {
    if (completion.type === "throw") {
        // Pinned scriptc needs the explicit arm for this union-to-union return.
        // Keep the original record; see the E2 union reduction and identity tests.
        const thrown: ThrowCompletion = completion;
        return thrown;
    }
    return { type: "normal", payload: { kind: "value", value: completion.value } };
}
