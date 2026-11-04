import type { Guard, RuntimeCapability, ThrowOrigin } from "./outcomes.js";
import { GuestSymbol, formatPropertyKey, symbolDescriptiveString } from "./symbols.js";
import { toObject } from "./object-conversion.js";
import { toPropertyKey } from "./conversion.js";
import type { Diagnostic, Location, Stmt, FunctionSource } from "./syntax.js";
import type { GuestString } from "./strings.js";
import type { Realm } from "./realm.js";
import type { ScriptGuestCallable } from "./script-record.js";
import { arrayIndex } from "./property-keys.js";

export type Value =
    | { kind: "undefined" } | { kind: "null" }
    | { kind: "boolean"; value: boolean } | { kind: "number"; value: number }
    | { kind: "symbol"; value: GuestSymbol }
    | { kind: "string"; value: GuestString } | { kind: "object"; object: GuestObject };
export const UNDEFINED: Value = { kind: "undefined" };
export type PropertyKey = GuestString | GuestSymbol;
// Host undefined means absent; guest undefined is the present Value UNDEFINED.
export type DataDescriptorUpdate = { value?: Value; writable?: boolean; enumerable?: boolean; configurable?: boolean };
export type BooleanCompletion = { type: "normal"; value: boolean };
export type ThrowCompletion = { type: "throw"; value: Value; diagnostic: Diagnostic; readonly origin: ThrowOrigin };
export type ValueCompletion = { type: "normal"; value: Value } | ThrowCompletion;
export type InternalBooleanCompletion = BooleanCompletion | ThrowCompletion;
export type DataDescriptor = { kind: "data"; value: Value; writable: boolean; enumerable: boolean; configurable: boolean };
export type AccessorDescriptor = { kind: "accessor"; get: Value; set: Value; enumerable: boolean; configurable: boolean };
export type PropertyDescriptor = DataDescriptor | AccessorDescriptor;
export type PropertyDescriptorUpdate = DataDescriptorUpdate & { get?: Value; set?: Value };
export type DescriptorValidation = { valid: false } | { valid: true; descriptor: PropertyDescriptor };

// Trusted internal records are checked before any exotic coercion or storage.
export function validatePropertyDescriptorUpdate(desc: PropertyDescriptorUpdate): void {
    const data = desc.value !== undefined || desc.writable !== undefined;
    const accessor = desc.get !== undefined || desc.set !== undefined;
    if (data && accessor) throw new Error("mixed property descriptor");
    for (const endpoint of [desc.get, desc.set]) {
        if (endpoint !== undefined && endpoint.kind !== "undefined"
            && (endpoint.kind !== "object" || endpoint.object.callable === null))
            throw new Error("invalid accessor endpoint");
    }
}
function copyDescriptor(desc: PropertyDescriptor): PropertyDescriptor {
    if (desc.kind === "data") return { kind: "data", value: desc.value, writable: desc.writable, enumerable: desc.enumerable, configurable: desc.configurable };
    return { kind: "accessor", get: desc.get, set: desc.set, enumerable: desc.enumerable, configurable: desc.configurable };
}
// Pure ValidateAndApplyPropertyDescriptor construction. The caller commits once.
export function validatePropertyDescriptor(current: PropertyDescriptor | undefined, extensible: boolean, desc: PropertyDescriptorUpdate): DescriptorValidation {
    const data = desc.value !== undefined || desc.writable !== undefined;
    const accessor = desc.get !== undefined || desc.set !== undefined;
    if (current === undefined && !extensible) return { valid: false };
    if (current !== undefined && !current.configurable) {
        if (desc.configurable === true || (desc.enumerable !== undefined && desc.enumerable !== current.enumerable)) return { valid: false };
        if ((current.kind === "data" && accessor) || (current.kind === "accessor" && data)) return { valid: false };
        if (current.kind === "accessor") {
            if (desc.get !== undefined && !sameValue(desc.get, current.get)) return { valid: false };
            if (desc.set !== undefined && !sameValue(desc.set, current.set)) return { valid: false };
        } else if (!current.writable) {
            if (desc.writable === true || (desc.value !== undefined && !sameValue(desc.value, current.value))) return { valid: false };
            // A SameValue request on frozen data is a successful no-op, including
            // the stored Value wrapper identity (2025 10.1.6.3 step 5.e.iii).
            if (desc.value !== undefined) return { valid: true, descriptor: copyDescriptor(current) };
        }
    }
    const enumerable = desc.enumerable === undefined ? (current === undefined ? false : current.enumerable) : desc.enumerable;
    const configurable = desc.configurable === undefined ? (current === undefined ? false : current.configurable) : desc.configurable;
    if (accessor || (!data && current !== undefined && current.kind === "accessor")) {
        const previous = current !== undefined && current.kind === "accessor" ? current : undefined;
        return { valid: true, descriptor: { kind: "accessor",
            get: desc.get === undefined ? (previous === undefined ? UNDEFINED : previous.get) : desc.get,
            set: desc.set === undefined ? (previous === undefined ? UNDEFINED : previous.set) : desc.set,
            enumerable, configurable } };
    }
    const previous = current !== undefined && current.kind === "data" ? current : undefined;
    return { valid: true, descriptor: { kind: "data",
        value: desc.value === undefined ? (previous === undefined ? UNDEFINED : previous.value) : desc.value,
        writable: desc.writable === undefined ? (previous === undefined ? false : previous.writable) : desc.writable,
        enumerable, configurable } };
}
export type Completion =
    | { type: "normal" | "return"; value: Value }
    | ThrowCompletion
    | { type: "break" | "continue"; value: Value };
