import type { Realm } from "../realm.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerURI(realm: Realm): void {
    for (const name of ["encodeURI", "encodeURIComponent", "decodeURI", "decodeURIComponent"]) {
        realm.registerBuiltin(realm.globalObject, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
            if (primitive.type === "throw") return primitive;
            const converted = toString(primitive.value, loc, context.realm);
            if (converted.type === "throw") return converted;
            const text = converted.value;
            // Bound the input before entering the host's indivisible codec.
            for (let i = 0; i < text.length; i++) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
            }
            try {
                const value = name === "encodeURI" ? encodeURI(text) : name === "encodeURIComponent" ? encodeURIComponent(text)
                    : name === "decodeURI" ? decodeURI(text) : decodeURIComponent(text);
                return normal({kind:"string",value});
            } catch (error) {
                if (error instanceof URIError) return languageFailure(context.realm, "URIError", "malformed URI sequence", loc);
                throw error;
            }
        });
    }
}
