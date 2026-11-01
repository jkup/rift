import { GuestObject, failure } from "./runtime.js";
import type { DataDescriptorUpdate, InternalBooleanCompletion, PropertyKey } from "./runtime.js";
import type { Location } from "./syntax.js";
import { arrayIndex } from "./property-keys.js";
import { toNumber, toUint32 } from "./conversion.js";

function invariant(result: InternalBooleanCompletion): void {
    if (result.type !== "normal" || !result.value) throw new Error("array storage invariant failed");
}

// Data-only array exotic: every operation except definition remains ordinary.
// Length lives in the base property storage, so inspection and receiver Set see
// the same descriptor that this algorithm validates.
export class GuestArray extends GuestObject {
    constructor() {
        super();
        invariant(super.defineOwnProperty("length", {
            value: { kind: "number", value: 0 }, writable: true, enumerable: false, configurable: false,
        }, { line: 1, column: 1 }));
    }

    defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, loc: Location): InternalBooleanCompletion {
        if (key === "length") return this.setLength(desc, loc);
        const index = arrayIndex(key);
        if (index === undefined) return super.defineOwnProperty(key, desc, loc);
        const length = this.getOwnProperty("length");
        if (length === undefined || length.value.kind !== "number") throw new Error("missing array length");
        if (index >= length.value.value && !length.writable) return { type: "normal", value: false };
        const defined = super.defineOwnProperty(key, desc, loc);
        if (defined.type === "throw" || !defined.value) return defined;
        if (index >= length.value.value) {
            invariant(super.defineOwnProperty("length", { value: { kind: "number", value: index + 1 } }, loc));
        }
        return { type: "normal", value: true };
    }

    private setLength(desc: DataDescriptorUpdate, loc: Location): InternalBooleanCompletion {
        if (desc.value === undefined) return super.defineOwnProperty("length", desc, loc);
        const updated: DataDescriptorUpdate = {
            value: desc.value, writable: desc.writable,
            enumerable: desc.enumerable, configurable: desc.configurable,
        };
        // Preserve both conversions and their order. Future guest coercion may
        // have effects on each call; old length must be read only afterward.
        const uint32 = toUint32(desc.value, loc);
        if (uint32.type === "throw") return uint32;
        const number = toNumber(desc.value, loc);
        if (number.type === "throw") return number;
        // uint32 is finite and nonnegative; numeric equality is SameValueZero here.
        if (uint32.value !== number.value) return failure("RangeError", "invalid array length", loc);
        updated.value = { kind: "number", value: uint32.value };
        const old = this.getOwnProperty("length");
        if (old === undefined || old.value.kind !== "number") throw new Error("missing array length");
        if (uint32.value >= old.value.value) return super.defineOwnProperty("length", updated, loc);
        if (!old.writable) return { type: "normal", value: false };
        const freeze = updated.writable === false;
        if (freeze) updated.writable = true;
        const shortened = super.defineOwnProperty("length", updated, loc);
        if (shortened.type === "throw" || !shortened.value) return shortened;

        // Own keys already order indices ascending. Visit only present indices,
        // descending; holes have no delete effects in this ordinary-delete model.
        const keys = this.ownPropertyKeys();
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i]!;
            const index = arrayIndex(key);
            if (index === undefined) continue;
            if (index < uint32.value) break;
            const deleted = this.internalDelete(key);
            if (deleted.type === "throw") throw new Error("ordinary array deletion threw");
            if (!deleted.value) {
                invariant(super.defineOwnProperty("length", {
                    value: { kind: "number", value: index + 1 }, writable: !freeze,
                }, loc));
                return { type: "normal", value: false };
            }
        }
        if (freeze) invariant(super.defineOwnProperty("length", { writable: false }, loc));
        return { type: "normal", value: true };
    }
}
