import { Environment, GuestObject, UNDEFINED, display, normal, type Builtin, type Value } from "./runtime.js";
import { registerNumber } from "./builtins/number.js";

export type Output = (line: string) => void;
export class Realm {
    global: Environment = new Environment(null);
    constructor(output: Output) {
        this.global.bindings.set("undefined", { initialized: true, mutable: false, value: UNDEFINED });
        this.global.bindings.set("NaN", { initialized: true, mutable: false, value: { kind: "number", value: NaN } });
        this.global.bindings.set("Infinity", { initialized: true, mutable: false, value: { kind: "number", value: Infinity } });
        const consoleObject = new GuestObject();
        this.registerBuiltin(consoleObject, "log", (_receiver, args, _loc) => {
            let line = "";
            for (let i = 0; i < args.length; i++) { if (i > 0) line += " "; line += display(args[i]); }
            output(line);
            return normal();
        });
        this.global.bindings.set("console", { initialized: true, mutable: true, value: { kind: "object", object: consoleObject } });
        registerNumber(this);
    }
    registerBuiltin(target: GuestObject, name: string, invoke: Builtin): Value {
        const object = new GuestObject(); object.callable = { kind: "builtin", invoke };
        const value: Value = { kind: "object", object };
        target.define(name, value, true, false, true);
        return value;
    }
}
