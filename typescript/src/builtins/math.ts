import type {Realm} from "../realm.js";
import {toPrimitive} from "../primitive-conversion.js";
import {toNumber} from "../conversion.js";
import {normal, UNDEFINED, type ValueCompletion} from "../runtime.js";
import {wellKnownToStringTag} from "../symbols.js";

export function registerMath(realm: Realm): void {
    const object = realm.createObject();
    const constants = [
        {name: "E", value: Math.E}, {name: "LN10", value: Math.LN10},
        {name: "LN2", value: Math.LN2}, {name: "LOG10E", value: Math.LOG10E},
        {name: "LOG2E", value: Math.LOG2E}, {name: "PI", value: Math.PI},
        {name: "SQRT1_2", value: Math.SQRT1_2}, {name: "SQRT2", value: Math.SQRT2},
    ];
    for (const constant of constants) object.bootstrapDefine(constant.name, {value: {kind: "number", value: constant.value}});
    object.bootstrapDefine(wellKnownToStringTag, {value: {kind: "string", value: "Math"}, configurable: true});
    for (const name of ["abs", "ceil", "floor", "round", "sign", "trunc"]) {
        realm.registerBuiltin(object, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const number = toNumber(primitive.value, loc, context.realm);
            if (number.type === "throw") return number;
            let value = number.value;
            if (name === "abs") value = Math.abs(value);
            else if (name === "ceil") value = Math.ceil(value);
            else if (name === "floor") value = Math.floor(value);
            else if (name === "round") value = Math.round(value);
            else if (name === "sign") value = Math.sign(value);
            else value = Math.trunc(value);
            return normal({kind: "number", value});
        });
    }
    realm.defineScriptGlobal("Math", {value: {kind: "object", object}, writable: true, configurable: true});
}
