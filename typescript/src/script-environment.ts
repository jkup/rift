import { GlobalEnvironment } from "./global-environment.js";
import { UNDEFINED, failure, normal, type Value, type ValueCompletion,
    type InternalBooleanCompletion, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";
import type { ScriptGuestCallable } from "./script-record.js";

export type ScriptEnvironment = ScriptDeclarativeEnvironment | ScriptFunctionEnvironment
    | { readonly kind: "global"; readonly record: GlobalEnvironment };

// Only mutable declarative bindings are admitted. Absence here is an internal
// caller error; an existing uninitialized binding instead produces guest TDZ.
class ScriptLocalBindings {
    private readonly bindings: Map<string, { initialized: boolean; value: Value }> = new Map();
    constructor(readonly outer: ScriptEnvironment) {}
    hasBinding(name: string, _loc: Location): InternalBooleanCompletion {
        return { type: "normal", value: this.bindings.has(name) };
    }
    createMutableBinding(name: string, _loc: Location): ValueCompletion {
        if (this.bindings.has(name)) throw new Error("binding already exists: " + name);
        this.bindings.set(name, { initialized: false, value: UNDEFINED });
        return normal();
    }
    initializeBinding(name: string, value: Value, _context: OperationContext, _loc: Location): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) throw new Error("missing binding: " + name);
        if (binding.initialized) throw new Error("binding already initialized: " + name);
        binding.value = value;
        binding.initialized = true;
        return normal();
    }
    getBindingValue(name: string, _context: OperationContext, loc: Location): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) throw new Error("missing binding: " + name);
        if (!binding.initialized) return failure("ReferenceError", name + " is not initialized", loc);
        return normal(binding.value);
    }
    setMutableBinding(name: string, value: Value, _context: OperationContext, loc: Location): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) throw new Error("missing binding: " + name);
        if (!binding.initialized) return failure("ReferenceError", name + " is not initialized", loc);
        binding.value = value;
        return normal();
    }
}
export class ScriptDeclarativeEnvironment extends ScriptLocalBindings {
    readonly kind = "declarative";
}
export class ScriptFunctionEnvironment extends ScriptLocalBindings {
    readonly kind = "function";
    // Host metadata only. This record neither creates nor invokes a callable.
    constructor(outer: ScriptEnvironment, readonly thisValue: Value, readonly callable: ScriptGuestCallable) { super(outer); }
}
export type ScriptBindingReference = {
    readonly base: ScriptEnvironment | null;
    readonly name: string;
    readonly strict: true;
    readonly loc: Location;
};
export type ScriptReferenceCompletion = { type: "normal"; reference: ScriptBindingReference } | ThrowCompletion;
export function resolveScriptBinding(environment: ScriptEnvironment, name: string, loc: Location): ScriptReferenceCompletion {
    let current: ScriptEnvironment | null = environment;
    while (current !== null) {
        const present = current.kind === "global" ? current.record.hasBinding(name, loc) : current.hasBinding(name, loc);
        if (present.type === "throw") return present;
        if (present.value) break;
        current = current.kind === "global" ? null : current.outer;
    }
    return { type: "normal", reference: { base: current, name, strict: true, loc: { line: loc.line, column: loc.column } } };
}
export function getScriptBinding(reference: ScriptBindingReference, context: OperationContext): ValueCompletion {
    const base = reference.base;
    if (base === null) return failure("ReferenceError", reference.name + " is not defined", reference.loc);
    return base.kind === "global" ? base.record.getBindingValue(reference.name, context, reference.loc)
        : base.getBindingValue(reference.name, context, reference.loc);
}
export function putScriptBinding(reference: ScriptBindingReference, value: Value, context: OperationContext): ValueCompletion {
    const base = reference.base;
    if (base === null) return failure("ReferenceError", reference.name + " is not defined", reference.loc);
    return base.kind === "global" ? base.record.setMutableBinding(reference.name, value, context, reference.loc)
        : base.setMutableBinding(reference.name, value, context, reference.loc);
}
export function scriptIdentifierReceiver(_reference: ScriptBindingReference): Value { return UNDEFINED; }
