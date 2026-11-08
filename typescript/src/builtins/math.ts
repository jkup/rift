import type {Realm} from "../realm.js";
import {toPrimitive} from "../primitive-conversion.js";
import {toNumber, type NumberCompletion} from "../conversion.js";
import {normal, UNDEFINED, type Value, type OperationContext, type ValueCompletion} from "../runtime.js";
import type {Location} from "../syntax.js";
import {wellKnownToStringTag} from "../symbols.js";

function numericArgument(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    return toNumber(primitive.value, loc, context.realm);
}

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
    for (const name of ["abs", "ceil", "floor", "round", "sign", "trunc", "clz32", "fround",
        "acos", "asin", "atan", "cos", "sin", "tan", "acosh", "asinh", "atanh",
        "cosh", "sinh", "tanh", "exp", "expm1", "log", "log1p", "log2", "log10", "sqrt", "cbrt"]) {
        realm.registerBuiltin(object, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const number = numericArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (number.type === "throw") return number;
            let value = number.value;
            switch (name) {
                case "abs": value = Math.abs(value); break;
                case "ceil": value = Math.ceil(value); break;
                case "floor": value = Math.floor(value); break;
                case "round": value = Math.round(value); break;
                case "sign": value = Math.sign(value); break;
                case "trunc": value = Math.trunc(value); break;
                case "clz32": value = Math.clz32(value); break;
                case "fround": value = Math.fround(value); break;
                case "acos": value = Math.acos(value); break;
                case "asin": value = Math.asin(value); break;
                case "atan": value = Math.atan(value); break;
                case "cos": value = Math.cos(value); break;
                case "sin": value = Math.sin(value); break;
                case "tan": value = Math.tan(value); break;
                case "acosh": value = Math.acosh(value); break;
                case "asinh": value = Math.asinh(value); break;
                case "atanh": value = Math.atanh(value); break;
                case "cosh": value = Math.cosh(value); break;
                case "sinh": value = Math.sinh(value); break;
                case "tanh": value = Math.tanh(value); break;
                case "exp": value = Math.exp(value); break;
                case "expm1": value = Math.expm1(value); break;
                case "log": value = Math.log(value); break;
                case "log1p": value = Math.log1p(value); break;
                case "log2": value = Math.log2(value); break;
                case "log10": value = Math.log10(value); break;
                case "sqrt": value = Math.sqrt(value); break;
                case "cbrt": value = Math.cbrt(value); break;
            }
            return normal({kind: "number", value});
        });
    }
    for (const name of ["atan2", "pow", "imul"]) {
        realm.registerBuiltin(object, name, 2, (_receiver, args, context, loc): ValueCompletion => {
            const left = numericArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (left.type === "throw") return left;
            const right = numericArgument(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (right.type === "throw") return right;
            const value = name === "atan2" ? Math.atan2(left.value, right.value)
                : name === "pow" ? Math.pow(left.value, right.value) : Math.imul(left.value, right.value);
            return normal({kind: "number", value});
        });
    }
    for (const name of ["min", "max"]) {
        realm.registerBuiltin(object, name, 2, (_receiver, args, context, loc): ValueCompletion => {
            const minimum = name === "min";
            let value = minimum ? Infinity : -Infinity;
            for (const arg of args) {
                const number = numericArgument(arg, context, loc);
                if (number.type === "throw") return number;
                const next = number.value;
                // NaN is sticky, but later arguments must still be converted.
                if (next !== next) value = next;
                else if (minimum ? next < value : next > value) value = next;
                else if (next === 0 && value === 0 && (minimum ? 1 / next < 0 : 1 / next > 0)) value = next;
            }
            return normal({kind: "number", value});
        });
    }
    realm.defineScriptGlobal("Math", {value: {kind: "object", object}, writable: true, configurable: true});
}
