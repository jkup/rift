import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { invoke } from "../invoke.js";
import { lengthOfArrayLike } from "../array-like.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, numberToString, type StringCompletion } from "../conversion.js";
import { stringConcat } from "../strings.js";
import { GuestArray } from "../array-object.js";
import { normal, UNDEFINED, type GuestObject, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function arrayArguments(callee: GuestObject, args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const prototype = getPrototypeFromConstructor(callee, "Array", context, loc);
    if (prototype.type === "throw") return prototype;
    const proto = prototype.value;
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    const array = new GuestArray(proto);
    const numericLength = args.length === 1 && args[0].kind === "number";
    const length: Value = numericLength ? args[0] : { kind: "number", value: args.length };
    const resized = array.defineOwnProperty("length", { value: length }, context, loc);
    if (resized.type === "throw") return resized;
    if (!resized.value) throw new Error("fresh array length definition failed");
    if (!numericLength) for (let i = 0; i < args.length; i++) {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        const defined = array.defineOwnProperty(numberToString(i), {
            value: args[i], writable: true, enumerable: true, configurable: true,
        }, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) throw new Error("fresh array element definition failed");
    }
    return normal({ kind: "object", object: array });
}

export function registerArray(realm: Realm): GuestObject {
    const constructor: GuestObject = realm.createBuiltinConstructor("Array", 1,
        (_receiver, args, context, loc) => arrayArguments(constructor, args, context, loc),
        (callee, args, context, loc) => arrayArguments(callee, args, context, loc));
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.arrayPrototype }, writable: false, enumerable: false, configurable: false });
    realm.registerBuiltin(constructor, "isArray", 1, (_receiver, args, _context, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "object" && value.object instanceof GuestArray });
    });
    realm.arrayPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("Array", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    return constructor;
}

function toElementString(value: Value, context: OperationContext, loc: Location): StringCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") return primitive;
    return toString(primitive.value, loc, context.realm);
}

function joinIndexedProperties(object: GuestObject, length: number, separator: string, methodName: string | null,
    context: OperationContext, loc: Location): ValueCompletion {
    let text = "";
    for (let k = 0; k < length; k++) {
        const iteration = context.tick(loc);
        if (iteration.type === "throw") return iteration;
        if (k > 0) text = stringConcat(text, separator);
        const element = object.internalGet(numberToString(k), { kind: "object", object }, context, loc);
        if (element.type === "throw") return element;
        if (element.value.kind === "null" || element.value.kind === "undefined") continue;
        let value: Value = element.value;
        if (methodName !== null) {
            const called = invoke(value, methodName, [], context, loc);
            if (called.type === "throw") return called;
            value = called.value;
        }
        const converted = toElementString(value, context, loc);
        if (converted.type === "throw") return converted;
        text = stringConcat(text, converted.value);
    }
    return normal({ kind: "string", value: text });
}

export function registerArrayConversions(realm: Realm, objectToString: Value): void {
    realm.registerBuiltin(realm.arrayPrototype, "join", 1, (receiver, args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        const separator = args.length === 0 ? UNDEFINED : args[0];
        let separatorText = ",";
        if (separator.kind !== "undefined") {
            const converted = toElementString(separator, context, loc);
            if (converted.type === "throw") return converted;
            separatorText = converted.value;
        }
        return joinIndexedProperties(boxed.value, length.value, separatorText, null, context, loc);
    });
    if (realm.profile === "script") realm.registerBuiltin(realm.arrayPrototype, "toLocaleString", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(boxed.value, context, loc);
        if (length.type === "throw") return length;
        return joinIndexedProperties(boxed.value, length.value, ",", "toLocaleString", context, loc);
    });
    realm.registerBuiltin(realm.arrayPrototype, "toString", 0, (receiver, _args, context, loc) => {
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const value: Value = { kind: "object", object: boxed.value };
        const join = boxed.value.internalGet("join", value, context, loc);
        if (join.type === "throw") return join;
        const method = join.value.kind === "object" && join.value.object.callable !== null
            ? join.value : objectToString;
        return context.call(method, value, [], loc);
    });
}
