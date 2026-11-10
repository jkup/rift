import type { GuestSymbol } from "./symbols.js";
import { GuestObject, validatePropertyDescriptor, validatePropertyDescriptorUpdate } from "./runtime.js";
import type { PropertyDescriptor, PropertyDescriptorUpdate, InternalBooleanCompletion, OperationContext, PropertyKey } from "./runtime.js";
import { stringIndex } from "./property-keys.js";
import { stringLength, stringUnit, type GuestString } from "./strings.js";
import type { Location } from "./syntax.js";

export class GuestBoolean extends GuestObject {
    constructor(readonly booleanData: boolean, proto: GuestObject | null = null) { super(proto); }
}

export class GuestBigInt extends GuestObject {
    constructor(readonly bigintData: bigint, proto: GuestObject | null = null) { super(proto); }
}

export class GuestNumber extends GuestObject {
    constructor(readonly numberData: number, proto: GuestObject | null = null) { super(proto); }
}

export class GuestStringObject extends GuestObject {
    constructor(readonly stringData: GuestString, proto: GuestObject | null = null) {
        super(proto);
        super.ordinaryDefineOwnProperty("length", {
            value: { kind: "number", value: stringLength(stringData) },
            writable: false, enumerable: false, configurable: false,
        });
    }

    getOwnProperty(key: PropertyKey): PropertyDescriptor | undefined {
        const stored = super.getOwnProperty(key);
        if (stored !== undefined) return stored;
        const index = stringIndex(key, stringLength(this.stringData));
        if (index === undefined) return undefined;
        return {
            kind: "data", value: { kind: "string", value: stringUnit(this.stringData, index) },
            writable: false, enumerable: true, configurable: false,
        };
    }

    defineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, _context: OperationContext, _loc: Location): InternalBooleanCompletion {
        return this.defineStringProperty(key, desc);
    }

    protected bootstrapDefineOwnProperty(key: PropertyKey, desc: PropertyDescriptorUpdate, _loc: Location): InternalBooleanCompletion {
        return this.defineStringProperty(key, desc);
    }

    private defineStringProperty(key: PropertyKey, desc: PropertyDescriptorUpdate): InternalBooleanCompletion {
        validatePropertyDescriptorUpdate(desc);
        const index = stringIndex(key, stringLength(this.stringData));
        if (index === undefined) return super.ordinaryDefineOwnProperty(key, desc);
        // A compatible update succeeds without materializing a virtual index,
        // even after extensions have been prevented.
        const compatible = validatePropertyDescriptor(this.getOwnProperty(key), this.isExtensible(), desc);
        return { type: "normal", value: compatible.valid };
    }

    internalDelete(key: PropertyKey): InternalBooleanCompletion {
        if (stringIndex(key, stringLength(this.stringData)) !== undefined) return { type: "normal", value: false };
        return super.internalDelete(key);
    }

    ownPropertyKeys(): PropertyKey[] {
        const keys: PropertyKey[] = [];
        for (let index = 0; index < stringLength(this.stringData); index++) keys.push(String(index));
        // Definitions never insert virtual indices into ordinary storage.
        // Its sorted array indices therefore all follow the virtual range.
        for (const key of super.ownPropertyKeys()) keys.push(key);
        return keys;
    }

    get properties(): Map<PropertyKey, PropertyDescriptor> {
        const snapshot = new Map<PropertyKey, PropertyDescriptor>();
        for (const key of this.ownPropertyKeys()) {
            const descriptor = this.getOwnProperty(key);
            if (descriptor !== undefined) snapshot.set(key, descriptor);
        }
        return snapshot;
    }
}

export class GuestSymbolObject extends GuestObject {
    constructor(readonly symbolData: GuestSymbol, proto: GuestObject | null = null) { super(proto); }
}
