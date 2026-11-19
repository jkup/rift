import type { IteratorRecord } from "./iterator.js";
import type { GeneratorResumeMode } from "./generator-delegate.js";
import {
    languageFailure,
    truthy,
    type OperationContext,
    type ThrowCompletion,
    type Value,
} from "./runtime.js";
import type { Location } from "./syntax.js";

export type AsyncDelegate = {
    iterator: IteratorRecord;
    mode: GeneratorResumeMode;
    pending: "call" | "close" | "return" | null;
};
export type AsyncDelegateResult =
    | { type: "normal" | "return" | "await" | "async-delegate-yield"; value: Value }
    | ThrowCompletion;

export function resumeAsyncDelegate(
    state: AsyncDelegate,
    mode: GeneratorResumeMode,
    value: Value,
    context: OperationContext,
    loc: Location,
): AsyncDelegateResult {
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    if (state.pending !== null) {
        const pending = state.pending;
        state.pending = null;
        if (mode === "throw") {
            return {
                type: "throw",
                origin: { kind: "guest" },
                value,
                diagnostic: { phase: "runtime", name: "Uncaught", message: "guest throw", loc },
            };
        }
        if (pending === "return") {
            return { type: "return", value };
        }
        if (value.kind !== "object") {
            return languageFailure(
                context.realm,
                "TypeError",
                "async delegated result must be an object",
                loc,
            );
        }
        if (pending === "close") {
            return languageFailure(
                context.realm,
                "TypeError",
                "delegated iterator has no throw method",
                loc,
            );
        }
        const done = value.object.internalGet("done", value, context, loc);
        if (done.type === "throw") {
            return done;
        }
        const result = value.object.internalGet("value", value, context, loc);
        if (result.type === "throw") {
            return result;
        }
        return {
            type: truthy(done.value)
                ? state.mode === "return"
                    ? "return"
                    : "normal"
                : "async-delegate-yield",
            value: result.value,
        };
    }
    const record = state.iterator,
        receiver: Value = { kind: "object", object: record.iterator };
    let method = record.nextMethod;
    state.mode = mode;
    if (mode !== "next") {
        const found = record.iterator.internalGet(mode, receiver, context, loc);
        if (found.type === "throw") {
            return found;
        }
        method = found.value;
        if (method.kind === "undefined" || method.kind === "null") {
            if (mode === "return") {
                state.pending = "return";
                return { type: "await", value };
            }
            const close = record.iterator.internalGet("return", receiver, context, loc);
            if (close.type === "throw") {
                return close;
            }
            if (close.value.kind === "undefined" || close.value.kind === "null") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "delegated iterator has no throw method",
                    loc,
                );
            }
            const called = context.call(close.value, receiver, [], loc);
            if (called.type === "throw") {
                return called;
            }
            state.pending = "close";
            return { type: "await", value: called.value };
        }
    }
    const called = context.call(method, receiver, [value], loc);
    if (called.type === "throw") {
        return called;
    }
    state.pending = "call";
    return { type: "await", value: called.value };
}