export function normal(value: Value = UNDEFINED): ValueCompletion { return { type: "normal", value }; }
export function failure(name: string, message: string, loc: Location): ThrowCompletion {
    return { type: "throw", origin: { kind: "engine-diagnostic" }, value: { kind: "string", value: name + ": " + message }, diagnostic: { phase: "runtime", name, message, loc } };
}
export function resourceFailure(guardCode: Guard, count: number, limit: number, message: string, loc: Location): ThrowCompletion {
    const result = failure("RangeError", message, loc);
    return { type: "throw", value: result.value, diagnostic: result.diagnostic, origin: { kind: "resource-limit", guardCode, count, limit } };
}
export function unsupportedFailure(capabilityCode: RuntimeCapability, name: string, message: string, loc: Location): ThrowCompletion {
    const result = failure(name, message, loc);
    return { type: "throw", value: result.value, diagnostic: result.diagnostic, origin: { kind: "unsupported-operation", capabilityCode } };
}
export type OperationContext = {
    readonly realm: Realm;
    call: (callee: Value, receiver: Value, args: Value[], loc: Location) => ValueCompletion;
    tick: (loc: Location) => ValueCompletion;
};
export type Builtin = (receiver: Value, args: Value[], context: OperationContext, loc: Location) => Completion;
export type Callable =
    | ScriptGuestCallable
    | { readonly kind: "guest"; readonly realm: Realm; readonly params: string[]; readonly body: Stmt[]; readonly environment: Environment; readonly source: FunctionSource | null }
    | { readonly kind: "builtin"; readonly realm: Realm; readonly invoke: Builtin; readonly initialName: string | null };
