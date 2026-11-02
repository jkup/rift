import {
    GuestObject, UNDEFINED, failure, normal,
    type Value, type ValueCompletion, type InternalBooleanCompletion,
    type OperationContext, type ThrowCompletion, type DataDescriptorUpdate,
} from "./runtime.js";
import type { Location } from "./syntax.js";

// Ordinary-object, mutable-let subset of ECMA-262 2025 §9.1.1.4.
// Declaration conflict checks/order belong to a future instantiation caller.
export class GlobalEnvironment {
    private readonly lexicals: Map<string, { initialized: boolean; value: Value }> = new Map();
    constructor(readonly globalObject: GuestObject, private readonly globalThis: GuestObject) {}

    hasLexicalDeclaration(name: string): boolean { return this.lexicals.has(name); }
    hasBinding(name: string, loc: Location): InternalBooleanCompletion {
        if (this.lexicals.has(name)) return { type: "normal", value: true };
        return this.globalObject.internalHasProperty(name, loc);
    }
    createMutableBinding(name: string, loc: Location): ValueCompletion {
        if (this.lexicals.has(name)) return failure("TypeError", "binding already exists: " + name, loc);
        this.lexicals.set(name, { initialized: false, value: UNDEFINED });
        return normal();
    }
    initializeBinding(name: string, value: Value, context: OperationContext, loc: Location): ValueCompletion {
        const binding = this.lexicals.get(name);
        if (binding !== undefined) {
            if (binding.initialized) throw new Error("binding already initialized: " + name);
            binding.value = value;
            binding.initialized = true;
            return normal();
        }
        return this.setObjectBinding(name, value, false, context, loc);
    }
    getBindingValue(name: string, loc: Location): ValueCompletion {
        const binding = this.lexicals.get(name);
        if (binding !== undefined) {
            if (!binding.initialized) return failure("ReferenceError", name + " is not initialized", loc);
            return normal(binding.value);
        }
        const present = this.globalObject.internalHasProperty(name, loc);
        if (present.type === "throw") return present;
        if (!present.value) return failure("ReferenceError", name + " is not defined", loc);
        return this.globalObject.internalGet(name, { kind: "object", object: this.globalObject }, loc);
    }
    setMutableBinding(name: string, value: Value, context: OperationContext, loc: Location): ValueCompletion {
        const binding = this.lexicals.get(name);
        if (binding !== undefined) {
            if (!binding.initialized) return failure("ReferenceError", name + " is not initialized", loc);
            binding.value = value;
            return normal();
        }
        return this.setObjectBinding(name, value, true, context, loc);
    }
    private setObjectBinding(name: string, value: Value, strict: boolean, context: OperationContext, loc: Location): ValueCompletion {
        const present = this.globalObject.internalHasProperty(name, loc);
        if (present.type === "throw") return present;
        if (!present.value && strict) return failure("ReferenceError", name + " is not defined", loc);
        return this.setObjectProperty(name, value, strict, context, loc);
    }
    private setObjectProperty(name: string, value: Value, strict: boolean, context: OperationContext, loc: Location): ValueCompletion {
        const result = this.globalObject.internalSet(name, value, { kind: "object", object: this.globalObject }, context, loc);
        if (result.type === "throw") return result;
        if (!result.value && strict) return failure("TypeError", "property is not writable: " + name, loc);
        return normal();
    }
    getThisBinding(): Value { return { kind: "object", object: this.globalThis }; }
    withBaseObject(): Value { return UNDEFINED; }
    hasRestrictedGlobalProperty(name: string): InternalBooleanCompletion {
        const own = this.globalObject.getOwnProperty(name);
        return { type: "normal", value: own !== undefined && !own.configurable };
    }
    canDeclareGlobalVar(name: string): InternalBooleanCompletion {
        return { type: "normal", value: this.globalObject.getOwnProperty(name) !== undefined || this.globalObject.isExtensible() };
    }
    canDeclareGlobalFunction(name: string): InternalBooleanCompletion {
        const own = this.globalObject.getOwnProperty(name);
        return { type: "normal", value: own === undefined ? this.globalObject.isExtensible() : own.configurable || (own.writable && own.enumerable) };
    }
    createGlobalVarBinding(name: string, context: OperationContext, loc: Location): ValueCompletion {
        const own = this.globalObject.getOwnProperty(name);
        const extensible = this.globalObject.isExtensible();
        if (own === undefined && extensible) {
            const result = this.defineObjectProperty(name, { value: UNDEFINED, writable: true, enumerable: true, configurable: false }, context, loc);
            if (result.type === "throw") return result;
            // ObjectEnvironment initialization, not composite lexical dispatch.
            return this.setObjectBinding(name, UNDEFINED, false, context, loc);
        }
        return normal();
    }
    createGlobalFunctionBinding(name: string, value: Value, context: OperationContext, loc: Location): ValueCompletion {
        const own = this.globalObject.getOwnProperty(name);
        const desc: DataDescriptorUpdate = own === undefined || own.configurable
            ? { value, writable: true, enumerable: true, configurable: false } : { value };
        const defined = this.defineObjectProperty(name, desc, context, loc);
        if (defined.type === "throw") return defined;
        // The spec requires Set(false), even following a successful definition.
        return this.setObjectProperty(name, value, false, context, loc);
    }
    private defineObjectProperty(name: string, desc: DataDescriptorUpdate, context: OperationContext, loc: Location): ValueCompletion {
        const result = this.globalObject.defineOwnProperty(name, desc, context, loc);
        if (result.type === "throw") return result;
        if (!result.value) return failure("TypeError", "cannot define global property: " + name, loc);
        return normal();
    }
}

// Host-only strict environment references. Capture the base, not a property or
// lexical cell. In particular, an unresolved base stays unresolved after effects.
export type StrictGlobalReference = {
    readonly environment: GlobalEnvironment | null;
    readonly name: string;
    readonly loc: Location;
};
export type GlobalReferenceCompletion = { type: "normal"; reference: StrictGlobalReference } | ThrowCompletion;
export function resolveStrictGlobalBinding(environment: GlobalEnvironment, name: string, loc: Location): GlobalReferenceCompletion {
    const present = environment.hasBinding(name, loc);
    if (present.type === "throw") return present;
    return { type: "normal", reference: { environment: present.value ? environment : null, name, loc: { line: loc.line, column: loc.column } } };
}
export function getStrictGlobalBinding(reference: StrictGlobalReference): ValueCompletion {
    if (reference.environment === null) return failure("ReferenceError", reference.name + " is not defined", reference.loc);
    return reference.environment.getBindingValue(reference.name, reference.loc);
}
export function putStrictGlobalBinding(reference: StrictGlobalReference, value: Value, context: OperationContext): ValueCompletion {
    if (reference.environment === null) return failure("ReferenceError", reference.name + " is not defined", reference.loc);
    return reference.environment.setMutableBinding(reference.name, value, context, reference.loc);
}
