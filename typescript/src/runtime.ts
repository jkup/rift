import type { Diagnostic, Location, Stmt } from "./syntax.js";
import type { GuestString } from "./strings.js";

export type Value =
    | { kind: "undefined" } | { kind: "null" }
    | { kind: "boolean"; value: boolean } | { kind: "number"; value: number }
    | { kind: "string"; value: GuestString } | { kind: "object"; object: GuestObject };
export const UNDEFINED: Value = { kind: "undefined" };
export type PropertyKey = GuestString;
export type DataDescriptor = { value: Value; writable: boolean; enumerable: boolean; configurable: boolean };
export type Completion =
    | { type: "normal" | "return"; value: Value }
    | { type: "throw"; value: Value; diagnostic: Diagnostic }
    | { type: "break" | "continue"; value: Value };
export function normal(value: Value = UNDEFINED): Completion { return { type: "normal", value }; }
export function failure(name: string, message: string, loc: Location): Completion {
    return { type: "throw", value: { kind: "string", value: name + ": " + message }, diagnostic: { phase: "runtime", name, message, loc } };
}
export type Builtin = (receiver: Value, args: Value[], loc: Location) => Completion;
export type Callable =
    | { kind: "guest"; params: string[]; body: Stmt[]; environment: Environment }
    | { kind: "builtin"; invoke: Builtin };
export class GuestObject {
    properties: Map<PropertyKey, DataDescriptor> = new Map();
    callable: Callable | null = null;
    get(key: PropertyKey): Value {
        const descriptor = this.properties.get(key);
        return descriptor === undefined ? UNDEFINED : descriptor.value;
    }
    set(key: PropertyKey, value: Value, loc: Location): Completion {
        const descriptor = this.properties.get(key);
        if (descriptor !== undefined) {
            if (!descriptor.writable) return failure("TypeError", "property is not writable: " + key, loc);
            descriptor.value = value;
        } else this.define(key, value, true, true, true);
        return normal(value);
    }
    define(key: PropertyKey, value: Value, writable: boolean, enumerable: boolean, configurable: boolean): void {
        // Bootstrap/internal creation only. General ValidateAndApplyPropertyDescriptor is deferred.
        this.properties.set(key, { value, writable, enumerable, configurable });
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
    if (ref.kind === "property") return normal(ref.base.get(ref.key));
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
