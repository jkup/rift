// Probe: ordinary-object storage. Property keys are strings or guest symbols
// (represented by an id class, never a host Symbol), descriptors carry
// presence flags, and the prototype chain is a nullable class reference.

class GuestSymbol {
    description: string;
    constructor(description: string) {
        this.description = description;
    }
}

type PropertyKey = string | GuestSymbol;

class Property {
    value: number;
    writable: boolean;
    enumerable: boolean;
    configurable: boolean;
    constructor(value: number, writable: boolean, enumerable: boolean, configurable: boolean) {
        this.value = value;
        this.writable = writable;
        this.enumerable = enumerable;
        this.configurable = configurable;
    }
}

// Descriptor fields that may be absent: "absent" is different from "false".
interface PartialDescriptor {
    value?: number;
    writable?: boolean;
}

class GuestObject {
    // Not named `prototype`: scriptc treats that field name as class-prototype
    // machinery and moves every method of the class into the dynamic tier.
    proto: GuestObject | null;
    stringProps: Map<string, Property> = new Map();
    symbolProps: Map<GuestSymbol, Property> = new Map();
    constructor(prototype: GuestObject | null) {
        this.proto = prototype;
    }

    getOwn(key: PropertyKey): Property | undefined {
        if (typeof key === "string") return this.stringProps.get(key);
        return this.symbolProps.get(key);
    }

    define(key: PropertyKey, desc: PartialDescriptor): void {
        const existing = this.getOwn(key);
        if (existing !== undefined) {
            if (desc.value !== undefined) existing.value = desc.value;
            if (desc.writable !== undefined) existing.writable = desc.writable;
            return;
        }
        const prop = new Property(desc.value ?? 0, desc.writable ?? false, true, true);
        if (typeof key === "string") this.stringProps.set(key, prop);
        else this.symbolProps.set(key, prop);
    }

    get(key: PropertyKey): number | undefined {
        let current: GuestObject | null = this;
        while (current !== null) {
            const prop = current.getOwn(key);
            if (prop !== undefined) return prop.value;
            current = current.proto;
        }
        return undefined;
    }

    ownStringKeys(): string[] {
        // Spec order: array indices ascending, then strings in insertion order.
        const indices: number[] = [];
        const others: string[] = [];
        for (const key of this.stringProps.keys()) {
            const n = Number(key);
            if (String(n >>> 0) === key && n !== 4294967295) indices.push(n);
            else others.push(key);
        }
        indices.sort((x, y) => x - y);
        return indices.map((n) => String(n)).concat(others);
    }
}

const proto = new GuestObject(null);
proto.define("inherited", { value: 1, writable: true });

const obj = new GuestObject(proto);
obj.define("b", { value: 2 });
obj.define("10", { value: 3 });
obj.define("a", { value: 4 });
obj.define("2", { value: 5 });

console.log("own keys:", obj.ownStringKeys().join(","));
console.log("inherited:", obj.get("inherited"));
console.log("missing:", obj.get("nope"));

// Mutation through one reference is visible through another and through the
// prototype chain of a third object.
const alias = proto;
alias.define("inherited", { value: 100 });
console.log("after alias write:", obj.get("inherited"));

// Absent vs present-false descriptor fields.
obj.define("b", { writable: true });
const b = obj.getOwn("b");
console.log("b:", b?.value, b?.writable);

// Symbol keys never collide with string keys that look the same.
const sym = new GuestSymbol("a");
const sym2 = new GuestSymbol("a");
obj.define(sym, { value: 99 });
console.log("symbol vs string:", obj.get(sym), obj.get("a"), obj.get(sym2));

// Deleting and reinserting moves a string key to the end of insertion order.
obj.stringProps.delete("b");
obj.define("b", { value: 7 });
console.log("reinserted order:", obj.ownStringKeys().join(","));
