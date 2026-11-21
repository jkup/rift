import type { Realm } from "../realm.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber, type NumberCompletion } from "../conversion.js";
import {
    normal,
    UNDEFINED,
    type Value,
    type OperationContext,
    type ValueCompletion,
    type GuestObject,
} from "../runtime.js";
import type { Location } from "../syntax.js";
import { wellKnownToStringTag } from "../symbols.js";
import { createRandomState } from "../random.js";
import { roundToFloat16 } from "./math-f16.js";

function numericArgument(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    return toNumber(primitive.value, loc, context.realm);
}

function createMathObject(realm: Realm): GuestObject {
    const object = realm.createObject();
    const constants = [
        { name: "E", value: Math.E },
        { name: "LN10", value: Math.LN10 },
        { name: "LN2", value: Math.LN2 },
        { name: "LOG10E", value: Math.LOG10E },
        { name: "LOG2E", value: Math.LOG2E },
        { name: "PI", value: Math.PI },
        { name: "SQRT1_2", value: Math.SQRT1_2 },
        { name: "SQRT2", value: Math.SQRT2 },
    ];
    for (const constant of constants) {
        object.bootstrapDefine(constant.name, { value: { kind: "number", value: constant.value } });
    }
    object.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Math" },
        configurable: true,
    });
    return object;
}

export function registerMath(realm: Realm): void {
    const object = createMathObject(realm);
    for (const name of [
        "abs",
        "ceil",
        "floor",
        "round",
        "sign",
        "trunc",
        "clz32",
        "fround",
        "f16round",
        "acos",
        "asin",
        "atan",
        "cos",
        "sin",
        "tan",
        "acosh",
        "asinh",
        "atanh",
        "cosh",
        "sinh",
        "tanh",
        "exp",
        "expm1",
        "log",
        "log1p",
        "log2",
        "log10",
        "sqrt",
        "cbrt",
    ]) {
        realm.registerBuiltin(object, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const number = numericArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (number.type === "throw") {
                return number;
            }
            let value = number.value;
            switch (name) {
                case "abs":
                    value = Math.abs(value);
                    break;
                case "ceil":
                    value = Math.ceil(value);
                    break;
                case "floor":
                    value = Math.floor(value);
                    break;
                case "round":
                    value = Math.round(value);
                    break;
                case "sign":
                    value = Math.sign(value);
                    break;
                case "trunc":
                    value = Math.trunc(value);
                    break;
                case "clz32":
                    value = Math.clz32(value);
                    break;
                case "fround":
                    value = Math.fround(value);
                    break;
                case "f16round":
                    value = roundToFloat16(value);
                    break;
                case "acos":
                    value = Math.acos(value);
                    break;
                case "asin":
                    value = Math.asin(value);
                    break;
                case "atan":
                    value = Math.atan(value);
                    break;
                case "cos":
                    value = Math.cos(value);
                    break;
                case "sin":
                    value = Math.sin(value);
                    break;
                case "tan":
                    value = Math.tan(value);
                    break;
                case "acosh":
                    value = Math.acosh(value);
                    break;
                case "asinh":
                    value = Math.asinh(value);
                    break;
                case "atanh":
                    value = Math.atanh(value);
                    break;
                case "cosh":
                    value = Math.cosh(value);
                    break;
                case "sinh":
                    value = Math.sinh(value);
                    break;
                case "tanh":
                    value = Math.tanh(value);
                    break;
                case "exp":
                    value = Math.exp(value);
                    break;
                case "expm1":
                    value = Math.expm1(value);
                    break;
                case "log":
                    value = Math.log(value);
                    break;
                case "log1p":
                    value = Math.log1p(value);
                    break;
                case "log2":
                    value = Math.log2(value);
                    break;
                case "log10":
                    value = Math.log10(value);
                    break;
                case "sqrt":
                    value = Math.sqrt(value);
                    break;
                case "cbrt":
                    value = Math.cbrt(value);
                    break;
            }
            return normal({ kind: "number", value });
        });
    }
    for (const name of ["atan2", "pow", "imul"]) {
        realm.registerBuiltin(object, name, 2, (_receiver, args, context, loc): ValueCompletion => {
            const left = numericArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (left.type === "throw") {
                return left;
            }
            const right = numericArgument(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (right.type === "throw") {
                return right;
            }
            let value: number;
            if (name === "atan2") {
                value = Math.atan2(left.value, right.value);
            } else if (name === "pow") {
                value = Math.pow(left.value, right.value);
            } else {
                value = Math.imul(left.value, right.value);
            }
            return normal({ kind: "number", value });
        });
    }
    for (const name of ["min", "max"]) {
        realm.registerBuiltin(object, name, 2, (_receiver, args, context, loc): ValueCompletion => {
            const minimum = name === "min";
            let value = minimum ? Infinity : -Infinity;
            for (const arg of args) {
                const number = numericArgument(arg, context, loc);
                if (number.type === "throw") {
                    return number;
                }
                const next = number.value;
                // NaN is sticky, but later arguments must still be converted.
                if (next !== next) {
                    value = next;
                } else if (minimum ? next < value : next > value) {
                    value = next;
                } else if (next === 0 && value === 0 && (minimum ? 1 / next < 0 : 1 / next > 0)) {
                    value = next;
                }
            }
            return normal({ kind: "number", value });
        });
    }
    realm.registerBuiltin(object, "hypot", 2, (_receiver, args, context, loc): ValueCompletion => {
        const values: number[] = [];
        let largest = 0,
            hasNaN = false;
        for (const arg of args) {
            const number = numericArgument(arg, context, loc);
            if (number.type === "throw") {
                return number;
            }
            const value = Math.abs(number.value);
            values.push(value);
            if (value > largest) {
                largest = value;
            }
            if (value !== value) {
                hasNaN = true;
            }
        }
        if (largest === Infinity) {
            return normal({ kind: "number", value: Infinity });
        }
        if (hasNaN) {
            return normal({ kind: "number", value: NaN });
        }
        if (largest === 0) {
            return normal({ kind: "number", value: 0 });
        }
        // Scale before squaring, then compensate for rounding in the sum.
        let sum = 0,
            correction = 0;
        for (const value of values) {
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const scaled = value / largest;
            const term = scaled * scaled - correction;
            const next = sum + term;
            correction = next - sum - term;
            sum = next;
        }
        return normal({ kind: "number", value: largest * Math.sqrt(sum) });
    });
    realm.registerBuiltin(
        object,
        "random",
        0,
        (_receiver, _args, context, loc): ValueCompletion => {
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            let state = context.realm.randomState;
            if (state === null) {
                state = createRandomState();
                context.realm.randomState = state;
            }
            return normal({ kind: "number", value: state.next() });
        },
    );
    realm.defineScriptGlobal("Math", {
        value: { kind: "object", object },
        writable: true,
        configurable: true,
    });
}
