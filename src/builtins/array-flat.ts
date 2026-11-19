import type { Realm } from "../realm.js";
import { GuestArray } from "../array-object.js";
import { toObject } from "../object-conversion.js";
import { lengthOfArrayLike } from "../array-like.js";
import { arraySpeciesCreate } from "../array-species.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToString, toIntegerOrInfinity } from "../conversion.js";
import type { Location } from "../syntax.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type OperationContext, type Value, type ValueCompletion } from "../runtime.js";

class FlattenFrame {
    index = 0;
    constructor(readonly source: GuestObject, readonly length: number, readonly depth: number) {}
}

function flatten(target: GuestObject, source: GuestObject, length: number, depth: number, mapper: Value, thisArg: Value, context: OperationContext, loc: Location): ValueCompletion {
    const frames: FlattenFrame[] = [new FlattenFrame(source, length, depth)];
    let nextIndex = 0;
    while (frames.length > 0) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const frame = frames[frames.length - 1];
        if (frame.index >= frame.length) { frames.pop(); continue; }
        const index = frame.index++;
        const key = numberToString(index);
        const present = frame.source.internalHasProperty(key, loc);
        if (present.type === "throw") return present;
        if (!present.value) continue;
        const input: Value = { kind: "object", object: frame.source };
        const read = frame.source.internalGet(key, input, context, loc);
        if (read.type === "throw") return read;
        let element = read.value;
        if (frames.length === 1 && mapper.kind !== "undefined") {
            const mapped = context.call(mapper, thisArg, [element, { kind: "number", value: index }, input], loc);
            if (mapped.type === "throw") return mapped;
            element = mapped.value;
        }
        if (frame.depth > 0 && element.kind === "object" && element.object instanceof GuestArray) {
            const nestedLength = lengthOfArrayLike(element.object, context, loc);
            if (nestedLength.type === "throw") return nestedLength;
            frames.push(new FlattenFrame(element.object, nestedLength.value, frame.depth - 1));
        } else {
            if (nextIndex >= 9007199254740991)
                return languageFailure(context.realm, "TypeError", "flattened array exceeds maximum index", loc);
            const defined = target.defineOwnProperty(numberToString(nextIndex++), { value: element, writable: true, enumerable: true, configurable: true }, context, loc);
            if (defined.type === "throw") return defined;
            if (!defined.value) return languageFailure(context.realm, "TypeError", "cannot define flattened result element", loc);
        }
    }
    return normal({ kind: "object", object: target });
}

export function registerArrayFlat(realm: Realm): void {
    realm.registerBuiltin(realm.arrayPrototype, "flat", 0, (receiver, args, context, loc): ValueCompletion => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(object.value, context, loc);
        if (length.type === "throw") return length;
        let depth = 1;
        if (args.length > 0 && args[0].kind !== "undefined") {
            const primitive = toPrimitive(args[0], "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
            if (integer.type === "throw") return integer;
            depth = Math.max(integer.value, 0);
        }
        const created = arraySpeciesCreate(object.value, 0, "flat", context, loc);
        if (created.type === "throw") return created;
        return flatten(created.value, object.value, length.value, depth, UNDEFINED, UNDEFINED, context, loc);
    });
    realm.registerBuiltin(realm.arrayPrototype, "flatMap", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const length = lengthOfArrayLike(object.value, context, loc);
        if (length.type === "throw") return length;
        const mapper = args.length === 0 ? UNDEFINED : args[0];
        if (mapper.kind !== "object" || mapper.object.callable === null)
            return languageFailure(context.realm, "TypeError", "flatMap callback is not callable", loc);
        const created = arraySpeciesCreate(object.value, 0, "flatMap", context, loc);
        if (created.type === "throw") return created;
        return flatten(created.value, object.value, length.value, 1, mapper, args.length < 2 ? UNDEFINED : args[1], context, loc);
    });
}
