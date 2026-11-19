import { GuestObject, languageFailure, failure, validatePropertyDescriptorUpdate } from "./runtime.js";
import type { PropertyDescriptorUpdate, InternalBooleanCompletion, OperationContext, PropertyKey } from "./runtime.js";
import type { Location } from "./syntax.js";
import { arrayIndex } from "./property-keys.js";
import { toNumber, toUint32 } from "./conversion.js";
import { toPrimitive } from "./primitive-conversion.js";

function invariant(result: InternalBooleanCompletion): void {
    if (result.type !== "normal" || !result.value) throw new Error("array storage invariant failed");
}

// Array exotic: every operation except definition remains ordinary.
// Length lives in the base property storage, so inspection and receiver Set see
// the same descriptor that this algorithm validates.
export class GuestArray extends GuestObject {
    constructor(proto: GuestObject | null = null) {
        super(proto);
        invariant(super.ordinaryDefineOwnProperty("length", {
            value: { kind: "number", value: 0 }, writable: true, enumerable: false, configurable: false,
        }));
    }

    defineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, context: OperationContext, loc: Location): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        if (key === "length") return this.setLength(desc, context, loc);
        return this.defineArrayProperty(key, desc, loc);
    }

    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, loc: Location): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        if (key !== "length") return this.defineArrayProperty(key, desc, loc);
        if (desc.value !== undefined && desc.value.kind === "object") throw new Error("object array length in bootstrap");
        return this.definePrimitiveLength(desc, loc);
    }

    private defineArrayProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
        const index = arrayIndex(key);
        if (index === undefined) return super.ordinaryDefineOwnProperty(key, desc);
        const length = this.getOwnProperty("length");
        if (length === undefined || length.kind !== "data" || length.value.kind !== "number") throw new Error("missing array length");
        if (index >= length.value.value && !length.writable) return { type: "normal", value: false };
        const defined = super.ordinaryDefineOwnProperty(key, desc);
        if (!defined.value) return defined;
        if (index >= length.value.value) {
            invariant(super.ordinaryDefineOwnProperty("length", { value: { kind: "number", value: index + 1 } }));
        }
        return { type: "normal", value: true };
    }

    private setLength(desc: PropertyDescriptorUpdate, context: OperationContext, loc: Location): InternalBooleanCompletion {
        const updated: PropertyDescriptorUpdate = {
            value: desc.value, writable: desc.writable, get: desc.get, set: desc.set,
            enumerable: desc.enumerable, configurable: desc.configurable,
        };
        const savedValue = updated.value;
        if (savedValue === undefined) return this.applyLengthDescriptor(updated, loc);
        // Each conversion looks up methods again on the original object. Hooks
        // may change those methods, the caller's descriptor, or the array itself.
        const first = toPrimitive(savedValue, "number", context, loc);
        if (first.type === "throw") return first;
        const uint32 = toUint32(first.value, loc, context.realm);
        if (uint32.type === "throw") return uint32;
        const second = toPrimitive(savedValue, "number", context, loc);
        if (second.type === "throw") return second;
        const number = toNumber(second.value, loc, context.realm);
        if (number.type === "throw") return number;
        if (uint32.value !== number.value) return languageFailure(context.realm, "RangeError", "invalid array length", loc);
        updated.value = { kind: "number", value: uint32.value };
        // Read old length only in the shared storage phase, after both calls.
        return this.applyLengthDescriptor(updated, loc);
    }

    private definePrimitiveLength(desc: PropertyDescriptorUpdate, loc: Location): InternalBooleanCompletion {
        if (desc.value === undefined) return this.applyLengthDescriptor(desc, loc);
        const updated: PropertyDescriptorUpdate = {
            value: desc.value, writable: desc.writable, get: desc.get, set: desc.set,
            enumerable: desc.enumerable, configurable: desc.configurable,
        };
        // Bootstrap conversions remain primitive-only and never invoke hooks.
        const uint32 = toUint32(desc.value, loc, null);
        if (uint32.type === "throw") return uint32;
        const number = toNumber(desc.value, loc, null);
        if (number.type === "throw") return number;
        // uint32 is finite and nonnegative; numeric equality is SameValueZero here.
        if (uint32.value !== number.value) return failure("RangeError", "invalid array length", loc);
        updated.value = { kind: "number", value: uint32.value };
        return this.applyLengthDescriptor(updated, loc);
    }

    // Both entries reach the same validated storage, deletion and rollback phase.
    private applyLengthDescriptor(desc: PropertyDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
        if (desc.value === undefined) return super.ordinaryDefineOwnProperty("length", desc);
        if (desc.value.kind !== "number") throw new Error("unnormalized array length");
        const newLength = desc.value.value;
        const updated: PropertyDescriptorUpdate = {
            value: desc.value, writable: desc.writable, get: desc.get, set: desc.set,
            enumerable: desc.enumerable, configurable: desc.configurable,
        };
        const old = this.getOwnProperty("length");
        if (old === undefined || old.kind !== "data" || old.value.kind !== "number") throw new Error("missing array length");
        if (newLength >= old.value.value) return super.ordinaryDefineOwnProperty("length", updated);
        if (!old.writable) return { type: "normal", value: false };
        const freeze = updated.writable === false;
        if (freeze) updated.writable = true;
        const shortened = super.ordinaryDefineOwnProperty("length", updated);
        if (!shortened.value) return shortened;

        // Own keys already order indices ascending. Visit only present indices,
        // descending; holes have no delete effects in this ordinary-delete model.
        const keys = this.ownPropertyKeys();
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i]!;
            const index = arrayIndex(key);
            if (index === undefined) continue;
            if (index < newLength) break;
            const deleted = this.internalDelete(key);
            if (deleted.type === "throw") throw new Error("ordinary array deletion threw");
            if (!deleted.value) {
                invariant(super.ordinaryDefineOwnProperty("length", {
                    value: { kind: "number", value: index + 1 }, writable: !freeze,
                }));
                return { type: "normal", value: false };
            }
        }
        if (freeze) invariant(super.ordinaryDefineOwnProperty("length", { writable: false }));
        return { type: "normal", value: true };
    }
}
