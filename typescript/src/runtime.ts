import { GuestSymbol, formatPropertyKey, symbolDescriptiveString } from "./symbols.js";
import { toObject } from "./object-conversion.js";
import { toPropertyKey } from "./conversion.js";
import type { Diagnostic, Location, Stmt, FunctionSource } from "./syntax.js";
import type { GuestString } from "./strings.js";
import type { Realm } from "./realm.js";
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
export type ThrowCompletion = { type: "throw"; value: Value; diagnostic: Diagnostic };
export type ValueCompletion = { type: "normal"; value: Value } | ThrowCompletion;
export type InternalBooleanCompletion = BooleanCompletion | ThrowCompletion;
export type DataDescriptor = { value: Value; writable: boolean; enumerable: boolean; configurable: boolean };
export type Completion =
    | { type: "normal" | "return"; value: Value }
    | { type: "throw"; value: Value; diagnostic: Diagnostic }
    | { type: "break" | "continue"; value: Value };
export function normal(value: Value = UNDEFINED): ValueCompletion { return { type: "normal", value }; }
export function failure(name: string, message: string, loc: Location): ThrowCompletion {
    return { type: "throw", value: { kind: "string", value: name + ": " + message }, diagnostic: { phase: "runtime", name, message, loc } };
}
export type OperationContext = {
    readonly realm: Realm;
    call: (callee: Value, receiver: Value, args: Value[], loc: Location) => ValueCompletion;
    tick: (loc: Location) => ValueCompletion;
};
export type Builtin = (receiver: Value, args: Value[], context: OperationContext, loc: Location) => Completion;
export type Callable =
    | { readonly kind: "guest"; readonly realm: Realm; readonly params: string[]; readonly body: Stmt[]; readonly environment: Environment; readonly source: FunctionSource | null }
    | { readonly kind: "builtin"; readonly realm: Realm; readonly invoke: Builtin; readonly initialName: string | null };
export class GuestObject {
    private propertyStorage: Map<PropertyKey, DataDescriptor> = new Map();
    private extensible = true;
    private prototypeSlot: GuestObject | null;
    private readonly immutablePrototypeSlot: boolean;
    constructor(proto: GuestObject | null = null, immutablePrototype: boolean = false, readonly callable: Callable | null = null) {
        this.prototypeSlot = proto;
        this.immutablePrototypeSlot = immutablePrototype;
    }
    // Compatibility inspection snapshot, never a mutable view of internal slots.
    get properties(): Map<PropertyKey, DataDescriptor> {
        const snapshot = new Map<PropertyKey, DataDescriptor>();
        for (const [key, d] of this.propertyStorage) {
            snapshot.set(key, { value: d.value, writable: d.writable, enumerable: d.enumerable, configurable: d.configurable });
        }
        return snapshot;
    }
    getOwnProperty(key: PropertyKey): DataDescriptor | undefined {
        const d = this.propertyStorage.get(key);
        return d === undefined ? undefined : { value: d.value, writable: d.writable, enumerable: d.enumerable, configurable: d.configurable };
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
    // Ordinary [[DefineOwnProperty]], restricted to data/generic descriptors.
    // Rejection is normal(false), not a guest exception. Validate before committing.
    defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, _context: OperationContext, _loc: Location): InternalBooleanCompletion {
        return this.ordinaryDefineOwnProperty(key, desc);
    }
    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
        return this.ordinaryDefineOwnProperty(key, desc);
    }
    protected ordinaryDefineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate): BooleanCompletion {
        const current = this.propertyStorage.get(key);
        if (current === undefined) {
            if (!this.extensible) return { type: "normal", value: false };
            this.propertyStorage.set(key, {
                value: desc.value === undefined ? UNDEFINED : desc.value,
                writable: desc.writable === undefined ? false : desc.writable,
                enumerable: desc.enumerable === undefined ? false : desc.enumerable,
                configurable: desc.configurable === undefined ? false : desc.configurable,
            });
            return { type: "normal", value: true };
        }
        if (!current.configurable) {
            if (desc.configurable === true) return { type: "normal", value: false };
            if (desc.enumerable !== undefined && desc.enumerable !== current.enumerable) return { type: "normal", value: false };
            if (!current.writable) {
                if (desc.writable === true) return { type: "normal", value: false };
                if (desc.value !== undefined) return { type: "normal", value: sameValue(desc.value, current.value) };
            }
        }
        this.propertyStorage.set(key, {
            value: desc.value === undefined ? current.value : desc.value,
            writable: desc.writable === undefined ? current.writable : desc.writable,
            enumerable: desc.enumerable === undefined ? current.enumerable : desc.enumerable,
            configurable: desc.configurable === undefined ? current.configurable : desc.configurable,
        });
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
    // Data-only presence through descriptor dispatch, including inherited
    // undefined and virtual String indices. Never invoke semantic Get here.
    internalHasProperty(key: PropertyKey, _loc: Location): InternalBooleanCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            if (object.getOwnProperty(key) !== undefined) return { type: "normal", value: true };
            object = object.prototypeSlot;
        }
        return { type: "normal", value: false };
    }
    internalGet(key: PropertyKey, _receiver: Value, _loc: Location): ValueCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            const descriptor = object.getOwnProperty(key);
            if (descriptor !== undefined) return { type: "normal", value: descriptor.value };
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
                if (!descriptor.writable) return { type: "normal", value: false };
                break;
            }
            object = object.prototypeSlot;
        }
        if (receiver.kind !== "object") return { type: "normal", value: false };
        const target = receiver.object;
        const existing = target.getOwnProperty(key);
        if (existing !== undefined) {
            if (!existing.writable) return { type: "normal", value: false };
            return target.defineOwnProperty(key, { value }, context, loc);
        }
        return target.defineOwnProperty(key, { value, writable: true, enumerable: true, configurable: true }, context, loc);
    }
    // Trusted host-test inspection only; semantic reads propagate completions.
    get(key: PropertyKey): Value {
        const result = this.internalGet(key, { kind: "object", object: this }, { line: 1, column: 1 });
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
    bootstrapDefine(key: PropertyKey, desc: DataDescriptorUpdate): void {
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
        return object.value.internalGet(key.value, ref.base, loc);
    }
    const binding = ref.environment === null ? undefined : ref.environment.bindings.get(ref.name);
    if (binding === undefined) return failure("ReferenceError", ref.name + " is not defined", loc);
    if (!binding.initialized) return failure("ReferenceError", ref.name + " is not initialized", loc);
    return normal(binding.value);
}
export function putValue(ref: Reference, value: Value, context: OperationContext, loc: Location): Completion {
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
        if (!result.value) return failure("TypeError", "property is not writable: " + formatPropertyKey(key.value), loc);
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
