import { iteratorCloseNormally, type IteratorRecord } from "./iterator.js";
import { languageFailure, truthy, type OperationContext, type ThrowCompletion, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";

export type GeneratorResumeMode = "next" | "return" | "throw";
export type DelegateResult = { type: "normal" | "return"; value: Value } | { type: "yield"; result: Value } | ThrowCompletion;

export function resumeGeneratorDelegate(record: IteratorRecord, mode: GeneratorResumeMode, value: Value,
    context: OperationContext, loc: Location): DelegateResult {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const receiver: Value = { kind: "object", object: record.iterator };
    let method = record.nextMethod;
    if (mode !== "next") {
        const found = record.iterator.internalGet(mode, receiver, context, loc);
        if (found.type === "throw") return found;
        method = found.value;
        if (method.kind === "undefined" || method.kind === "null") {
            if (mode === "return") return { type: "return", value };
            const closed = iteratorCloseNormally(record, context, loc);
            if (closed.type === "throw") { const abrupt: ThrowCompletion = closed; return abrupt; }
            return languageFailure(context.realm, "TypeError", "delegated iterator has no throw method", loc);
        }
        if (method.kind !== "object" || method.object.callable === null)
            return languageFailure(context.realm, "TypeError", "delegated iterator method must be callable", loc);
    }
    const called = context.call(method, receiver, [value], loc);
    if (called.type === "throw") { const abrupt: ThrowCompletion = called; return abrupt; }
    if (called.value.kind !== "object")
        return languageFailure(context.realm, "TypeError", "delegated iterator result must be an object", loc);
    const result = called.value;
    const done = result.object.internalGet("done", result, context, loc);
    if (done.type === "throw") return done;
    if (!truthy(done.value)) return { type: "yield", result };
    const final = result.object.internalGet("value", result, context, loc);
    if (final.type === "throw") return final;
    return { type: mode === "return" ? "return" : "normal", value: final.value };
}
