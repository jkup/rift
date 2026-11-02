import { GuestArray } from "./array-object.js";
import { Environment, GuestObject, UNDEFINED, display, normal, type Builtin, type Value } from "./runtime.js";
import { registerNumber } from "./builtins/number.js";
import { registerFunction } from "./builtins/function.js";
import { registerObjectValueOf } from "./builtins/object.js";
import type { Stmt } from "./syntax.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "./primitive-objects.js";
import type { GuestString } from "./strings.js";

export type Output = (line: string) => void;
export class Realm {
    global: Environment = new Environment(null);
    readonly objectPrototype: GuestObject;
    readonly functionPrototype: GuestObject;
    readonly arrayPrototype: GuestArray;
    readonly booleanPrototype: GuestBoolean;
    readonly numberPrototype: GuestNumber;
    readonly stringPrototype: GuestStringObject;
    constructor(output: Output) {
        // Bootstrap dependencies directly, before factories or global installation.
        this.objectPrototype = new GuestObject(null, true);
        this.functionPrototype = new GuestObject(this.objectPrototype, false, {
            kind: "builtin", realm: this, invoke: (_receiver, _args, _context, _loc) => normal(UNDEFINED),
        });
        setBuiltinMetadata(this.functionPrototype, "", 0);
        this.arrayPrototype = new GuestArray(this.objectPrototype);
        this.booleanPrototype = new GuestBoolean(false, this.objectPrototype);
        this.numberPrototype = new GuestNumber(0, this.objectPrototype);
        this.stringPrototype = new GuestStringObject("", this.objectPrototype);
        registerObjectValueOf(this);
        registerFunction(this);
        this.global.bindings.set("undefined", { initialized: true, mutable: false, value: UNDEFINED });
        this.global.bindings.set("NaN", { initialized: true, mutable: false, value: { kind: "number", value: NaN } });
        this.global.bindings.set("Infinity", { initialized: true, mutable: false, value: { kind: "number", value: Infinity } });
        const consoleObject = this.createObject();
        this.registerBuiltin(consoleObject, "log", 0, (_receiver, args, _context, _loc) => {
            let line = "";
            for (let i = 0; i < args.length; i++) { if (i > 0) line += " "; line += display(args[i]); }
            output(line);
            return normal();
        });
        this.global.bindings.set("console", { initialized: true, mutable: true, value: { kind: "object", object: consoleObject } });
        registerNumber(this);
    }
    createObject(): GuestObject { return new GuestObject(this.objectPrototype); }
    createArray(): GuestArray { return new GuestArray(this.arrayPrototype); }
    createBooleanObject(value: boolean): GuestBoolean { return new GuestBoolean(value, this.booleanPrototype); }
    createNumberObject(value: number): GuestNumber { return new GuestNumber(value, this.numberPrototype); }
    createStringObject(value: GuestString): GuestStringObject { return new GuestStringObject(value, this.stringPrototype); }
    createGuestFunction(params: string[], body: Stmt[], environment: Environment): GuestObject {
        return new GuestObject(this.functionPrototype, false, { kind: "guest", realm: this, params, body, environment });
    }
    createBuiltin(name: string, length: number, invoke: Builtin): GuestObject {
        const object = new GuestObject(this.functionPrototype, false, { kind: "builtin", realm: this, invoke });
        setBuiltinMetadata(object, name, length);
        return object;
    }
    registerBuiltin(target: GuestObject, name: string, length: number, invoke: Builtin): Value {
        const object = this.createBuiltin(name, length, invoke);
        const value: Value = { kind: "object", object };
        target.bootstrapDefine(name, { value: value, writable: true, enumerable: false, configurable: true });
        return value;
    }
}

// Trusted metadata uses validated storage and never calls guest code.
function setBuiltinMetadata(object: GuestObject, name: string, length: number): void {
    if (!Number.isFinite(length) || !Number.isInteger(length) || length < 0) throw new Error("invalid builtin length");
    object.bootstrapDefine("name", { value: { kind: "string", value: name }, writable: false, enumerable: false, configurable: true });
    object.bootstrapDefine("length", { value: { kind: "number", value: length === 0 ? 0 : length }, writable: false, enumerable: false, configurable: true });
}