export class GuestObject {
    private propertyStorage: Map<PropertyKey, PropertyDescriptor> = new Map();
    private extensible = true;
    private prototypeSlot: GuestObject | null;
    private readonly immutablePrototypeSlot: boolean;
    constructor(proto: GuestObject | null = null, immutablePrototype: boolean = false, readonly callable: Callable | null = null) {
        this.prototypeSlot = proto;
        this.immutablePrototypeSlot = immutablePrototype;
    }
    // Compatibility inspection snapshot, never a mutable view of internal slots.
    get properties(): Map<PropertyKey, PropertyDescriptor> {
        const snapshot = new Map<PropertyKey, PropertyDescriptor>();
        for (const [key, d] of this.propertyStorage) {
            snapshot.set(key, copyDescriptor(d));
        }
        return snapshot;
    }
    getOwnProperty(key: PropertyKey): PropertyDescriptor | undefined {
        const d = this.propertyStorage.get(key);
        return d === undefined ? undefined : copyDescriptor(d);
    }
    internalDelete(key: PropertyKey): InternalBooleanCompletion {
        const current = this.propertyStorage.get(key);
        if (current === undefined) return { type: "normal", value: true };
        if (!current.configurable) return { type: "normal", value: false };
        this.propertyStorage.delete(key);
        return { type: "normal", value: true };
    }
    // Detached ordinary [[OwnPropertyKeys]]; no guest calls or throws.
    ownPropertyKeys(): PropertyKey[] {
        const indices: { key: PropertyKey; index: number }[] = [];
        const strings: PropertyKey[] = [];
        const symbols: PropertyKey[] = [];
        for (const key of this.propertyStorage.keys()) {
            const index = arrayIndex(key);
            if (typeof key !== "string") symbols.push(key);
            else if (index === undefined) strings.push(key);
            else indices.push({ key, index });
        }
        indices.sort((left, right) => left.index - right.index);
        const keys: PropertyKey[] = [];
        for (const entry of indices) keys.push(entry.key);
        for (const key of strings) keys.push(key);
        for (const key of symbols) keys.push(key);
        return keys;
    }
    isExtensible(): boolean { return this.extensible; }
    preventExtensions(): BooleanCompletion {
        this.extensible = false;
        return { type: "normal", value: true };
    }
    // Ordinary [[DefineOwnProperty]] for complete data/accessor storage.
    // Rejection is normal(false), not a guest exception. Validate before committing.
    defineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, _context: OperationContext, _loc: Location): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        return this.ordinaryDefineOwnProperty(key, desc);
    }
    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        return this.ordinaryDefineOwnProperty(key, desc);
    }
    protected ordinaryDefineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate): BooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        const result = validatePropertyDescriptor(this.propertyStorage.get(key), this.extensible, desc);
        if (!result.valid) return { type: "normal", value: false };
        this.propertyStorage.set(key, result.descriptor);
        return { type: "normal", value: true };
    }
    getPrototypeOf(): GuestObject | null { return this.prototypeSlot; }
    setPrototypeOf(prototype: GuestObject | null): BooleanCompletion {
        if (prototype === this.prototypeSlot) return { type: "normal", value: true };
        if (this.immutablePrototypeSlot) return { type: "normal", value: false };
        if (!this.extensible) return { type: "normal", value: false };
        let candidate = prototype;
        while (candidate !== null) {
            if (candidate === this) return { type: "normal", value: false };
            candidate = candidate.prototypeSlot;
        }
        this.prototypeSlot = prototype;
        return { type: "normal", value: true };
    }
    // Presence through descriptor dispatch, including inherited
    // undefined and virtual String indices. Never invoke semantic Get here.
    internalHasProperty(key: PropertyKey, _loc: Location): InternalBooleanCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            if (object.getOwnProperty(key) !== undefined) return { type: "normal", value: true };
            object = object.prototypeSlot;
        }
        return { type: "normal", value: false };
    }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, loc: Location): ValueCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            const descriptor = object.getOwnProperty(key);
            if (descriptor !== undefined) {
                if (descriptor.kind === "data") return normal(descriptor.value);
                if (descriptor.get.kind === "undefined") return normal();
                return context.call(descriptor.get, receiver, [], loc);
            }
            object = object.prototypeSlot;
        }
        return { type: "normal", value: UNDEFINED };
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, loc: Location): InternalBooleanCompletion {
        // Keep Receiver unchanged while finding the first descriptor, including
        // virtual data properties on prototypes.
        let object: GuestObject | null = this;
        while (object !== null) {
            const descriptor = object.getOwnProperty(key);
            if (descriptor !== undefined) {
                if (descriptor.kind === "accessor") {
                    if (descriptor.set.kind === "undefined") return { type: "normal", value: false };
                    const called = context.call(descriptor.set, receiver, [value], loc);
                    if (called.type === "throw") return called;
                    return { type: "normal", value: true };
                }
                if (!descriptor.writable) return { type: "normal", value: false };
                break;
            }
            object = object.prototypeSlot;
        }
        if (receiver.kind !== "object") return { type: "normal", value: false };
        const target = receiver.object;
        const existing = target.getOwnProperty(key);
        if (existing !== undefined) {
            if (existing.kind === "accessor" || !existing.writable) return { type: "normal", value: false };
            return target.defineOwnProperty(key, { value }, context, loc);
        }
        return target.defineOwnProperty(key, { value, writable: true, enumerable: true, configurable: true }, context, loc);
    }
    // Trusted host-test inspection only; semantic reads propagate completions.
    get(key: PropertyKey, context: OperationContext, loc: Location): Value {
        const result = this.internalGet(key, { kind: "object", object: this }, context, loc);
        if (result.type === "throw") throw new Error("abrupt host inspection: " + formatPropertyKey(key));
        return result.value;
    }
    set(key: PropertyKey, value: Value, context: OperationContext, loc: Location): Completion {
        const result = this.internalSet(key, value, { kind: "object", object: this }, context, loc);
        if (result.type === "throw") return result;
        if (!result.value) return failure("TypeError", "property is not writable: " + formatPropertyKey(key), loc);
        return normal(value);
    }
    // Trusted setup uses separate validated dispatch, with no execution context.
    bootstrapDefine(key: PropertyKey, desc: PropertyDescriptorUpdate): void {
        validatePropertyDescriptorUpdate(desc);
        const result = this.bootstrapDefineOwnProperty(key, desc, { line: 1, column: 1 });
        if (result.type === "throw" || !result.value) throw new Error("invalid internal property definition: " + formatPropertyKey(key));
    }
}
export type Binding = { initialized: boolean; mutable: boolean; value: Value };
export class Environment {
    bindings: Map<string, Binding> = new Map();
    constructor(public outer: Environment | null) {}
    resolve(name: string): Environment | null {
        let env: Environment | null = this;
        while (env !== null) {
            if (env.bindings.has(name)) return env;
            env = env.outer;
        }
        return null;
    }
}
export type Reference =
    | { kind: "binding"; environment: Environment | null; name: string }
    | { kind: "property"; base: Value; key: Value; loc: Location };
