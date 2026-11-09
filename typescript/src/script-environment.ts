import { GlobalEnvironment } from "./global-environment.js";
import { UNDEFINED, languageFailure, normal, type Value, type ValueCompletion,
    type InternalBooleanCompletion, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";
import type { ScriptGuestCallable } from "./script-record.js";

export type ScriptEnvironment = ScriptDeclarativeEnvironment | ScriptFunctionEnvironment
    | { readonly kind: "global"; readonly record: GlobalEnvironment };

// Immutable bindings here are const bindings: writes throw even in sloppy code.
// Mapped arguments retain these cells even if a binding is later deleted.
export type ScriptBindingCell = { initialized: boolean; mutable: boolean; value: Value };
class ScriptLocalBindings {
    private readonly bindings: Map<string, ScriptBindingCell> = new Map();
    private readonly deletableNames: Set<string> = new Set();
    constructor(readonly outer: ScriptEnvironment) {}
    parameterCell(name: string): ScriptBindingCell {
        const binding = this.bindings.get(name);
        if (binding === undefined || !binding.mutable) throw new Error("missing mutable parameter: " + name);
        return binding;
    }
    hasBinding(name: string, _loc: Location): InternalBooleanCompletion {
        return { type: "normal", value: this.bindings.has(name) };
    }
    createMutableBinding(name: string, _loc: Location, deletable = false): ValueCompletion {
        if (this.bindings.has(name)) throw new Error("binding already exists: " + name);
        this.bindings.set(name, { initialized: false, mutable: true, value: UNDEFINED });
        if (deletable) this.deletableNames.add(name);
        return normal();
    }
    createImmutableBinding(name: string, _loc: Location): ValueCompletion {
        if (this.bindings.has(name)) throw new Error("binding already exists: " + name);
        this.bindings.set(name, { initialized: false, mutable: false, value: UNDEFINED });
        return normal();
    }
    initializeBinding(name: string, value: Value, context: OperationContext, _loc: Location): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) throw new Error("missing binding: " + name);
        if (binding.initialized) throw new Error("binding already initialized: " + name);
        binding.value = value;
        binding.initialized = true;
        return normal();
    }
    getBindingValue(name: string, context: OperationContext, loc: Location, _strict = true): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) throw new Error("missing binding: " + name);
        if (!binding.initialized) return languageFailure(context.realm, "ReferenceError", name + " is not initialized", loc);
        return normal(binding.value);
    }
    setMutableBinding(name: string, value: Value, context: OperationContext, loc: Location, strict = true): ValueCompletion {
        const binding = this.bindings.get(name);
        if (binding === undefined) {
            if (strict) return languageFailure(context.realm, "ReferenceError", name + " is not defined", loc);
            this.createMutableBinding(name, loc, true);
            return this.initializeBinding(name, value, context, loc);
        }
        if (!binding.initialized) return languageFailure(context.realm, "ReferenceError", name + " is not initialized", loc);
        if (!binding.mutable) return languageFailure(context.realm, "TypeError", name + " is immutable", loc);
        binding.value = value;
        return normal();
    }
    deleteBinding(name: string): InternalBooleanCompletion {
        if (!this.bindings.has(name)) return { type: "normal", value: true };
        if (!this.deletableNames.has(name)) return { type: "normal", value: false };
        this.bindings.delete(name);
        this.deletableNames.delete(name);
        return { type: "normal", value: true };
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
    readonly strict: boolean;
    readonly loc: Location;
};
export type ScriptReferenceCompletion = { type: "normal"; reference: ScriptBindingReference } | ThrowCompletion;
export function resolveScriptBinding(environment: ScriptEnvironment, name: string, loc: Location, strict = true): ScriptReferenceCompletion {
    let current: ScriptEnvironment | null = environment;
    while (current !== null) {
        const present = current.kind === "global" ? current.record.hasBinding(name, loc) : current.hasBinding(name, loc);
        if (present.type === "throw") return present;
        if (present.value) break;
        current = current.kind === "global" ? null : current.outer;
    }
    return { type: "normal", reference: { base: current, name, strict, loc: { line: loc.line, column: loc.column } } };
}
export function getScriptBinding(reference: ScriptBindingReference, context: OperationContext): ValueCompletion {
    const base = reference.base;
    if (base === null) return languageFailure(context.realm, "ReferenceError", reference.name + " is not defined", reference.loc);
    return base.kind === "global" ? base.record.getBindingValue(reference.name, context, reference.loc, reference.strict)
        : base.getBindingValue(reference.name, context, reference.loc);
}
export function putScriptBinding(reference: ScriptBindingReference, value: Value, context: OperationContext): ValueCompletion {
    const base = reference.base;
    if (base === null) return reference.strict ? languageFailure(context.realm, "ReferenceError", reference.name + " is not defined", reference.loc)
        : context.realm.globalEnvironment.setUnresolvableBinding(reference.name, value, context, reference.loc);
    return base.kind === "global" ? base.record.setMutableBinding(reference.name, value, context, reference.loc, reference.strict)
        : base.setMutableBinding(reference.name, value, context, reference.loc, reference.strict);
}
export function scriptIdentifierReceiver(_reference: ScriptBindingReference): Value { return UNDEFINED; }

export function deleteScriptBinding(reference: ScriptBindingReference, context: OperationContext): ValueCompletion {
    if (reference.strict) throw new Error("strict identifier deletion");
    const base = reference.base;
    if (base === null) return normal({ kind: "boolean", value: true });
    const result = base.kind === "global" ? base.record.deleteBinding(reference.name, context, reference.loc)
        : base.deleteBinding(reference.name);
    if (result.type === "throw") return result;
    return normal({ kind: "boolean", value: result.value });
}
