import type { Diagnostic, Location, Stmt } from "./syntax.js";
import type { GuestString } from "./strings.js";
import { arrayIndex } from "./property-keys.js";

export type Value =
    | { kind: "undefined" } | { kind: "null" }
    | { kind: "boolean"; value: boolean } | { kind: "number"; value: number }
    | { kind: "string"; value: GuestString } | { kind: "object"; object: GuestObject };
export const UNDEFINED: Value = { kind: "undefined" };
export type PropertyKey = GuestString;
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
export function normal(value: Value = UNDEFINED): Completion { return { type: "normal", value }; }
export function failure(name: string, message: string, loc: Location): ThrowCompletion {
    return { type: "throw", value: { kind: "string", value: name + ": " + message }, diagnostic: { phase: "runtime", name, message, loc } };
}
export type Builtin = (receiver: Value, args: Value[], loc: Location) => Completion;
export type Callable =
    | { kind: "guest"; params: string[]; body: Stmt[]; environment: Environment }
    | { kind: "builtin"; invoke: Builtin };
export class GuestObject {
    private propertyStorage: Map<PropertyKey, DataDescriptor> = new Map();
    private extensible = true;
    private prototypeSlot: GuestObject | null = null;
    callable: Callable | null = null;
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
    // Detached, string-only ordinary [[OwnPropertyKeys]]; no guest calls or throws.
    ownPropertyKeys(): PropertyKey[] {
        const indices: { key: PropertyKey; index: number }[] = [];
        const strings: PropertyKey[] = [];
        for (const key of this.propertyStorage.keys()) {
            const index = arrayIndex(key);
            if (index === undefined) strings.push(key);
            else indices.push({ key, index });
        }
        indices.sort((left, right) => left.index - right.index);
        const keys: PropertyKey[] = [];
        for (const entry of indices) keys.push(entry.key);
        for (const key of strings) keys.push(key);
        return keys;
    }
    isExtensible(): boolean { return this.extensible; }
    preventExtensions(): BooleanCompletion {
        this.extensible = false;
        return { type: "normal", value: true };
    }
    // Ordinary [[DefineOwnProperty]], restricted to data/generic descriptors.
    // Rejection is normal(false), not a guest exception. Validate before committing.
    defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
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
        if (!this.extensible) return { type: "normal", value: false };
        let candidate = prototype;
        while (candidate !== null) {
            if (candidate === this) return { type: "normal", value: false };
            candidate = candidate.prototypeSlot;
        }
        this.prototypeSlot = prototype;
        return { type: "normal", value: true };
    }
    // Ordinary data-only presence, including inherited undefined. No value reads
    // or exotic prototype dispatch; current arrays share these ordinary slots.
    internalHasProperty(key: PropertyKey, _loc: Location): InternalBooleanCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            if (object.propertyStorage.has(key)) return { type: "normal", value: true };
            object = object.prototypeSlot;
        }
        return { type: "normal", value: false };
    }
    internalGet(key: PropertyKey, _receiver: Value, _loc: Location): ValueCompletion {
        let object: GuestObject | null = this;
        while (object !== null) {
            const descriptor = object.propertyStorage.get(key);
            if (descriptor !== undefined) return { type: "normal", value: descriptor.value };
            object = object.prototypeSlot;
        }
        return { type: "normal", value: UNDEFINED };
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, loc: Location): InternalBooleanCompletion {
        // Keep Receiver unchanged while finding the first descriptor. Direct
        // slot traversal is valid only for this ordinary, data-only object model.
        let object: GuestObject | null = this;
        while (object !== null) {
            const descriptor = object.propertyStorage.get(key);
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
            return target.defineOwnProperty(key, { value }, loc);
        }
        return target.defineOwnProperty(key, { value, writable: true, enumerable: true, configurable: true }, loc);
    }
    // Trusted host-test inspection only; semantic reads propagate completions.
    get(key: PropertyKey): Value {
        const result = this.internalGet(key, { kind: "object", object: this }, { line: 1, column: 1 });
        if (result.type === "throw") throw new Error("abrupt host inspection: " + key);
        return result.value;
    }
    set(key: PropertyKey, value: Value, loc: Location): Completion {
        const result = this.internalSet(key, value, { kind: "object", object: this }, loc);
        if (result.type === "throw") return result;
        if (!result.value) return failure("TypeError", "property is not writable: " + key, loc);
        return normal(value);
    }
    define(key: PropertyKey, value: Value, writable: boolean, enumerable: boolean, configurable: boolean): void {
        // Bootstrap/literal convenience, still validated. Rejection is a host
        // initialization bug, not a guest exception or an unchecked escape hatch.
        // Bootstrap has no guest source; 1:1 is its synthetic host location.
        const result = this.defineOwnProperty(key, { value, writable, enumerable, configurable }, { line: 1, column: 1 });
        if (result.type === "throw" || !result.value) throw new Error("invalid internal property definition: " + key);
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
    | { kind: "property"; base: GuestObject; key: PropertyKey };
export type ReferenceResult = { type: "reference"; reference: Reference } | { type: "abrupt"; completion: Completion };
export function getValue(ref: Reference, loc: Location): Completion {
    if (ref.kind === "property") return ref.base.internalGet(ref.key, { kind: "object", object: ref.base }, loc);
    const binding = ref.environment === null ? undefined : ref.environment.bindings.get(ref.name);
    if (binding === undefined) return failure("ReferenceError", ref.name + " is not defined", loc);
    if (!binding.initialized) return failure("ReferenceError", ref.name + " is not initialized", loc);
    return normal(binding.value);
}
export function putValue(ref: Reference, value: Value, loc: Location): Completion {
    if (ref.kind === "property") return ref.base.set(ref.key, value, loc);
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
        case "object": return true;
    }
}
// Diagnostic/console rendering, not the guest ToString abstract operation.
export function display(value: Value): string {
    switch (value.kind) {
        case "undefined": return "undefined";
        case "null": return "null";
        case "boolean": case "number": return String(value.value);
        case "string": return value.value;
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