export type ReferenceResult = { type: "reference"; reference: Reference } | { type: "abrupt"; completion: Completion };
export function getValue(ref: Reference, context: OperationContext, loc: Location): Completion {
    if (ref.kind === "property") {
        const object = toObject(ref.base, context, ref.loc);
        if (object.type === "throw") return object;
        const key = toPropertyKey(ref.key, context, ref.loc);
        if (key.type === "throw") return key;
        // Save only a successful key, before dispatch: Get can fail or mutate.
        // The original base remains the Receiver; wrappers and values are local.
        ref.key = typeof key.value === "string"
            ? { kind: "string", value: key.value }
            : { kind: "symbol", value: key.value };
        return object.value.internalGet(key.value, ref.base, context, loc);
    }
    const binding = ref.environment === null ? undefined : ref.environment.bindings.get(ref.name);
    if (binding === undefined) return failure("ReferenceError", ref.name + " is not defined", loc);
    if (!binding.initialized) return failure("ReferenceError", ref.name + " is not initialized", loc);
    return normal(binding.value);
}
export function putValue(ref: Reference, value: Value, context: OperationContext, loc: Location, strict = true): Completion {
    if (ref.kind === "property") {
        const object = toObject(ref.base, context, ref.loc);
        if (object.type === "throw") return object;
        const key = toPropertyKey(ref.key, context, ref.loc);
        if (key.type === "throw") return key;
        // Cache only successful conversion, even when the following Set fails.
        // Boxing is local: Set must receive the original primitive/object base.
        ref.key = typeof key.value === "string"
            ? { kind: "string", value: key.value }
            : { kind: "symbol", value: key.value };
        const result = object.value.internalSet(key.value, value, ref.base, context, loc);
        if (result.type === "throw") return result;
        if (!result.value && strict) return failure("TypeError", "property is not writable: " + formatPropertyKey(key.value), loc);
        return normal(value);
    }
    const binding = ref.environment === null ? undefined : ref.environment.bindings.get(ref.name);
    if (binding === undefined) return failure("ReferenceError", ref.name + " is not defined", loc);
    if (!binding.initialized) return failure("ReferenceError", ref.name + " is not initialized", loc);
    if (!binding.mutable) return failure("TypeError", "binding is not mutable: " + ref.name, loc);
    binding.value = value;
    return normal(value);
}
export function truthy(value: Value): boolean {
    switch (value.kind) {
        case "undefined": case "null": return false;
        case "boolean": return value.value;
        case "number": return value.value !== 0 && !Number.isNaN(value.value);
        case "string": return value.value.length !== 0;
        case "symbol": case "object": return true;
    }
}
// Diagnostic/console rendering, not the guest ToString abstract operation.
export function display(value: Value): string {
    switch (value.kind) {
        case "undefined": return "undefined";
        case "null": return "null";
        case "boolean": case "number": return String(value.value);
        case "string": return value.value;
        case "symbol": return symbolDescriptiveString(value.value);
        case "object": return value.object.callable === null ? "[object Object]" : "[function]";
    }
}
export function equal(left: Value, right: Value): boolean {
    switch (left.kind) {
        case "undefined": return right.kind === "undefined";
        case "null": return right.kind === "null";
        case "boolean": return right.kind === "boolean" && left.value === right.value;
        case "number": return right.kind === "number" && left.value === right.value;
        case "string": return right.kind === "string" && left.value === right.value;
        case "symbol": return right.kind === "symbol" && left.value === right.value;
        case "object": return right.kind === "object" && left.object === right.object;
    }
}
// SameValue differs from strict equality only for NaN and signed zero.
export function sameValue(left: Value, right: Value): boolean {
    if (left.kind === "number" && right.kind === "number") {
        if (Number.isNaN(left.value)) return Number.isNaN(right.value);
        if (left.value === 0 && right.value === 0) return 1 / left.value === 1 / right.value;
    }
    return equal(left, right);
}
