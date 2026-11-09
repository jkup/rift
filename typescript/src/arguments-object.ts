import { GuestObject, type InternalBooleanCompletion, type OperationContext, type PropertyDescriptor,
    type PropertyDescriptorUpdate, type PropertyKey, type Value } from "./runtime.js";
import type { ScriptBindingCell } from "./script-environment.js";
import type { Location } from "./syntax.js";

export class GuestArguments extends GuestObject {
    private readonly parameterMap: Map<PropertyKey, ScriptBindingCell> = new Map();

    mapParameter(key: string, binding: ScriptBindingCell): void {
        const property = super.getOwnProperty(key);
        if (property === undefined || property.kind !== "data" || !property.writable ||
            !binding.mutable || this.parameterMap.has(key)) throw new Error("invalid mapped parameter");
        this.parameterMap.set(key, binding);
    }

    private mappedBinding(key: PropertyKey): ScriptBindingCell | undefined {
        const binding = this.parameterMap.get(key);
        if (binding !== undefined && (!binding.initialized || !binding.mutable))
            throw new Error("mapped parameter is not initialized and mutable");
        return binding;
    }

    override getOwnProperty(key: PropertyKey): PropertyDescriptor | undefined {
        const property = super.getOwnProperty(key);
        const binding = this.mappedBinding(key);
        if (binding !== undefined) {
            if (property === undefined || property.kind !== "data") throw new Error("mapped property invariant");
            property.value = binding.value;
        }
        return property;
    }

    override defineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate,
        _context: OperationContext, _loc: Location): InternalBooleanCompletion {
        return this.defineMappedProperty(key, desc);
    }

    protected override bootstrapDefineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate,
        _loc: Location): InternalBooleanCompletion {
        return this.defineMappedProperty(key, desc);
    }

    private defineMappedProperty(key: PropertyKey, desc: PropertyDescriptorUpdate): InternalBooleanCompletion {
        const binding = this.mappedBinding(key);
        const accessor = desc.get !== undefined || desc.set !== undefined;
        // Disconnecting a writable mapping must retain its current parameter value.
        const update = binding !== undefined && !accessor && desc.value === undefined && desc.writable === false
            ? { ...desc, value: binding.value } : desc;
        const defined = this.ordinaryDefineOwnProperty(key, update);
        if (!defined.value || binding === undefined) return defined;
        if (accessor) this.parameterMap.delete(key);
        else {
            if (desc.value !== undefined) binding.value = desc.value;
            if (desc.writable === false) this.parameterMap.delete(key);
        }
        return defined;
    }

    override internalSet(key: PropertyKey, value: Value, receiver: Value,
        context: OperationContext, loc: Location): InternalBooleanCompletion {
        if (receiver.kind === "object" && receiver.object === this) {
            const binding = this.mappedBinding(key);
            if (binding !== undefined) binding.value = value;
        }
        return super.internalSet(key, value, receiver, context, loc);
    }

    override internalDelete(key: PropertyKey): InternalBooleanCompletion {
        const deleted = super.internalDelete(key);
        if (deleted.type === "normal" && deleted.value) this.parameterMap.delete(key);
        return deleted;
    }
}
